import { afterEach, describe, expect, it, vi } from 'vitest';
import { RailwayClient } from '../src/client/index.js';
import { withQueryDeadline } from '../src/query-deadline.js';
import { QueryTimeoutError } from '../src/errors.js';
import { normalizeConfig } from '../src/config.js';
import { fixtureFetch } from './helpers.js';
import transfer from './fixtures/transfer.json' with { type: 'json' };

const clients: RailwayClient[] = [];
afterEach(() => { for (const client of clients.splice(0)) client.dispose(); });
const args = { date: '2026-10-07', from: '北京', to: '上海' };
async function warmedClient() {
  const fetcher = fixtureFetch();
  const client = new RailwayClient({ requestIntervalMs: 100, timeoutMs: 2000, queryTimeoutMs: 5000, maxRetries: 1 }, fetcher, () => new Date('2026-10-06T00:00:00Z'));
  clients.push(client);
  await client.queryTickets(args);
  return { client, fetcher };
}
function stalled(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise((_resolve, reject) => {
    if (signal?.aborted) reject(signal.reason);
    else signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}
describe('whole-query deadline', () => {
  it('bounds calls even when a dependency ignores cancellation and clears the timer on success', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let querySignal!: AbortSignal;
    const pending = withQueryDeadline(100, controller.signal, signal => { querySignal = signal; return new Promise<never>(() => {}); });
    const assertion = expect(pending).rejects.toBeInstanceOf(QueryTimeoutError);
    await vi.advanceTimersByTimeAsync(100); await assertion;
    expect(querySignal.aborted).toBe(true); expect(controller.signal.aborted).toBe(false);
    expect(await withQueryDeadline(100, undefined, async () => 42)).toBe(42);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves caller cancellation and refuses already cancelled calls', async () => {
    const controller = new AbortController(); const reason = new DOMException('user cancelled', 'AbortError');
    const pending = withQueryDeadline(1000, controller.signal, () => new Promise<never>(() => {}));
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    const run = vi.fn(async () => 42);
    await expect(withQueryDeadline(1000, controller.signal, run)).rejects.toBe(reason);
    expect(run).not.toHaveBeenCalled();
  });
  it('expires a queued query without cancelling a different active subscriber', async () => {
    const { client, fetcher } = await warmedClient();
    let started!: () => void; const ready = new Promise<void>(resolve => { started = resolve; });
    let activeSignal!: AbortSignal;
    fetcher.mockImplementation(async (_input, init) => { activeSignal = init!.signal!; started(); return stalled(init?.signal); });
    const controller = new AbortController();
    const first = client.queryTickets(args, controller.signal);
    const firstAssertion = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await ready;
    client.config.queryTimeoutMs = 100;
    const before = fetcher.mock.calls.length;
    await expect(client.queryTickets({ ...args, from: '上海虹桥', to: '杭州东' })).rejects.toBeInstanceOf(QueryTimeoutError);
    expect(fetcher.mock.calls).toHaveLength(before); expect(activeSignal.aborted).toBe(false);
    controller.abort(); await firstAssertion;
  });
  it('shares HTTP work without allowing a short deadline to abort a longer identical query', async () => {
    const { client, fetcher } = await warmedClient();
    let started!: () => void; const ready = new Promise<void>(resolve => { started = resolve; });
    let release!: (response: Response) => void; let activeSignal!: AbortSignal;
    const original = fixtureFetch();
    fetcher.mockImplementation(async (_input, init) => { activeSignal = init!.signal!; started(); return new Promise(resolve => { release = resolve; }); });
    const first = client.queryTickets(args); await ready;
    client.config.queryTimeoutMs = 100;
    await expect(client.queryTickets(args)).rejects.toBeInstanceOf(QueryTimeoutError);
    expect(activeSignal.aborted).toBe(false);
    release(await original('https://kyfw.12306.cn/otn/leftTicket/queryG'));
    expect((await first).trains.length).toBeGreaterThan(0);
  });
  it('uses one deadline across transfer pages and aborts the current response', async () => {
    const { client, fetcher } = await warmedClient();
    const original = fixtureFetch(); let pages = 0; let pageSignal!: AbortSignal;
    fetcher.mockImplementation(async (input, init) => {
      if (String(input).includes('/lcquery/query')) {
        pages++;
        if (pages === 1) {
          const raw = structuredClone(transfer); raw.data.can_query = 'Y'; raw.data.result_index = 1;
          return new Response(JSON.stringify(raw));
        }
        pageSignal = init!.signal!; return stalled(pageSignal);
      }
      return original(input, init);
    });
    client.config.queryTimeoutMs = 1000;
    await expect(client.queryTransfer({ date: '2026-10-07', from: '深圳', to: '拉萨' })).rejects.toBeInstanceOf(QueryTimeoutError);
    expect(pages).toBe(2); expect(pageSignal.aborted).toBe(true);
  });
  it('does not restart the budget for retries and includes stalled body reads', async () => {
    const { client, fetcher } = await warmedClient();
    client.config.queryTimeoutMs = 150;
    fetcher.mockResolvedValue(new Response('', { status: 503 }));
    const before = fetcher.mock.calls.length;
    await expect(client.queryTickets(args)).rejects.toBeInstanceOf(QueryTimeoutError);
    expect(fetcher.mock.calls.length - before).toBe(1);
    const cancel = vi.fn();
    fetcher.mockImplementation(async () => new Response(new ReadableStream({ cancel })));
    await expect(client.trainRoute({ trainCode: 'G1' })).rejects.toBeInstanceOf(QueryTimeoutError);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('validates the deadline budget independently of per-request timeout', () => {
    expect(normalizeConfig({})).toMatchObject({ queryTimeoutMs: 60000, timeoutMs: 15000 });
    for (const value of [99, 300001, 100.5]) expect(() => normalizeConfig({ queryTimeoutMs: value })).toThrow();
  });
});
