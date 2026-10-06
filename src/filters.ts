import { addDays, clockMinutes, validDate } from './date.js';
import { InvalidQueryError } from './errors.js';
import { SEAT_TYPES, TRAIN_TYPES } from './types.js';
import type { TicketQuery, Train, TransferQuery } from './types.js';

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
  const timeArgs = args as TicketQuery;
  timeWindow(args.date, timeArgs.departureAfter, timeArgs.departureBefore, false);
  timeWindow(args.date, timeArgs.arrivalAfter, timeArgs.arrivalBefore, true);
}
export function matchesTrain(train: Train, args: TicketQuery | TransferQuery): boolean {
  if (args.trainTypes?.length && !args.trainTypes.some(type => train.trainCode.startsWith(type))) return false;
  if (args.onlyAvailable) {
    if (args.seatType ? train.seats[args.seatType].available !== true : !Object.values(train.seats).some(seat => seat.available === true)) return false;
  }
  const timeArgs = args as TicketQuery;
  const departure = timeWindow(args.date, timeArgs.departureAfter, timeArgs.departureBefore, false);
  const arrival = timeWindow(args.date, timeArgs.arrivalAfter, timeArgs.arrivalBefore, true);
  const leaves = calendarMinutes(train.departureDate, train.departureTime);
  const arrives = calendarMinutes(train.arrivalDate, train.arrivalTime);
  if (leaves < departure.start || leaves > departure.end) return false;
  if (arrives < arrival.start || arrives > arrival.end) return false;
  return true;
}
