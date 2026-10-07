import { SEAT_TYPES } from './types.js';
import type { PricedTransferRoute, SeatType, Train, TransferQuery, TransferRoute, TransferSeatCombination } from './types.js';

function availableSeats(train: Train, preferred: SeatType | undefined): SeatType[] {
  return (preferred ? [preferred] : SEAT_TYPES).filter(type => train.seats[type].available === true);
}
function totalFare(first: number | null, second: number | null): number | null {
  if (first === null || second === null || !Number.isFinite(first) || !Number.isFinite(second) || first < 0 || second < 0) return null;
  // Work in fen so decimal yuan additions do not accumulate floating-point errors.
  const total = Math.round(first * 100) + Math.round(second * 100);
  return Number.isSafeInteger(total) ? total / 100 : null;
}
function comparePrices(first: number | null, second: number | null): number {
  if (first === null) return second === null ? 0 : 1;
  if (second === null) return -1;
  return first - second;
}
export function priceTransferRoute(route: TransferRoute, args: TransferQuery): PricedTransferRoute {
  const firstTypes = availableSeats(route.firstLeg, args.firstSeatType ?? args.seatType);
  const secondTypes = availableSeats(route.secondLeg, args.secondSeatType ?? args.seatType);
  // Twelve supported types per leg give at most 144 temporary combinations.
  const combinations: TransferSeatCombination[] = [];
  for (const firstSeatType of firstTypes) {
    for (const secondSeatType of secondTypes) {
      const firstPrice = route.firstLeg.seats[firstSeatType].price;
      const secondPrice = route.secondLeg.seats[secondSeatType].price;
      combinations.push({ firstSeatType, secondSeatType, firstPrice, secondPrice, totalPrice: totalFare(firstPrice, secondPrice) });
    }
  }
  combinations.sort((a, b) => comparePrices(a.totalPrice, b.totalPrice));
  const limit = args.maxSeatCombinations ?? 5;
  return { ...route, pricing: {
    currency: 'CNY', lowestKnownPrice: combinations[0]?.totalPrice ?? null,
    incomplete: combinations.length === 0 || combinations.some(combo => combo.totalPrice === null),
    combinationCount: combinations.length, combinations: combinations.slice(0, limit), truncated: combinations.length > limit,
  } };
}
export function compareTransferRoutes(first: PricedTransferRoute, second: PricedTransferRoute, sortBy: TransferQuery['sortBy']): number {
  const price = sortBy === 'price' ? comparePrices(first.pricing.lowestKnownPrice, second.pricing.lowestKnownPrice) : 0;
  return price || first.totalDurationMinutes - second.totalDurationMinutes;
}
