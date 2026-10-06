import { StationNotFoundError } from '../errors.js';
import { StationStore } from './store.js';
import type { Station } from './store.js';
export interface ResolvedStation { station: Station; isCity: boolean; candidates: Station[] }
export class StationResolver {
  constructor(readonly store: StationStore) {}
  resolve(input: string): ResolvedStation {
    const explicitStation = input.trim().endsWith('站');
    const text = input.trim().replace(/站$/, '');
    if (this.store.ambiguousNames.has(text)) {
      const matches = [...this.store.byCode.values()].filter(station => station.name === text);
      throw new StationNotFoundError(`车站 ${text} 存在多个匹配，请提供明确站代码：${matches.map(station => `${station.city}/${station.telecode}`).join('、')}`);
    }
    const city = explicitStation ? undefined : this.store.byCity.get(text);
    const station = this.store.byName.get(text) ?? this.store.byCode.get(text.toUpperCase());
    if (station) return { station, isCity: !!city, candidates: city ?? [station] };
    if (city?.length === 1 && city[0]) return { station: city[0], isCity: true, candidates: city };
    if (city?.length) {
      throw new StationNotFoundError(`城市 ${text} 没有同名代表站，请指定车站：${city.map(s => s.name).join('、')}`);
    }
    throw new StationNotFoundError(`无法识别车站：${input}`);
  }
}
