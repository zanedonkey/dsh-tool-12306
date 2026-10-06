import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import tickets from './fixtures/tickets.json' with { type: 'json' };
import transfer from './fixtures/transfer.json' with { type: 'json' };
import route from './fixtures/route.json' with { type: 'json' };
import type { RawTicketResponse } from '../src/types.js';
// Synthetic schedules, including the user's G9271 midnight example; not a live timetable.
export function midnightTickets(): RawTicketResponse {
  const raw = structuredClone(tickets);
  raw.data.result = [
    ['G9271', '23:16', '00:29', '01:13'],
    ['G9002', '00:40', '01:20', '00:40'],
    ['G9003', '02:00', '02:40', '00:40'],
    ['G9004', '22:59', '23:39', '00:40'],
    ['G9005', '02:01', '02:41', '00:40'],
    ['G9006', '23:00', '23:40', '00:40'],
    ['G9007', '00:00', '00:40', '00:40'],
  ].map(([code, departure, arrival, duration]) => {
    const fields = tickets.data.result[0]!.split('|');
    fields[2] = `test-${code}`; fields[3] = code!;
    fields[8] = departure!; fields[9] = arrival!; fields[10] = duration!;
    return fields.join('|');
  });
  return raw;
}
export function midnightFetch() {
  const original = fixtureFetch();
  return vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.startsWith('/otn/leftTicket/query')) return new Response(JSON.stringify(midnightTickets()));
    return original(input, init);
  });
}
export function fixtureFetch() {
  const stations = readFileSync(new URL('./fixtures/stations.js.txt', import.meta.url), 'utf8');
  return vi.fn<typeof fetch>().mockImplementation(async input => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const respond = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/index/') return new Response('<script src="../script/core/common/station_name_v1.js"></script>');
    if (url.pathname.endsWith('station_name_v1.js')) return new Response(stations);
    if (url.pathname === '/otn/leftTicket/init') return new Response("var CLeftTicketUrl = 'leftTicket/queryG';", { headers: { 'Set-Cookie': 'anonymous=test; Path=/' } });
    if (url.pathname === '/otn/lcQuery/init') return new Response("var lc_search_url = '/lcquery/queryG';", { headers: { 'Set-Cookie': 'anonymous=test; Path=/' } });
    if (url.pathname.startsWith('/otn/leftTicket/query')) {
      if (url.searchParams.get('leftTicketDTO.from_station') === 'AOH') {
        const raw: RawTicketResponse = structuredClone(tickets);
        raw.data.map = { AOH: '上海虹桥', HGH: '杭州东' };
        const replacements: Record<number, string> = { 6: 'AOH', 7: 'HGH', 8: '14:05', 9: '15:05', 10: '01:00' };
        raw.data.result = [raw.data.result[0]!.split('|').map((field, index) => replacements[index] ?? field).join('|')];
        return respond(raw);
      }
      return respond(tickets);
    }
    if (url.pathname.startsWith('/lcquery/query')) return respond(transfer);
    if (url.pathname === '/search/v1/train/search') return respond({ data: [
      { station_train_code: 'G10', train_no: 'test-G10', from_station: '上海虹桥', to_station: '北京南' },
      { station_train_code: 'G1', train_no: 'test-G1', from_station: '北京南', to_station: '上海虹桥' },
    ] });
    if (url.pathname === '/otn/queryTrainInfo/query') return respond(route);
    throw new Error(`Unexpected offline URL: ${url.origin}${url.pathname}`);
  });
}

