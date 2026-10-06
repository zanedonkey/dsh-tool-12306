import { afterEach, describe, expect, it } from 'vitest';
import { RailwayClient } from '../src/client/index.js';
import { fixtureFetch, midnightFetch } from './helpers.js';
import transfer from './fixtures/transfer.json' with { type: 'json' };
const now = () => new Date('2026-10-06T00:00:00Z');
const clients: RailwayClient[] = [];
afterEach(() => { for (const client of clients.splice(0)) client.dispose(); });
function setup(fetcher = fixtureFetch()) {
  const client = new RailwayClient({ requestIntervalMs: 100, maxRetries: 0 }, fetcher, now);
  clients.push(client); return { client, fetcher };
}
describe('Railway Client orchestration', () => {
  it('queries both boarding dates once and sorts the whole midnight window before applying limits', async () => {
    const { client, fetcher } = setup(midnightFetch());
    const result = await client.queryTickets({ date: '2026-10-07', from: '北京', to: '上海', departureAfter: '23:00', departureBefore: '02:00', maxResults: 3 });
    expect(result.trains.map(train => [train.departureDate, train.trainCode])).toEqual([
      ['2026-10-07', 'G9006'], ['2026-10-07', 'G9271'], ['2026-10-08', 'G9007'],
    ]);
    expect(result.query.date).toBe('2026-10-07');
    const queries = fetcher.mock.calls.map(call => new URL(String(call[0]))).filter(url => url.pathname.includes('/leftTicket/query'));
    expect(queries.map(url => url.searchParams.get('leftTicketDTO.train_date'))).toEqual(['2026-10-07', '2026-10-08']);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it('keeps overnight arrivals with explicit next-day bounds without expanding departure days', async () => {
    const { client, fetcher } = setup(midnightFetch());
    const result = await client.queryTickets({ date: '2026-10-07', from: '北京', to: '上海', arrivalAfter: '2026-10-08T00:00', arrivalBefore: '2026-10-08T02:00' });
    expect(result.trains.map(train => train.trainCode)).toEqual(['G9271']);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('rejects invalid dated windows before sending requests', async () => {
    const { client, fetcher } = setup();
    await expect(client.queryTickets({ date: '2026-10-07', from: '北京', to: '上海', arrivalAfter: '2026-10-09T23:00', arrivalBefore: '2026-10-08T02:00' })).rejects.toThrow('下限');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails explicitly when the next boarding day is unavailable rather than returning an incomplete window', async () => {
    const fetcher = midnightFetch(); const original = midnightFetch();
    fetcher.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.includes('/leftTicket/query') && url.searchParams.get('leftTicketDTO.train_date') === '2026-10-08') return new Response('{"status":false}');
      return original(input, init);
    });
    const { client } = setup(fetcher);
    await expect(client.queryTickets({ date: '2026-10-07', from: '北京', to: '上海', departureAfter: '23:00', departureBefore: '02:00' })).rejects.toThrow('未接受');
  });
  it('shares concurrent station initialization and identical ticket HTTP requests', async () => {
    const { client, fetcher } = setup();
    const query = { date: '2026-10-07', from: '北京', to: '上海' };
    const [first, second] = await Promise.all([client.queryTickets(query), client.queryTickets(query)]);
    expect(first).toEqual(second); expect(first).not.toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(4);
    await client.queryTickets(query); expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it('resolves city internally, caches station data/session and filters by seat', async () => {
    const { client, fetcher } = setup();
    const query = { date: '2026-10-07', from: '北京', to: '上海', onlyAvailable: true, seatType: 'secondClass' } as const;
    expect((await client.queryTickets(query)).trains.map(t => t.trainCode)).toEqual(['G1']);
    await client.queryTickets(query);
    const urls = fetcher.mock.calls.map(call => String(call[0]));
    expect(urls.filter(url => url.endsWith('/index/'))).toHaveLength(1);
    expect(urls.filter(url => url.endsWith('/otn/leftTicket/init'))).toHaveLength(1);
    expect(urls.at(-1)).toContain('from_station=BJP');
  });
  it('does not expand explicit station 北京站 to city stations', async () => {
    const { client } = setup();
    expect((await client.queryTickets({ date: '2026-10-07', from: '北京站', to: '上海' })).trains).toEqual([]);
  });
  it('rejects invalid inputs before networking', async () => {
    const { client, fetcher } = setup();
    await expect(client.queryTickets({ date: '2026-10-05', from: '北京', to: '上海' })).rejects.toThrow('乘车日期');
    await expect(client.queryTickets({ date: '2026-10-07', from: '北京', to: '上海', departureAfter: '24:01' })).rejects.toThrow('HH:mm');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('handles automatic and city-constrained transfers with both-leg filtering', async () => {
    const { client, fetcher } = setup();
    const base = { date: '2026-10-07', from: '深圳', to: '拉萨', maxResults: 2 };
    expect((await client.queryTransfer(base)).routes).toHaveLength(1);
    expect((await client.queryTransfer({ ...base, transferStation: '西安' })).routes).toHaveLength(1);
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain('middle_station=XAY');
    expect((await client.queryTransfer({ ...base, trainTypes: ['G'] })).routes).toHaveLength(0);
  });
  it('bounds pagination and marks partial results', async () => {
    const { client, fetcher } = setup();
    fetcher.mockImplementation(async input => {
      const url = new URL(String(input));
      if (url.pathname.startsWith('/lcquery/query')) {
        const raw = structuredClone(transfer); raw.data.can_query = 'Y';
        raw.data.result_index = Number(url.searchParams.get('result_index')) + 1;
        return new Response(JSON.stringify(raw));
      }
      return fixtureFetch()(input);
    });
    const result = await client.queryTransfer({ date: '2026-10-07', from: '深圳', to: '拉萨', maxResults: 5 });
    expect(result.truncated).toBe(true); expect(result.routes).toHaveLength(1);
    expect(fetcher.mock.calls.filter(call => String(call[0]).includes('/lcquery/query'))).toHaveLength(3);
  });
  it('rejects repeated pagination cursors', async () => {
    const { client, fetcher } = setup();
    fetcher.mockImplementation(async input => {
      if (String(input).includes('/lcquery/query')) {
        const raw = structuredClone(transfer); raw.data.can_query = 'Y'; raw.data.result_index = 0;
        return new Response(JSON.stringify(raw));
      }
      return fixtureFetch()(input);
    });
    await expect(client.queryTransfer({ date: '2026-10-07', from: '深圳', to: '拉萨' })).rejects.toThrow('游标重复');
  });
  it('matches G1 exactly rather than selecting G10 and defaults to China date', async () => {
    const { client, fetcher } = setup();
    const result = await client.trainRoute({ trainCode: 'g1', from: '北京南', to: '上海虹桥' });
    expect(result.trainCode).toBe('G1'); expect(result.date).toBe('2026-10-06');
    const request = fetcher.mock.calls.find(call => String(call[0]).includes('queryTrainInfo'));
    expect(String(request?.[0])).toContain('train_no=test-G1');
    await expect(client.trainRoute({ trainCode: 'G2' })).rejects.toThrow('未找到唯一');
  });
  it('rejects reversed route segments', async () => {
    const { client } = setup();
    await expect(client.trainRoute({ trainCode: 'G1', from: '上海虹桥', to: '北京南' })).rejects.toThrow('指定区间');
  });
});

