import { addDays, clockMinutes, validDate } from './date.js';
import { InvalidQueryError } from './errors.js';
import { SEAT_TYPES, TRAIN_TYPES } from './types.js';
import type { TicketQuery, Train, TransferQuery, TransferRoute } from './types.js';

interface TimeWindow { start: number; end: number; crossesMidnight: boolean }
// Compare China-local calendar dates on one numeric axis, independent of the host timezone.
function calendarMinutes(date: string, time: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 60000 + clockMinutes(time);
}
function boundMinutes(value: string, date: string, allowDate: boolean): number {
  if (allowDate && value.includes('T')) {
    const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
    if (!parts || !validDate(parts[1]!)) throw new InvalidQueryError('到达时间必须是 HH:mm 或有效的 YYYY-MM-DDTHH:mm（中国时区）。');
    return calendarMinutes(parts[1]!, parts[2]!);
  }
  return calendarMinutes(date, value);
}
function timeWindow(date: string, after: string | undefined, before: string | undefined, allowDate: boolean): TimeWindow {
  const start = after === undefined ? -Infinity : boundMinutes(after, date, allowDate);
  let end = before === undefined ? Infinity : boundMinutes(before, date, allowDate);
  const crossesMidnight = after !== undefined && before !== undefined && !after.includes('T') && !before.includes('T') && start > end;
  if (crossesMidnight) end += 1440;
  if (start > end) throw new InvalidQueryError('时间窗口下限不能晚于上限，请检查日期和时间。');
  return { start, end, crossesMidnight };
}
export function ticketQueryDates(args: TicketQuery): string[] {
  const window = timeWindow(args.date, args.departureAfter, args.departureBefore, false);
  if (!window.crossesMidnight) return [args.date];
  const next = addDays(args.date, 1);
  if (!validDate(next)) throw new InvalidQueryError('跨午夜窗口超出有效日期范围。');
  return [args.date, next];
}
export function resultLimit(maxResults: number | undefined, defaultLimit: number): number {
  const limit = maxResults ?? defaultLimit;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new InvalidQueryError('maxResults 必须是 1 到 100 的整数。');
  return limit;
}
export function validateFilters(args: TicketQuery | TransferQuery): void {
  if (args.trainTypes?.some(type => !TRAIN_TYPES.includes(type))) throw new InvalidQueryError('trainTypes 仅支持 G、D、C、Z、T、K。');
  if (args.seatType && !SEAT_TYPES.includes(args.seatType)) throw new InvalidQueryError('无法识别席别。');
  timeWindow(args.date, args.departureAfter, args.departureBefore, false);
  timeWindow(args.date, args.arrivalAfter, args.arrivalBefore, true);
}
export function validateTransferFilters(args: TransferQuery): void {
  validateFilters(args);
  for (const field of ['firstSeatType', 'secondSeatType'] as const) {
    if (args[field] !== undefined && !SEAT_TYPES.includes(args[field])) throw new InvalidQueryError(`${field} 无法识别席别。`);
  }
  if (args.sortBy !== undefined && args.sortBy !== 'duration' && args.sortBy !== 'price') throw new InvalidQueryError('sortBy 仅支持 duration 或 price。');
  if (args.maxSeatCombinations !== undefined && (!Number.isSafeInteger(args.maxSeatCombinations) || args.maxSeatCombinations < 1 || args.maxSeatCombinations > 20)) {
    throw new InvalidQueryError('maxSeatCombinations 必须是 1 到 20 的整数。');
  }
  for (const field of ['minTransferMinutes', 'maxTransferMinutes'] as const) {
    const value = args[field];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new InvalidQueryError(`${field} 必须是非负安全整数（分钟）。`);
  }
  if (args.minTransferMinutes !== undefined && args.maxTransferMinutes !== undefined && args.minTransferMinutes > args.maxTransferMinutes) {
    throw new InvalidQueryError('最短换乘时间不能大于最长换乘时间。');
  }
  if (args.sameStationOnly !== undefined && typeof args.sameStationOnly !== 'boolean') throw new InvalidQueryError('sameStationOnly 必须是布尔值。');
}
function matchesSeatsAndType(train: Train, args: TicketQuery | TransferQuery, seatType = args.seatType): boolean {
  if (args.trainTypes?.length && !args.trainTypes.some(type => train.trainCode.startsWith(type))) return false;
  if (args.onlyAvailable) {
    if (seatType ? train.seats[seatType].available !== true : !Object.values(train.seats).some(seat => seat.available === true)) return false;
  }
  return true;
}
function matchesTimes(first: Train, last: Train, args: TicketQuery | TransferQuery): boolean {
  const departure = timeWindow(args.date, args.departureAfter, args.departureBefore, false);
  const arrival = timeWindow(args.date, args.arrivalAfter, args.arrivalBefore, true);
  const leaves = calendarMinutes(first.departureDate, first.departureTime);
  const arrives = calendarMinutes(last.arrivalDate, last.arrivalTime);
  if (leaves < departure.start || leaves > departure.end) return false;
  if (arrives < arrival.start || arrives > arrival.end) return false;
  return true;
}
export function matchesTrain(train: Train, args: TicketQuery | TransferQuery): boolean {
  return matchesSeatsAndType(train, args) && matchesTimes(train, train, args);
}
export function matchesTransfer(route: TransferRoute, args: TransferQuery): boolean {
  if (args.sameStationOnly && !route.sameStation) return false;
  if (args.minTransferMinutes !== undefined && route.transferMinutes < args.minTransferMinutes) return false;
  if (args.maxTransferMinutes !== undefined && route.transferMinutes > args.maxTransferMinutes) return false;
  return matchesSeatsAndType(route.firstLeg, args, args.firstSeatType ?? args.seatType)
    && matchesSeatsAndType(route.secondLeg, args, args.secondSeatType ?? args.seatType)
    && matchesTimes(route.firstLeg, route.secondLeg, args);
}
