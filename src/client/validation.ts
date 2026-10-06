import { ParseError } from '../errors.js';
import type { RawTicketResponse, RawTransferLeg, RawTransferResponse, RawRouteResponse, RawTrainSearchResponse } from '../types.js';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ParseError('12306 响应对象格式已变化。');
  return value as Record<string, unknown>;
}
export function string(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ParseError(`12306 响应缺少有效字段 ${field}。`);
  return value;
}
function optionalString(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : string(value, field);
}
export function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new ParseError(`12306 响应缺少数组 ${field}。`);
  return value;
}
export function nonnegative(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(n) || n < 0) throw new ParseError(`12306 响应缺少有效数字 ${field}。`);
  return n;
}
export function decodeTickets(value: unknown): RawTicketResponse {
  const data = record(record(value).data);
  const map: Record<string, string> = Object.create(null);
  for (const [key, val] of Object.entries(record(data.map))) map[key] = string(val, 'station name');
  return { data: { result: array(data.result, 'result').map(v => string(v, 'ticket row')), map } };
}
function decodeLeg(value: unknown): RawTransferLeg {
  const row = record(value);
  return {
    train_no: string(row.train_no, 'train_no'), station_train_code: string(row.station_train_code, 'station_train_code'),
    from_station_name: string(row.from_station_name, 'from_station_name'), to_station_name: string(row.to_station_name, 'to_station_name'),
    from_station_telecode: string(row.from_station_telecode, 'from_station_telecode'), to_station_telecode: string(row.to_station_telecode, 'to_station_telecode'),
    start_time: string(row.start_time, 'start_time'), arrive_time: string(row.arrive_time, 'arrive_time'), lishi: string(row.lishi, 'lishi'),
    swz_num: optionalString(row.swz_num, 'swz_num'), tz_num: optionalString(row.tz_num, 'tz_num'),
    zy_num: optionalString(row.zy_num, 'zy_num'), ze_num: optionalString(row.ze_num, 'ze_num'),
    gr_num: optionalString(row.gr_num, 'gr_num'), rw_num: optionalString(row.rw_num, 'rw_num'),
    yw_num: optionalString(row.yw_num, 'yw_num'), rz_num: optionalString(row.rz_num, 'rz_num'),
    yz_num: optionalString(row.yz_num, 'yz_num'), wz_num: optionalString(row.wz_num, 'wz_num'),
    srrb_num: optionalString(row.srrb_num, 'srrb_num'), qt_num: optionalString(row.qt_num, 'qt_num'),
    yp_info: optionalString(row.yp_info, 'yp_info'),
  };
}
export function decodeTransfer(value: unknown): RawTransferResponse {
  const root = record(value);
  if (typeof root.data === 'string') return { data: root.data, errorMsg: optionalString(root.errorMsg, 'errorMsg') };
  const data = record(root.data);
  return { data: {
    can_query: string(data.can_query, 'can_query'), result_index: nonnegative(data.result_index, 'result_index'),
    middleList: array(data.middleList, 'middleList').map(value => {
      const route = record(value);
      return {
        fullList: array(route.fullList, 'fullList').map(decodeLeg),
        train_date: string(route.train_date, 'train_date'), middle_date: string(route.middle_date, 'middle_date'),
        all_lishi_minutes: nonnegative(route.all_lishi_minutes, 'all_lishi_minutes'),
        wait_time_minutes: nonnegative(route.wait_time_minutes, 'wait_time_minutes'),
        middle_station_name: string(route.middle_station_name, 'middle_station_name'), same_station: string(route.same_station, 'same_station'),
      };
    }),
  } };
}
export function decodeRoute(value: unknown): RawRouteResponse {
  const data = record(record(value).data);
  return { data: { data: array(data.data, 'route stations').map(value => {
    const row = record(value);
    return {
      station_name: string(row.station_name, 'station_name'), arrive_time: string(row.arrive_time, 'arrive_time'),
      start_time: string(row.start_time, 'start_time'), arrive_day_diff: optionalString(row.arrive_day_diff, 'arrive_day_diff'),
      station_no: optionalString(row.station_no, 'station_no'),
    };
  }) } };
}
export function decodeTrainSearch(value: unknown): RawTrainSearchResponse {
  return { data: array(record(value).data, 'train search').map(value => {
    const row = record(value);
    return {
      train_no: string(row.train_no, 'train_no'), station_train_code: string(row.station_train_code, 'station_train_code'),
      from_station: string(row.from_station, 'from_station'), to_station: string(row.to_station, 'to_station'),
    };
  }) };
}
