import { afterEach, describe, expect, it, vi } from 'vitest';
import { RailwayClient } from '../src/client/index.js';
import type { RawTransferResponse, RawTransferRoute, TransferQuery } from '../src/types.js';
import { fixtureFetch } from './helpers.js';
import transfer from './fixtures/transfer.json' with { type: 'json' };

const base = { date: '2026-10-07', from: '深圳', to: '拉萨' };
const clients: RailwayClient[] = [];
afterEach(() => { for (const client of clients.splice(0)) client.dispose(); });
function setup(page: (url: URL) => RawTransferResponse = () => transfer, maxTransferPages = 3) {
  const original = fixtureFetch();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.startsWith('/lcquery/query')) return new Response(JSON.stringify(page(url)));
    return original(input, init);
  });
  const client = new RailwayClient({ requestIntervalMs: 100, maxRetries: 0, maxTransferPages }, fetcher, () => new Date('2026-10-06T00:00:00Z'));
  clients.push(client);
  const requests = () => fetcher.mock.calls.map(call => new URL(String(call[0]))).filter(url => url.pathname.startsWith('/lcquery/query'));
  return { client, fetcher, requests };
}
function page(routes: RawTransferRoute[], more = false, cursor = 1): RawTransferResponse {
  return { status: true, data: { middleList: routes, can_query: more ? 'Y' : 'N', result_index: cursor } };
}
// Synthetic, internally consistent schedules; never a real timetable.
function schedule(date: string, departure: string, id: string, wait = 60, sameStation = true, secondDuration = 60): RawTransferRoute {
  const raw = structuredClone(transfer.data.middleList[0]!);
  const first = raw.fullList[0]!; const second = raw.fullList[1]!;
  const start = Date.parse(`${date}T${departure}:00Z`);
  const at = (minutes: number) => new Date(start + minutes * 60000).toISOString();
  const duration = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  raw.train_date = date; raw.middle_date = at(60 + wait).slice(0, 10);
  raw.wait_time_minutes = wait; raw.all_lishi_minutes = 60 + wait + secondDuration;
  first.train_no = `test-first-${id}`; first.station_train_code = `G${id}`;
  first.start_time = departure; first.arrive_time = at(60).slice(11, 16); first.lishi = '01:00';
  second.train_no = `test-second-${id}`; second.station_train_code = `G${id}0`;
  second.start_time = at(60 + wait).slice(11, 16); second.arrive_time = at(raw.all_lishi_minutes).slice(11, 16); second.lishi = duration(secondDuration);
  if (sameStation) { second.from_station_telecode = first.to_station_telecode; second.from_station_name = first.to_station_name; }
  return raw;
}
function packedPrice(code: string, amount: number): string {
  return code + String(Math.round(amount * 10)).padStart(5, '0') + '0001';
}

describe('transfer windows, connections and bounded selection', () => {
  it('supports second class plus hard sleeper with independently overridden seat preferences', async () => {
    const raw = schedule(base.date, '16:00', '1');
    raw.fullList[0]!.yp_info = packedPrice('O', 42.5);
    raw.fullList[1]!.ze_num = '无'; raw.fullList[1]!.yw_num = '有'; raw.fullList[1]!.yp_info = packedPrice('3', 87.5);
    const { client, requests } = setup(() => page([raw]));
    const common = await client.queryTransfer({ ...base, onlyAvailable: true, seatType: 'secondClass' });
    expect(common.routes).toHaveLength(0);
    const result = await client.queryTransfer({ ...base, onlyAvailable: true, seatType: 'firstClass', firstSeatType: 'secondClass', secondSeatType: 'hardSleeper', sortBy: 'price' });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]?.pricing).toMatchObject({ currency: 'CNY', lowestKnownPrice: 130, incomplete: false, combinationCount: 1,
      combinations: [{ firstSeatType: 'secondClass', secondSeatType: 'hardSleeper', firstPrice: 42.5, secondPrice: 87.5, totalPrice: 130 }] });
    expect(requests()).toHaveLength(2);
    expect((await client.queryTransfer({ ...base, onlyAvailable: true, firstSeatType: 'firstClass', secondSeatType: 'hardSleeper' })).routes).toHaveLength(0);
  });
  it('selects a cheaper later-page route before applying maxResults and keeps default duration sorting', async () => {
    const fast = schedule(base.date, '16:00', '1');
    const cheap = schedule(base.date, '16:00', '2', 180);
    for (const leg of fast.fullList) leg.yp_info = packedPrice('O', 200);
    for (const leg of cheap.fullList) leg.yp_info = packedPrice('O', 50);
    const { client, requests } = setup(url => url.searchParams.get('result_index') === '0' ? page([fast], true) : page([cheap]));
    const result = await client.queryTransfer({ ...base, onlyAvailable: true, sortBy: 'price', maxResults: 1 });
    expect(result.routes[0]).toMatchObject({ firstLeg: { trainCode: 'G2' }, pricing: { lowestKnownPrice: 100 } });
    expect(result.truncated).toBe(true); expect(requests()).toHaveLength(2);
    const byDuration = await client.queryTransfer({ ...base, maxResults: 1 });
    expect(byDuration.routes[0]?.firstLeg.trainCode).toBe('G1');
  });
  it('sorts unknown totals last, breaks price ties by duration and retains unknown-only routes', async () => {
    const unknown = schedule(base.date, '16:00', '1', 0);
    const knownSlow = schedule(base.date, '16:00', '2', 180);
    const knownFast = schedule(base.date, '16:00', '3');
    for (const leg of [...knownSlow.fullList, ...knownFast.fullList]) leg.yp_info = packedPrice('O', 0.1);
    const { client } = setup(() => page([unknown, knownSlow, knownFast]));
    const result = await client.queryTransfer({ ...base, sortBy: 'price', maxSeatCombinations: 1 });
    expect(result.routes.map(route => [route.firstLeg.trainCode, route.pricing.lowestKnownPrice])).toEqual([['G3', 0.2], ['G2', 0.2], ['G1', null]]);
    expect(result.routes[2]?.pricing.incomplete).toBe(true);
    const unknownOnly = setup(() => page([unknown]));
    expect((await unknownOnly.client.queryTransfer({ ...base, sortBy: 'price' })).routes[0]?.pricing.lowestKnownPrice).toBeNull();
  });
  it('preserves routes without requested-seat availability when onlyAvailable is omitted', async () => {
    const { client } = setup();
    const result = await client.queryTransfer({ ...base, firstSeatType: 'firstClass', secondSeatType: 'hardSleeper' });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]?.pricing).toMatchObject({ lowestKnownPrice: null, combinationCount: 0, combinations: [] });
  });
  it('applies departure only to the first leg and dated arrival only to the final leg', async () => {
    const { client, requests } = setup();
    const result = await client.queryTransfer({ ...base, departureAfter: '16:00', departureBefore: '16:00',
      arrivalAfter: '2026-10-08T21:50', arrivalBefore: '2026-10-08T21:50', minTransferMinutes: 180, maxTransferMinutes: 180,
      onlyAvailable: true, seatType: 'secondClass' });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({ firstLeg: { departureTime: '16:00', arrivalTime: '23:50' }, secondLeg: { departureTime: '02:50', arrivalDate: '2026-10-08', arrivalTime: '21:50' } });
    expect(result.truncated).toBe(false); expect(requests()).toHaveLength(1);
    expect((await client.queryTransfer({ ...base, arrivalAfter: '21:00', arrivalBefore: '22:00' })).routes).toHaveLength(0);
  });
  it('filters inclusive connection bounds and keeps cross-station plans unless requested otherwise', async () => {
    const { client } = setup();
    expect((await client.queryTransfer({ ...base, sameStationOnly: false })).routes).toHaveLength(1);
    expect((await client.queryTransfer({ ...base, sameStationOnly: true })).routes).toHaveLength(0);
    expect((await client.queryTransfer({ ...base, minTransferMinutes: 181 })).routes).toHaveLength(0);
    expect((await client.queryTransfer({ ...base, maxTransferMinutes: 179 })).routes).toHaveLength(0);
    const same = setup(() => page([schedule(base.date, '16:00', '1', 0)]));
    const result = await same.client.queryTransfer({ ...base, sameStationOnly: true, minTransferMinutes: 0, maxTransferMinutes: 0 });
    expect(result.routes[0]).toMatchObject({ sameStation: true, transferMinutes: 0 });
  });
  it('retains both-leg train type and seat availability rules with the new filters', async () => {
    const raw = schedule(base.date, '16:00', '1'); raw.fullList[1]!.ze_num = '无';
    const { client } = setup(() => page([raw]));
    expect((await client.queryTransfer({ ...base, trainTypes: ['G'], sameStationOnly: true })).routes).toHaveLength(1);
    expect((await client.queryTransfer({ ...base, onlyAvailable: true, seatType: 'secondClass', sameStationOnly: true })).routes).toHaveLength(0);
    expect((await client.queryTransfer({ ...base, trainTypes: ['D'], sameStationOnly: true })).routes).toHaveLength(0);
  });
  it.each<Partial<TransferQuery>>([
    { minTransferMinutes: -1 }, { maxTransferMinutes: 1.5 }, { minTransferMinutes: NaN },
    { maxTransferMinutes: Infinity }, { maxTransferMinutes: Number.MAX_SAFE_INTEGER + 1 },
    { minTransferMinutes: 90, maxTransferMinutes: 60 }, { sameStationOnly: 'true' as unknown as boolean },
    { departureAfter: '24:00' }, { arrivalBefore: '2026-02-30T12:00' },
    { arrivalAfter: '2026-10-09T00:00', arrivalBefore: '2026-10-08T00:00' },
    { firstSeatType: 'unknown' as TransferQuery['firstSeatType'] }, { secondSeatType: '' as TransferQuery['secondSeatType'] },
    { sortBy: 'fastest' as TransferQuery['sortBy'] }, { maxSeatCombinations: 0 }, { maxSeatCombinations: 21 },
    { maxSeatCombinations: 1.5 }, { maxSeatCombinations: Infinity },
  ])('rejects invalid filters before networking: %j', async filters => {
    const { client, fetcher } = setup();
    await expect(client.queryTransfer({ ...base, ...filters })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('queries both boarding dates, excludes the original morning and sorts the combined candidates', async () => {
    const { client, requests } = setup(url => {
      const date = url.searchParams.get('train_date')!;
      return page([schedule(date, '23:00', '1', 120), schedule(date, '02:00', '2'), schedule(date, '02:01', '3'), schedule(date, '22:59', '4')]);
    });
    const result = await client.queryTransfer({ ...base, departureAfter: '23:00', departureBefore: '02:00' });
    expect(requests().map(url => url.searchParams.get('train_date'))).toEqual(['2026-10-07', '2026-10-08']);
    expect(result.routes.map(route => [route.firstLeg.departureDate, route.firstLeg.departureTime])).toEqual([
      ['2026-10-08', '02:00'], ['2026-10-07', '23:00'],
    ]);
    expect(result.query).toEqual(base); expect(result.truncated).toBe(false);
  });
  it('compares overnight arrival clocks using their actual dates', async () => {
    const { client } = setup(() => page([schedule(base.date, '21:00', '1'), schedule(base.date, '01:00', '2')]));
    const result = await client.queryTransfer({ ...base, arrivalAfter: '23:00', arrivalBefore: '02:00' });
    expect(result.routes.map(route => route.firstLeg.trainCode)).toEqual(['G1']);
    expect(result.routes[0]?.secondLeg).toMatchObject({ arrivalDate: '2026-10-08', arrivalTime: '00:00' });
  });
  it('fails the entire midnight window if the second date is rejected upstream', async () => {
    const { client, requests } = setup(url => url.searchParams.get('train_date') === base.date
      ? page([schedule(base.date, '23:00', '1')]) : { status: true, data: 'no next-day data' });
    await expect(client.queryTransfer({ ...base, departureAfter: '23:00', departureBefore: '02:00' })).rejects.toThrow('未返回中转方案');
    expect(requests()).toHaveLength(2);
  });
  it('finds a faster later-page plan even when the first page already fills maxResults', async () => {
    const { client, requests } = setup(url => url.searchParams.get('result_index') === '0'
      ? page([schedule(base.date, '16:00', '1', 180)], true)
      : page([schedule(base.date, '16:00', '2', 60)], false, 2));
    const result = await client.queryTransfer({ ...base, maxResults: 1 });
    expect(result.routes.map(route => route.firstLeg.trainCode)).toEqual(['G2']);
    expect(result.truncated).toBe(true); expect(requests()).toHaveLength(2);
  });
  it('deduplicates pages without treating an exactly full result set as truncated', async () => {
    const raw = schedule(base.date, '16:00', '1');
    const { client, requests } = setup(url => page([raw, raw], url.searchParams.get('result_index') === '0', 1));
    const result = await client.queryTransfer({ ...base, maxResults: 1 });
    expect(result.routes).toHaveLength(1); expect(result.truncated).toBe(false); expect(requests()).toHaveLength(2);
  });
  it('resets pagination per boarding date and reports unread pages at the configured cap', async () => {
    const { client, requests } = setup(url => page([schedule(url.searchParams.get('train_date')!, '00:00', '1')], true,
      Number(url.searchParams.get('result_index')) + 1), 2);
    const result = await client.queryTransfer({ ...base, departureAfter: '23:00', departureBefore: '02:00' });
    expect(requests().map(url => [url.searchParams.get('train_date'), url.searchParams.get('result_index')])).toEqual([
      ['2026-10-07', '0'], ['2026-10-07', '1'], ['2026-10-08', '0'], ['2026-10-08', '1'],
    ]);
    expect(result.routes).toHaveLength(1); expect(result.truncated).toBe(true);
  });
  it('rejects a response for the wrong boarding date', async () => {
    const { client } = setup(() => page([schedule('2026-10-08', '16:00', '1')]));
    await expect(client.queryTransfer(base)).rejects.toThrow('出发日期与请求不一致');
  });
});
