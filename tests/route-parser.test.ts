import { describe, expect, it } from 'vitest';
import fixture from './fixtures/route.json' with { type: 'json' };
import { decodeRoute } from '../src/client/validation.js';
import { parseRoute } from '../src/parser/route.js';
describe('Route Parser (fixed synthetic fixtures)', () => {
  it('handles first/last terminal nulls and stop duration', () => {
    const stations = parseRoute(decodeRoute(fixture));
    expect(stations[0]?.arrivalTime).toBeNull(); expect(stations[0]?.stopMinutes).toBeNull();
    expect(stations[1]?.stopMinutes).toBe(2); expect(stations[2]?.departureTime).toBeNull();
  });
  it('sorts station sequence and handles a stop crossing midnight', () => {
    const raw = structuredClone(fixture); raw.data.data.reverse();
    raw.data.data[1]!.arrive_time = '23:58'; raw.data.data[1]!.start_time = '00:03';
    expect(parseRoute(decodeRoute(raw))[1]?.stopMinutes).toBe(5);
  });
  it('supports empty route arrays and rejects malformed station time', () => {
    expect(parseRoute(decodeRoute({ data: { data: [] } }))).toEqual([]);
    const raw = structuredClone(fixture); raw.data.data[1]!.start_time = '25:00';
    expect(() => parseRoute(decodeRoute(raw))).toThrow('经停时间格式');
  });
});

