import { clockMinutes } from '../date.js';
import { ParseError } from '../errors.js';
import type { RawRouteResponse, RouteStation } from '../types.js';
function nullableTime(value: string): string | null {
  if (value === '' || /^-+$/.test(value)) return null;
  try { clockMinutes(value); } catch (cause) { throw new ParseError('12306 经停时间格式已变化。', { cause }); }
  return value;
}
export function parseRoute(raw: RawRouteResponse): RouteStation[] {
  const rows = [...raw.data.data];
  if (rows.every(row => row.station_no && /^\d+$/.test(row.station_no))) {
    rows.sort((a, b) => Number(a.station_no) - Number(b.station_no));
  }
  return rows.map((row, index) => {
    if (!row.station_name) throw new ParseError('12306 经停站缺少名称。');
    const arrival = index === 0 ? null : nullableTime(row.arrive_time);
    const departure = index === rows.length - 1 ? null : nullableTime(row.start_time);
    return {
      stationName: row.station_name, arrivalTime: arrival, departureTime: departure,
      stopMinutes: arrival && departure ? (clockMinutes(departure) - clockMinutes(arrival) + 1440) % 1440 : null,
      arrivalDayOffset: row.arrive_day_diff && /^\d+$/.test(row.arrive_day_diff) ? Number(row.arrive_day_diff) : null,
    };
  });
}
