import { expect, it } from 'vitest';
import { chinaToday, validateTravelDate } from '../src/date.js';
it('uses Shanghai midnight rather than host/UTC date', () => {
  const now = new Date('2026-10-06T16:01:00Z');
  expect(chinaToday(now)).toBe('2026-10-07');
  expect(() => validateTravelDate('2026-10-06', now)).toThrow();
  expect(() => validateTravelDate('2026-10-07', now)).not.toThrow();
});
it.each(['2026-02-30','2026-1-01','2025-12-01','bad'])('rejects invalid or past date %s', date => {
  expect(() => validateTravelDate(date, new Date('2026-10-06T00:00:00Z'))).toThrow();
});
