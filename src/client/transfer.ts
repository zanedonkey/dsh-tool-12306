import { HttpClient } from './http.js';
import { decodeTransfer } from './validation.js';
import type { RawTransferResponse } from '../types.js';
export async function requestTransferPage(http: HttpClient, endpoint: URL, date: string, from: string, to: string, middle: string, cursor: number, signal?: AbortSignal): Promise<RawTransferResponse> {
  return decodeTransfer(await http.json(endpoint, new URLSearchParams({
    train_date: date, from_station_telecode: from, to_station_telecode: to, middle_station: middle,
    result_index: String(cursor), can_query: 'Y', isShowWZ: 'Y', purpose_codes: '00', channel: 'E',
  }), signal));
}
