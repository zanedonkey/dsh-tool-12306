import { InvalidQueryError, InvalidTravelDateError } from './errors.js';

export function chinaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}
export function validateTravelDate(date: string, now = new Date()): void {
  if (!validDate(date) || date < chinaToday(now)) {
    throw new InvalidTravelDateError(`乘车日期必须是 YYYY-MM-DD，且不能早于中国当天 ${chinaToday(now)}。`);
  }
}
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function clockMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new InvalidQueryError(`时间必须是 HH:mm：${time}`);
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
