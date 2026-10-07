export const TRAIN_TYPES = ['G', 'D', 'C', 'Z', 'T', 'K'] as const;
export type TrainType = typeof TRAIN_TYPES[number];
export const SEAT_TYPES = ['business', 'specialClass', 'firstClass', 'secondClass', 'premiumSleeper', 'softSleeper', 'hardSleeper', 'softSeat', 'hardSeat', 'standing', 'movingSleeper', 'other'] as const;
export type SeatType = typeof SEAT_TYPES[number];
export type SeatStatus = 'available' | 'unavailable' | 'waitlist' | 'notOffered' | 'unknown';
export interface SeatInfo {
  available: boolean | null;
  count: number | null;
  price: number | null;
  status: SeatStatus;
}
export interface Train {
  trainCode: string;
  trainNo: string;
  fromStation: string;
  toStation: string;
  fromTelecode: string;
  toTelecode: string;
  departureDate: string;
  arrivalDate: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  seats: Record<SeatType, SeatInfo>;
}
export interface Query { date: string; from: string; to: string }
export interface TicketQuery extends Query {
  trainTypes?: TrainType[];
  /** HH:mm on date; after > before spans date evening through the next morning. */
  departureAfter?: string;
  departureBefore?: string;
  /** HH:mm anchored to date, or an explicit China-local YYYY-MM-DDTHH:mm. */
  arrivalAfter?: string;
  arrivalBefore?: string;
  onlyAvailable?: boolean;
  seatType?: SeatType;
  maxResults?: number;
}
export interface TransferQuery extends Query {
  transferStation?: string;
  trainTypes?: TrainType[];
  /** First-leg departure window, HH:mm on date; reversed bounds span midnight. */
  departureAfter?: string;
  departureBefore?: string;
  /** Final arrival window, HH:mm on date or an explicit China-local datetime. */
  arrivalAfter?: string;
  arrivalBefore?: string;
  /** Inclusive connection interval in minutes; omitted means no extra bound. */
  minTransferMinutes?: number;
  maxTransferMinutes?: number;
  sameStationOnly?: boolean;
  onlyAvailable?: boolean;
  seatType?: SeatType;
  /** Per-leg preferences override the common seatType for that leg. */
  firstSeatType?: SeatType;
  secondSeatType?: SeatType;
  sortBy?: 'duration' | 'price';
  /** Number of available seat combinations returned per route, 1–20; default 5. */
  maxSeatCombinations?: number;
  maxResults?: number;
}
export interface RouteQuery { trainCode: string; date?: string; from?: string; to?: string }
export interface TicketResult { query: Query; trains: Train[] }
export interface TransferRoute {
  totalDurationMinutes: number;
  transferStation: string;
  transferToStation: string;
  sameStation: boolean;
  transferMinutes: number;
  firstLeg: Train;
  secondLeg: Train;
}
export interface TransferSeatCombination {
  firstSeatType: SeatType;
  secondSeatType: SeatType;
  firstPrice: number | null;
  secondPrice: number | null;
  totalPrice: number | null;
}
export interface TransferPricing {
  currency: 'CNY';
  /** Lowest fully known fare among eligible, currently available combinations. */
  lowestKnownPrice: number | null;
  /** True when any eligible combination has an unknown total, or none exist. */
  incomplete: boolean;
  combinationCount: number;
  combinations: TransferSeatCombination[];
  /** Only the combination list is limited, independently of route pagination. */
  truncated: boolean;
}
export interface PricedTransferRoute extends TransferRoute { pricing: TransferPricing }
export interface TransferResult { query: Query; routes: PricedTransferRoute[]; truncated: boolean }
export interface RouteStation {
  stationName: string;
  arrivalTime: string | null;
  departureTime: string | null;
  stopMinutes: number | null;
  arrivalDayOffset: number | null;
}
export interface RouteResult { trainCode: string; date: string; stations: RouteStation[] }
export interface RawTicketResponse { status?: boolean; data: { result: string[]; map: Record<string, string> } }
export interface RawTransferLeg {
  train_no: string; station_train_code: string;
  from_station_name: string; to_station_name: string;
  from_station_telecode: string; to_station_telecode: string;
  start_time: string; arrive_time: string; lishi: string;
  swz_num?: string; tz_num?: string; zy_num?: string; ze_num?: string;
  gr_num?: string; rw_num?: string; yw_num?: string; rz_num?: string;
  yz_num?: string; wz_num?: string; srrb_num?: string; qt_num?: string;
  yp_info?: string;
}
export interface RawTransferRoute {
  fullList: RawTransferLeg[];
  train_date: string; middle_date: string;
  all_lishi_minutes: number; wait_time_minutes: number;
  middle_station_name: string; same_station: string;
}
export interface RawTransferResponse {
  status?: boolean;
  data: { middleList: RawTransferRoute[]; can_query: string; result_index: number } | string;
  errorMsg?: string;
}
export interface RawRouteStation {
  station_name: string; arrive_time: string; start_time: string;
  arrive_day_diff?: string; station_no?: string;
}
export interface RawRouteResponse { status?: boolean; data: { data: RawRouteStation[] } }
export interface RawTrainSearchResponse {
  status?: boolean;
  data: { train_no: string; station_train_code: string; from_station: string; to_station: string }[];
}
