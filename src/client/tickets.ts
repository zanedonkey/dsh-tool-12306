import { HttpClient } from './http.js';
import { decodeTickets } from './validation.js';
import type { RawTicketResponse } from '../types.js';
export async function requestTickets(http: HttpClient, endpoint: URL, date: string, from: string, to: string, signal?: AbortSignal): Promise<RawTicketResponse> {
  return decodeTickets(await http.json(endpoint, new URLSearchParams({
    'leftTicketDTO.train_date': date, 'leftTicketDTO.from_station': from,
    'leftTicketDTO.to_station': to, purpose_codes: 'ADULT',
  }), signal));
}
