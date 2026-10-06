import { ParseError } from '../errors.js';
import { MISSING_STATIONS } from './missing-stations.js';
import { StationStore } from './store.js';
import type { Station } from './store.js';
export function stationScriptUrl(html: string): URL {
  const path = html.match(/["']([^"']*\/script\/core\/common\/station_name[^"']*\.js(?:\?[^"']*)?)["']/)?.[1];
  if (!path) throw new ParseError('12306 首页未提供车站数据地址。');
  const url = new URL(path, 'https://www.12306.cn/index/');
  if (url.origin !== 'https://www.12306.cn') throw new ParseError('12306 车站数据地址不符合预期。');
  return url;
}
export function parseStationScript(script: string): StationStore {
  const data = script.match(/\bstation_names\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!data) throw new ParseError('12306 车站数据格式已变化。');
  const stations: Station[] = [];
  for (const record of data.split('@').filter(Boolean)) {
    const fields = record.split('|');
    const name = fields[1]; const telecode = fields[2]; const pinyin = fields[3]; const city = fields[7];
    if (!name || !telecode || !/^[A-Z]{3}$/.test(telecode) || !pinyin || !city) {
      throw new ParseError('12306 车站记录缺少名称、城市或 telecode。');
    }
    stations.push({ name, telecode, city, pinyin });
  }
  for (const missing of MISSING_STATIONS) {
    if (!stations.some(station => station.telecode === missing.telecode)) stations.push({ ...missing });
  }
  return new StationStore(stations);
}
