import { describe, expect, it } from 'vitest';
import { addDays } from '../src/date.js';
import { matchesTrain, ticketQueryDates, validateFilters } from '../src/filters.js';
import { parseTickets } from '../src/parser/ticket.js';
import { midnightTickets } from './helpers.js';
import type { Train } from '../src/types.js';
const date = '2026-10-07';
const base = { date, from: '北京', to: '上海' };
const today = parseTickets(midnightTickets(), date);
const tomorrow = parseTickets(midnightTickets(), addDays(date, 1));
const night = today.find(train => train.trainCode === 'G9271')!;

describe('date-aware midnight windows', () => {
  it('preserves the actual arrival day of the reported G9271 example', () => {
    expect(night).toMatchObject({ departureDate: date, departureTime: '23:16', arrivalDate: '2026-10-08', arrivalTime: '00:29', durationMinutes: 73 });
    expect(matchesTrain(night, { ...base, arrivalAfter: '23:00', arrivalBefore: '02:00' })).toBe(true);
  });
  it('includes the evening and next morning, not the morning preceding the evening', () => {
    const args = { ...base, departureAfter: '23:00', departureBefore: '02:00' };
    expect(today.filter(train => matchesTrain(train, args)).map(train => train.trainCode)).toEqual(['G9271', 'G9006']);
    expect(tomorrow.filter(train => matchesTrain(train, args)).map(train => train.trainCode)).toEqual(['G9002', 'G9003', 'G9007']);
    expect(parseTickets(midnightTickets(), '2026-10-09').filter(train => matchesTrain(train, args))).toEqual([]);
    expect(ticketQueryDates(args)).toEqual(['2026-10-07', '2026-10-08']);
  });
  it.each([
    [{ departureAfter: '23:00' }, ['2026-10-07']],
    [{ departureBefore: '02:00' }, ['2026-10-07']],
    [{ departureAfter: '02:00', departureBefore: '02:00' }, ['2026-10-07']],
    [{ arrivalAfter: '23:00', arrivalBefore: '02:00' }, ['2026-10-07']],
  ])('does not expand boarding days for %j', (bounds, dates) => expect(ticketQueryDates({ ...base, ...bounds })).toEqual(dates));
  it('does not treat next-day arrival as an early same-day arrival', () => {
    expect(matchesTrain(night, { ...base, arrivalBefore: '02:00' })).toBe(false);
    expect(matchesTrain(night, { ...base, arrivalBefore: '2026-10-08T02:00' })).toBe(true);
    expect(matchesTrain(night, { ...base, arrivalAfter: '22:00' })).toBe(true);
    expect(matchesTrain(night, { ...base, arrivalAfter: '2026-10-08T00:30' })).toBe(false);
  });
  it('compares inclusive explicit date-time boundaries', () => {
    expect(matchesTrain(night, { ...base, arrivalAfter: '2026-10-08T00:29', arrivalBefore: '2026-10-08T00:29' })).toBe(true);
    expect(matchesTrain(night, { ...base, arrivalBefore: '2026-10-08T00:28' })).toBe(false);
    expect(matchesTrain(night, { ...base, arrivalAfter: '23:00', arrivalBefore: '2026-10-08T02:00' })).toBe(true);
  });
  it('distinguishes arrivals with the same clock time on different days', () => {
    const longer: Train = { ...night, arrivalDate: '2026-10-09', durationMinutes: night.durationMinutes + 1440 };
    const args = { ...base, arrivalAfter: '23:00', arrivalBefore: '02:00' };
    expect(matchesTrain(night, args)).toBe(true); expect(matchesTrain(longer, args)).toBe(false);
    expect(matchesTrain(longer, { ...base, arrivalAfter: '2026-10-09T00:00', arrivalBefore: '2026-10-09T01:00' })).toBe(true);
  });
  it('handles month and year boundaries', () => {
    for (const [start, end] of [['2026-10-31', '2026-11-01'], ['2026-12-31', '2027-01-01']]) {
      const train = parseTickets(midnightTickets(), start!)[0]!;
      const args = { ...base, date: start!, arrivalAfter: '23:00', arrivalBefore: '02:00', departureAfter: '23:00', departureBefore: '02:00' };
      expect(train.arrivalDate).toBe(end); expect(matchesTrain(train, args)).toBe(true);
      expect(ticketQueryDates(args)).toEqual([start, end]);
    }
  });
  it('uses leap-day calendar validation', () => {
    expect(() => validateFilters({ ...base, arrivalBefore: '2028-02-29T02:00' })).not.toThrow();
    expect(() => validateFilters({ ...base, arrivalBefore: '2027-02-29T02:00' })).toThrow('有效');
  });
  it.each(['2026-10-08T24:00', '2026-10-08T00:60', '2026-10-08T2:00', '2026-10-08T00:29Z', '2026-10-08 00:29'])('rejects malformed date-time %s', value => {
    expect(() => validateFilters({ ...base, arrivalBefore: value })).toThrow('HH:mm');
  });
  it('rejects reversed explicit dates instead of guessing another day', () => {
    expect(() => validateFilters({ ...base, arrivalAfter: '2026-10-09T00:00', arrivalBefore: '2026-10-08T02:00' })).toThrow('下限');
    expect(() => validateFilters({ ...base, arrivalAfter: '2026-10-08T23:00', arrivalBefore: '02:00' })).toThrow('下限');
  });
});
