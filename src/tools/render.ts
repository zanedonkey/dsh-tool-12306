import { SEAT_TYPES } from '../types.js';
import type { SeatType, TicketQuery, TicketResult, Train, TransferQuery, TransferResult } from '../types.js';
import { PLUGIN_VERSION } from '../version.js';

function compactTrain(train: Train, preferred?: SeatType) {
  return {
    trainCode: train.trainCode, fromStation: train.fromStation, toStation: train.toStation,
    departureDate: train.departureDate, departureTime: train.departureTime,
    arrivalDate: train.arrivalDate, arrivalTime: train.arrivalTime, durationMinutes: train.durationMinutes,
    seats: Object.fromEntries(SEAT_TYPES.filter(type => train.seats[type].available === true || type === preferred).map(type => [type, train.seats[type]])),
  };
}
const note = '仅展示明确有票或指定的席别；未展示不表示无票。完整席别状态请使用 outputMode=full。未知价格保持 null。';
export function renderTickets(args: TicketQuery, result: TicketResult) {
  const value = args.outputMode === 'compact' ? {
    pluginVersion: PLUGIN_VERSION, outputMode: 'compact', note, query: result.query,
    trains: result.trains.map(train => compactTrain(train, args.seatType)),
  } : result;
  return [{ type: 'text' as const, text: JSON.stringify(value) }];
}
export function renderTransfer(args: TransferQuery, result: TransferResult) {
  const value = args.outputMode === 'compact' ? {
    pluginVersion: PLUGIN_VERSION, outputMode: 'compact', note, query: result.query, truncated: result.truncated,
    routes: result.routes.map(route => ({
      totalDurationMinutes: route.totalDurationMinutes, transferStation: route.transferStation,
      transferToStation: route.transferToStation, sameStation: route.sameStation, transferMinutes: route.transferMinutes,
      firstLeg: compactTrain(route.firstLeg, args.firstSeatType ?? args.seatType),
      secondLeg: compactTrain(route.secondLeg, args.secondSeatType ?? args.seatType), pricing: route.pricing,
    })),
  } : result;
  return [{ type: 'text' as const, text: JSON.stringify(value) }];
}
