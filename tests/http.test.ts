import { describe, expect, it, vi } from 'vitest';
import { normalizeConfig } from '../src/config.js';
import { AnonymousCookies } from '../src/client/cookie.js';
import { HttpClient, queryPath } from '../src/client/http.js';
const config = normalizeConfig({ requestIntervalMs: 100, timeoutMs: 100, maxRetries: 1 });
describe('HTTP Client', () => {
  it('preserves cookie values containing equals and applies deletions', () => {
    const jar = new AnonymousCookies();
    jar.update(new Headers({ 'Set-Cookie': 'anonymous=a=b; Path=/; HttpOnly' }));
    expect(jar.header()).toBe('anonymous=a=b');
    jar.update(new Headers({ 'Set-Cookie': 'anonymous=gone; Max-Age=0' }));
    expect(jar.header()).toBe('');
  });
  it('scopes cookies to query host', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}', { headers: { 'Set-Cookie': 'anon=abc; Path=/' } }));
    const http = new HttpClient(config, fetcher);
    await http.text('https://kyfw.12306.cn/otn/leftTicket/init');
    await http.text('https://search.12306.cn/search');
    expect(fetcher.mock.calls[1]?.[1]?.headers).not.toHaveProperty('Cookie');
    http.dispose();
  });
  it('rejects external addresses and upstream 429 without retry', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429 }));
    const http = new HttpClient(config, fetcher);
    await expect(http.text('https://evil.invalid/')).rejects.toThrow('官方地址');
    await expect(http.text('https://kyfw.12306.cn/')).rejects.toThrow('过于频繁');
    expect(fetcher).toHaveBeenCalledTimes(1);
    http.dispose();
  });
  it('retries server errors but bounds attempts', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('', { status: 503 }));
    const http = new HttpClient(config, fetcher);
    await expect(http.text('https://kyfw.12306.cn/')).rejects.toThrow('HTTP 503');
    expect(fetcher).toHaveBeenCalledTimes(2);
    http.dispose();
  });
  it('rejects malformed JSON and failed status envelopes', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('<html/>')).mockResolvedValueOnce(new Response('{"status":false}'));
    const http = new HttpClient(config, fetcher);
    await expect(http.json('https://kyfw.12306.cn/', new URLSearchParams())).rejects.toThrow('非 JSON');
    await expect(http.json('https://kyfw.12306.cn/', new URLSearchParams())).rejects.toThrow('未接受');
    http.dispose();
  });
  it('serializes concurrent requests and spaces their starts', async () => {
    const starts: number[] = [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { starts.push(Date.now()); return new Response('ok'); });
    const http = new HttpClient(config, fetcher);
    await Promise.all([http.text('https://kyfw.12306.cn/?query=1'), http.text('https://kyfw.12306.cn/?query=2')]);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(95);
    http.dispose();
  });
  const waitingFetch: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
  });
  it('enforces timeout', async () => {
    const http = new HttpClient(config, waitingFetch);
    await expect(http.text('https://kyfw.12306.cn/')).rejects.toThrow('超时');
    http.dispose();
  });
  it('aborts in-flight work on disposal and rejects subsequent calls', async () => {
    const http = new HttpClient(config, waitingFetch);
    const pending = http.text('https://kyfw.12306.cn/');
    const assertion = expect(pending).rejects.toThrow();
    await Promise.resolve(); http.dispose(); await assertion;
    await expect(http.text('https://kyfw.12306.cn/')).rejects.toThrow();
  });
  it('honors pre-aborted execution', async () => {
    const fetcher = vi.fn<typeof fetch>(); const http = new HttpClient(config, fetcher);
    await expect(http.text('https://kyfw.12306.cn/', AbortSignal.abort())).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled(); http.dispose();
  });
  it('cancels a queued caller immediately without letting later calls overtake an active request', async () => {
    let release!: (response: Response) => void;
    const active = new Promise<Response>(resolve => { release = resolve; });
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => active).mockImplementation(async () => new Response('next'));
    const http = new HttpClient({ ...config, timeoutMs: 1000 }, fetcher);
    const first = http.text('https://kyfw.12306.cn/?query=1'); await Promise.resolve(); await Promise.resolve();
    const signal = new AbortController();
    const second = http.text('https://kyfw.12306.cn/?query=2', signal.signal);
    const assertion = expect(second).rejects.toThrow(); signal.abort(); await assertion;
    const third = http.text('https://kyfw.12306.cn/?query=3');
    expect(fetcher).toHaveBeenCalledTimes(1);
    release(new Response('first')); expect(await first).toBe('first'); expect(await third).toBe('next');
    http.dispose();
  });
});
it('discovers current query endpoints without trusting arbitrary paths', () => {
  expect(queryPath("var CLeftTicketUrl = 'leftTicket/queryG';", 'tickets').pathname).toBe('/otn/leftTicket/queryG');
  expect(queryPath("var lc_search_url = '/lcquery/queryU';", 'transfer').pathname).toBe('/lcquery/queryU');
  expect(() => queryPath("var CLeftTicketUrl = 'https://evil.invalid/';", 'tickets')).toThrow();
});
