import { describe, expect, it } from 'vitest';
import fixture from './fixtures/tickets.json' with { type: 'json' };
import { decodeTickets } from '../src/client/validation.js';
import { parseTickets } from '../src/parser/ticket.js';
import { matchesTrain, validateFilters, resultLimit } from '../src/filters.js';
const trains = parseTickets(decodeTickets(fixture), '2026-10-07');
const base = { date: '2026-10-07', from: '北京', to: '上海' };
describe('query filters', () => {
  it('separates G and C and supports specific-seat availability', () => {
    expect(trains.filter(t => matchesTrain(t, { ...base, trainTypes: ['G'] })).map(t => t.trainCode)).toEqual(['G1']);
    expect(trains.filter(t => matchesTrain(t, { ...base, trainTypes: ['C'] })).map(t => t.trainCode)).toEqual(['C2']);
    expect(trains.filter(t => matchesTrain(t, { ...base, onlyAvailable: true, seatType: 'secondClass' })).map(t => t.trainCode)).toEqual(['G1']);
  });
  it('filters full HH:mm including arrival times', () => {
    expect(trains.filter(t => matchesTrain(t, { ...base, departureAfter: '14:05', departureBefore: '14:05' })).map(t => t.trainCode)).toEqual(['C2']);
    expect(trains.filter(t => matchesTrain(t, { ...base, arrivalAfter: '2026-10-08T00:00', arrivalBefore: '2026-10-08T02:00' })).map(t => t.trainCode)).toEqual(['D9']);
  });
  it('validates bounds and integer limits while accepting overnight windows', () => {
    expect(resultLimit(undefined, 20)).toBe(20);
    expect(() => resultLimit(0, 20)).toThrow(); expect(() => resultLimit(1.5, 20)).toThrow();
    expect(() => validateFilters({ ...base, departureAfter: '23:00', departureBefore: '02:00' })).not.toThrow();
    expect(() => validateFilters({ ...base, arrivalAfter: '24:00' })).toThrow('HH:mm');
    expect(() => validateFilters({ ...base, arrivalAfter: '' })).toThrow('HH:mm');
  });
});

