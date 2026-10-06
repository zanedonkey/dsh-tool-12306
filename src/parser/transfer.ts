import { ParseError, Upstream12306Error } from '../errors.js';
import { validDate, clockMinutes } from '../date.js';
import type { RawTransferResponse, TransferRoute } from '../types.js';
import { parseLeg } from './ticket.js';
function normalizeDate(value: string): string {
  const date = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;
  if (!validDate(date)) throw new ParseError('12306 中转日期格式已变化。');
  return date;
}
export function parseTransfer(raw: RawTransferResponse): TransferRoute[] {
  if (typeof raw.data === 'string') throw new Upstream12306Error('12306 未返回中转方案，请检查查询条件或稍后重试。');
  return raw.data.middleList.map(route => {
    const first = route.fullList[0]; const second = route.fullList[1];
    if (route.fullList.length !== 2 || !first || !second) throw new ParseError('12306 中转方案不是有效的两程线路。');
    const firstLeg = parseLeg(first, normalizeDate(route.train_date));
    const secondLeg = parseLeg(second, normalizeDate(route.middle_date));
    const gap = (Date.parse(`${secondLeg.departureDate}T00:00:00Z`) - Date.parse(`${firstLeg.arrivalDate}T00:00:00Z`)) / 60000
      + clockMinutes(secondLeg.departureTime) - clockMinutes(firstLeg.arrivalTime);
    if (gap < 0 || route.wait_time_minutes !== gap
      || route.all_lishi_minutes !== firstLeg.durationMinutes + gap + secondLeg.durationMinutes) {
      throw new ParseError('12306 中转等待时间或总历时不一致。');
    }
    return {
      totalDurationMinutes: route.all_lishi_minutes, transferStation: firstLeg.toStation,
      transferToStation: secondLeg.fromStation, sameStation: firstLeg.toTelecode === secondLeg.fromTelecode,
      transferMinutes: gap, firstLeg, secondLeg,
    };
  });
}
