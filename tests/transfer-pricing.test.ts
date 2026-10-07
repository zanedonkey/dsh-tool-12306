import { describe, expect, it } from 'vitest';
import { parseTransfer } from '../src/parser/transfer.js';
import { parseSeat, parsePrices } from '../src/parser/ticket.js';
import { decodeTransfer } from '../src/client/validation.js';
import { priceTransferRoute } from '../src/transfer-pricing.js';
import { SEAT_TYPES } from '../src/types.js';
import type { SeatType, TransferRoute } from '../src/types.js';
import fixture from './fixtures/transfer.json' with { type: 'json' };
const query = { date: '2026-10-07', from: '深圳', to: '拉萨' };
function route(first: Partial<Record<SeatType, number | null>>, second: Partial<Record<SeatType, number | null>>): TransferRoute {
  const value = parseTransfer(decodeTransfer(fixture))[0]!;
  for (const [train, offers] of [[value.firstLeg, first], [value.secondLeg, second]] as const) {
    for (const type of SEAT_TYPES) train.seats[type] = parseSeat(Object.hasOwn(offers, type) ? '有' : '--', offers[type] ?? null);
  }
  return value;
}

describe('available transfer seat combinations and trustworthy totals', () => {
  it('recommends mixed seat types with known totals first and preserves unknown fares', () => {
    const value = route({ secondClass: 40, firstClass: 80 }, { hardSleeper: 70, hardSeat: 20, softSleeper: null });
    const result = priceTransferRoute(value, query);
    expect(result.pricing).toMatchObject({ currency: 'CNY', lowestKnownPrice: 60, incomplete: true, combinationCount: 6, truncated: true });
    expect(result.pricing.combinations.map(combo => combo.totalPrice)).toEqual([60, 100, 110, 150, null]);
    expect(result.pricing.combinations[0]).toEqual({ firstSeatType: 'secondClass', secondSeatType: 'hardSeat', firstPrice: 40, secondPrice: 20, totalPrice: 60 });
    expect(result.firstLeg).toBe(value.firstLeg); expect(result.secondLeg).toBe(value.secondLeg);
  });
  it('applies per-leg preferences and common-seat fallback independently', () => {
    const value = route({ secondClass: 40, firstClass: 80 }, { hardSleeper: 70, firstClass: 100 });
    expect(priceTransferRoute(value, { ...query, seatType: 'firstClass', firstSeatType: 'secondClass', secondSeatType: 'hardSleeper' }).pricing)
      .toMatchObject({ lowestKnownPrice: 110, combinationCount: 1, incomplete: false, combinations: [{ firstSeatType: 'secondClass', secondSeatType: 'hardSleeper' }] });
    expect(priceTransferRoute(value, { ...query, seatType: 'firstClass', secondSeatType: 'hardSleeper' }).pricing.lowestKnownPrice).toBe(150);
    expect(priceTransferRoute(value, { ...query, seatType: 'firstClass', firstSeatType: 'secondClass' }).pricing.lowestKnownPrice).toBe(140);
  });
  it('excludes sold-out, waitlist and unknown-availability seats even when their price is lower', () => {
    const value = route({ secondClass: 40 }, { hardSleeper: 70 });
    value.firstLeg.seats.hardSeat = parseSeat('无', 1);
    value.firstLeg.seats.firstClass = parseSeat('候补', 2);
    value.secondLeg.seats.hardSeat = parseSeat('未知', 3);
    expect(priceTransferRoute(value, query).pricing).toMatchObject({ lowestKnownPrice: 110, combinationCount: 1, incomplete: false });
    expect(priceTransferRoute(value, { ...query, firstSeatType: 'hardSeat' }).pricing).toEqual({ currency: 'CNY', lowestKnownPrice: null, incomplete: true, combinationCount: 0, combinations: [], truncated: false });
  });
  it('reports missing fares beyond the displayed combination limit', () => {
    const value = route({ secondClass: 40 }, { hardSeat: 20, softSleeper: null });
    expect(priceTransferRoute(value, { ...query, maxSeatCombinations: 1 }).pricing).toMatchObject({
      lowestKnownPrice: 60, incomplete: true, combinationCount: 2, truncated: true, combinations: [{ totalPrice: 60 }],
    });
  });
  it('keeps an entirely unknown total null instead of using the one known leg or zero', () => {
    const value = route({ secondClass: 40 }, { hardSleeper: null });
    expect(priceTransferRoute(value, query).pricing).toEqual({ currency: 'CNY', lowestKnownPrice: null, incomplete: true,
      combinationCount: 1, truncated: false, combinations: [{ firstSeatType: 'secondClass', secondSeatType: 'hardSleeper', firstPrice: 40, secondPrice: null, totalPrice: null }] });
  });
  it('adds decimal yuan through integer fen and preserves an explicitly known zero fare', () => {
    expect(priceTransferRoute(route({ secondClass: 0.1 }, { hardSeat: 0.2 }), query).pricing.lowestKnownPrice).toBe(0.3);
    expect(priceTransferRoute(route({ secondClass: 0 }, { hardSeat: 0 }), query).pricing.lowestKnownPrice).toBe(0);
  });
  it('does not turn conflicting sleeper berth prices into a guessed cheapest fare', () => {
    const price = parsePrices('30010000013001200001').hardSleeper ?? null;
    expect(price).toBeNull();
    expect(priceTransferRoute(route({ secondClass: 40 }, { hardSleeper: price }), query).pricing.lowestKnownPrice).toBeNull();
  });
  it('bounds returned combinations even when every supported type is available', () => {
    const offers = Object.fromEntries(SEAT_TYPES.map((type, index) => [type, index + 1]));
    const result = priceTransferRoute(route(offers, offers), { ...query, maxSeatCombinations: 20 });
    expect(result.pricing.combinationCount).toBe(144); expect(result.pricing.combinations).toHaveLength(20);
    expect(result.pricing).toMatchObject({ lowestKnownPrice: 2, incomplete: false, truncated: true });
  });
});
