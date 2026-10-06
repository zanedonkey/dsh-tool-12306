export interface Station { name: string; telecode: string; city: string; pinyin: string }
export class StationStore {
  readonly byCode = new Map<string, Station>();
  readonly byName = new Map<string, Station>();
  readonly byCity = new Map<string, Station[]>();
  readonly ambiguousNames = new Set<string>();
  constructor(stations: readonly Station[]) {
    for (const station of stations) {
      this.byCode.set(station.telecode, station);
      const previous = this.byName.get(station.name);
      if (previous && previous.telecode !== station.telecode) this.ambiguousNames.add(station.name);
      this.byName.set(station.name, station);
      const city = this.byCity.get(station.city) ?? [];
      city.push(station);
      this.byCity.set(station.city, city);
    }
  }
}
