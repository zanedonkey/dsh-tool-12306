// Field positions and packed price format adapted from Joooook/12306-mcp (MIT).
// Copyright (c) 2025 Jok. See THIRD_PARTY_NOTICES.md.
import { addDays, clockMinutes, validDate } from '../date.js';
import { ParseError } from '../errors.js';
import type { RawTicketResponse, RawTransferLeg, SeatInfo, SeatType, Train } from '../types.js';

export function durationMinutes(value: string): number {
  const match = /^(\d+):([0-5]\d)$/.exec(value);
  if (!match) throw new ParseError(`12306 历时格式已变化：${value}`);
  const total = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isSafeInteger(total)) throw new ParseError('12306 历时超出有效范围。');
  return total;
}
export function parseSeat(raw: string | undefined, price: number | null = null): SeatInfo {
  if (raw === '' || raw === '--') return { available: false, count: null, price, status: 'notOffered' };
  if (raw === '候补') return { available: false, count: 0, price, status: 'waitlist' };
  if (raw === '无') return { available: false, count: 0, price, status: 'unavailable' };
  if (raw === '有' || raw === '充足') return { available: true, count: null, price, status: 'available' };
  if (raw && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))) {
    const count = Number(raw);
    return { available: count > 0, count, price, status: count > 0 ? 'available' : 'unavailable' };
  }
  return { available: null, count: null, price, status: 'unknown' };
}
const priceCodes: Readonly<Record<string, SeatType>> = {
  '9': 'business', P: 'specialClass', M: 'firstClass', D: 'firstClass', O: 'secondClass', S: 'secondClass',
  '6': 'premiumSleeper', A: 'premiumSleeper', '4': 'softSleeper', I: 'softSleeper', F: 'softSleeper',
  '3': 'hardSleeper', J: 'hardSleeper', '2': 'softSeat', '1': 'hardSeat', W: 'standing', H: 'other',
};
export function parsePrices(value: string | undefined): Partial<Record<SeatType, number | null>> {
  const result: Partial<Record<SeatType, number | null>> = {};
  if (!value || !/^(?:[A-Z0-9]\d{9})+$/.test(value)) return result;
  for (let offset = 0; offset < value.length; offset += 10) {
    const chunk = value.slice(offset, offset + 10);
    const key = Number(chunk.slice(6)) >= 3000 ? 'standing' : priceCodes[chunk[0] ?? ''];
    if (!key) continue;
    const price = Number(chunk.slice(1, 6)) / 10;
    // Multiple berth/product prices cannot be represented by one trustworthy price.
    if (Object.hasOwn(result, key) && result[key] !== price) result[key] = null;
    else result[key] = price;
  }
  return result;
}
export function parseSeats(raw: RawTransferLeg): Record<SeatType, SeatInfo> {
  const prices = parsePrices(raw.yp_info);
  const seat = (value: string | undefined, key: SeatType) => parseSeat(value, prices[key] ?? null);
  return {
    business: seat(raw.swz_num, 'business'), specialClass: seat(raw.tz_num, 'specialClass'),
    firstClass: seat(raw.zy_num, 'firstClass'), secondClass: seat(raw.ze_num, 'secondClass'),
    premiumSleeper: seat(raw.gr_num, 'premiumSleeper'), softSleeper: seat(raw.rw_num, 'softSleeper'),
    hardSleeper: seat(raw.yw_num, 'hardSleeper'), softSeat: seat(raw.rz_num, 'softSeat'), hardSeat: seat(raw.yz_num, 'hardSeat'),
    standing: seat(raw.wz_num, 'standing'), movingSleeper: seat(raw.srrb_num, 'movingSleeper'), other: seat(raw.qt_num, 'other'),
  };
}
export function parseLeg(raw: RawTransferLeg, date: string): Train {
  if (!validDate(date) || !raw.station_train_code || !raw.train_no || !raw.from_station_name || !raw.to_station_name
    || !/^[A-Z]{3}$/.test(raw.from_station_telecode) || !/^[A-Z]{3}$/.test(raw.to_station_telecode)) {
    throw new ParseError('12306 列车记录缺少车次、日期或车站。');
  }
  let departure: number;
  try { departure = clockMinutes(raw.start_time); clockMinutes(raw.arrive_time); }
  catch (cause) { throw new ParseError('12306 列车时间格式已变化。', { cause }); }
  const duration = durationMinutes(raw.lishi);
  if ((departure + duration) % 1440 !== clockMinutes(raw.arrive_time)) throw new ParseError('12306 到达时间与列车历时不一致。');
  return {
    trainCode: raw.station_train_code, trainNo: raw.train_no,
    fromStation: raw.from_station_name, toStation: raw.to_station_name,
    fromTelecode: raw.from_station_telecode, toTelecode: raw.to_station_telecode,
    departureDate: date, arrivalDate: addDays(date, Math.floor((departure + duration) / 1440)),
    departureTime: raw.start_time, arrivalTime: raw.arrive_time, durationMinutes: duration,
    seats: parseSeats(raw),
  };
}
export function parseTickets(raw: RawTicketResponse, date: string): Train[] {
  return raw.data.result.map(row => {
    const f = row.split('|');
    if (f.length < 34) throw new ParseError('12306 余票记录字段不足。');
    const fromCode = f[6] ?? ''; const toCode = f[7] ?? '';
    return parseLeg({
      train_no: f[2] ?? '', station_train_code: f[3] ?? '',
      from_station_name: raw.data.map[fromCode] ?? '', to_station_name: raw.data.map[toCode] ?? '',
      from_station_telecode: fromCode, to_station_telecode: toCode,
      start_time: f[8] ?? '', arrive_time: f[9] ?? '', lishi: f[10] ?? '',
      gr_num: f[21], qt_num: f[22], rw_num: f[23], rz_num: f[24], tz_num: f[25],
      wz_num: f[26], yw_num: f[28], yz_num: f[29], ze_num: f[30], zy_num: f[31], swz_num: f[32], srrb_num: f[33],
      yp_info: f[39],
    }, date);
  });
}
