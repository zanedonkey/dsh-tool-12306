import { afterAll, describe, expect, it } from 'vitest';
import { RailwayClient } from '../../src/client/index.js';
import { addDays, chinaToday } from '../../src/date.js';
const requestedUrls: URL[] = [];
const liveFetch: typeof fetch = (input, init) => {
  requestedUrls.push(new URL(input instanceof Request ? input.url : String(input)));
  return fetch(input, init);
};
const client = new RailwayClient({ timeoutMs: 20000, requestIntervalMs: 1000, maxRetries: 0, maxTransferPages: 2 }, liveFetch);
const date = addDays(chinaToday(), 1);
afterAll(() => client.dispose());
describe.sequential('live anonymous official 12306 queries', () => {
  it('resolves six required stations from the current official dataset', async () => {
    const resolver = await client.stations();
    for (const station of ['北京', '北京南', '上海', '上海虹桥', '广州南', '深圳北']) expect(resolver.resolve(station).station.telecode).toMatch(/^[A-Z]{3}$/);
  });
  it('queries tomorrow Beijing to Shanghai high-speed tickets', async () => {
    const result = await client.queryTickets({ date, from: '北京', to: '上海', trainTypes: ['G'], maxResults: 3 });
    expect(result.query.date).toBe(date);
    expect(result.trains.length).toBeGreaterThan(0);
    for (const train of result.trains) expect(train.trainCode).toMatch(/^G/);
  });
  it('queries afternoon Shanghai Hongqiao to Hangzhou East trains', async () => {
    const result = await client.queryTickets({ date, from: '上海虹桥', to: '杭州东', departureAfter: '14:00', maxResults: 3 });
    expect(result.trains.length).toBeGreaterThan(0);
    for (const train of result.trains) expect(train.departureTime >= '14:00').toBe(true);
  });
  it('queries Shenzhen to Lhasa transfer plans', async () => {
    const result = await client.queryTransfer({ date, from: '深圳', to: '拉萨', maxResults: 3 });
    expect(result.routes.length).toBeGreaterThan(0);
    for (const route of result.routes) expect(route.transferMinutes).toBeGreaterThanOrEqual(0);
  });
  it('finds G1 and returns real route stations', async () => {
    const result = await client.trainRoute({ trainCode: 'G1', date });
    expect(result.stations.length).toBeGreaterThan(1);
    expect(result.stations[0]?.arrivalTime).toBeNull();
    expect(result.stations.at(-1)?.departureTime).toBeNull();
  });
  it('queries both real boarding dates for one overnight departure window', async () => {
    const before = requestedUrls.length;
    const result = await client.queryTickets({ date, from: '上海虹桥', to: '杭州东', departureAfter: '23:00', departureBefore: '02:00', maxResults: 3 });
    const queries = requestedUrls.slice(before).filter(url => url.pathname.startsWith('/otn/leftTicket/query'));
    expect(queries.map(url => url.searchParams.get('leftTicketDTO.train_date'))).toEqual([date, addDays(date, 1)]);
    for (const train of result.trains) {
      const actual = `${train.departureDate}T${train.departureTime}`;
      expect(actual >= `${date}T23:00` && actual <= `${addDays(date, 1)}T02:00`).toBe(true);
    }
  });
});
