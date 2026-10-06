import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseStationScript, stationScriptUrl } from '../src/stations/loader.js';
import { StationResolver } from '../src/stations/resolver.js';
import { StationStore } from '../src/stations/store.js';
const fixture = readFileSync(new URL('./fixtures/stations.js.txt', import.meta.url), 'utf8');
describe('Station Resolver', () => {
  const resolver = new StationResolver(parseStationScript(fixture));
  it.each([['北京','BJP'],['北京南','VNP'],['上海','SHH'],['上海虹桥','AOH'],['广州南','IZQ'],['深圳北','IOQ']])('resolves %s to %s', (name, code) => {
    expect(resolver.resolve(name).station.telecode).toBe(code);
  });
  it('distinguishes city and explicit station and indexes all stations', () => {
    expect(resolver.resolve('北京').candidates).toHaveLength(3);
    expect(resolver.resolve('北京').isCity).toBe(true);
    expect(resolver.resolve(' 北京站 ').isCity).toBe(false);
    expect(resolver.resolve('vnp').station.name).toBe('北京南');
  });
  it('rejects unknown stations', () => expect(() => resolver.resolve('北京西南')).toThrow('无法识别车站：北京西南'));
  it('does not guess between ambiguous cities or duplicate station names', () => {
    const ambiguousCity = new StationResolver(new StationStore([
      { name: '甲东', city: '甲', telecode: 'AAA', pinyin: 'jiadong' },
      { name: '甲西', city: '甲', telecode: 'BBB', pinyin: 'jiaxi' },
    ]));
    expect(() => ambiguousCity.resolve('甲')).toThrow('请指定车站');
    const ambiguousStation = new StationResolver(new StationStore([
      { name: '同名', city: '甲', telecode: 'AAA', pinyin: 'tongming' },
      { name: '同名', city: '乙', telecode: 'BBB', pinyin: 'tongming' },
    ]));
    expect(() => ambiguousStation.resolve('同名')).toThrow('存在多个匹配');
    expect(ambiguousStation.resolve('AAA').station.city).toBe('甲');
  });
  it('uses a single city candidate', () => expect(resolver.resolve('杭州').station.telecode).toBe('HGH'));
  it('discovers official script URL and rejects untrusted URLs', () => {
    expect(stationScriptUrl('<script src="../script/core/common/station_name_v1.js"></script>').href).toBe('https://www.12306.cn/script/core/common/station_name_v1.js');
    expect(() => stationScriptUrl('<script src="https://evil.invalid/script/core/common/station_name.js">')).toThrow();
  });
  it('does not evaluate station JavaScript and rejects changed records', () => {
    expect(() => parseStationScript('throw new Error("exec")')).toThrow('车站数据格式');
    expect(() => parseStationScript("var station_names='@x|北京|BAD';")).toThrow('车站记录');
  });
});
