import { describe, expect, it } from 'vitest';
import fixture from './fixtures/transfer.json' with { type: 'json' };
import { decodeTransfer } from '../src/client/validation.js';
import { parseTransfer } from '../src/parser/transfer.js';
describe('Transfer Parser (fixed synthetic fixtures)', () => {
  it('parses two legs, an overnight connection and cross-station transfer', () => {
    const [route] = parseTransfer(decodeTransfer(fixture));
    expect(route?.totalDurationMinutes).toBe(1790); expect(route?.transferMinutes).toBe(180);
    expect(route?.transferStation).toBe('西安北'); expect(route?.transferToStation).toBe('西安');
    expect(route?.sameStation).toBe(false); expect(route?.secondLeg.departureDate).toBe('2026-10-08');
    expect(route?.firstLeg.seats.secondClass.price).toBeNull();
  });
  it('rejects inconsistent transfer timing', () => {
    const raw = structuredClone(fixture); raw.data.middleList[0]!.wait_time_minutes = 1;
    expect(() => parseTransfer(decodeTransfer(raw))).toThrow('不一致');
  });
  it('rejects malformed leg lists and upstream errors', () => {
    const raw = structuredClone(fixture); raw.data.middleList[0]!.fullList.pop();
    expect(() => parseTransfer(decodeTransfer(raw))).toThrow('两程线路');
    expect(() => parseTransfer(decodeTransfer({ data: '', errorMsg: 'invalid' }))).toThrow('未返回中转方案');
  });
});

