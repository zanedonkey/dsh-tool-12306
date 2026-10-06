import { describe, expect, it, vi } from 'vitest';
import { normalizeConfig } from '../src/config.js';
import { HttpClient } from '../src/client/http.js';
import { AnonymousCookies } from '../src/client/cookie.js';
const config = normalizeConfig({ requestIntervalMs: 100, timeoutMs: 1000, maxRetries: 1, maxResponseBytes: 1024, rateLimitCooldownMs: 1000 });
const url = 'https://kyfw.12306.cn/otn/test';
async function started(): Promise<void> { await Promise.resolve(); await Promise.resolve(); }

describe('429 cooldown across calls', () => {
  it.each(['120', 'Wed, 07 Oct 2026 00:02:00 GMT'])('honors Retry-After %s and resumes after cooldown', async hint => {
    let now = Date.parse('2026-10-07T00:00:00Z');
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(async () => new Response('', { status: 429, headers: { 'Retry-After': hint } })).mockImplementation(async () => new Response('ok'));
    const http = new HttpClient(config, fetcher, () => now);
    try {
      await expect(http.text(url)).rejects.toThrow('过于频繁');
      now += 119000;
      await expect(http.text(url)).rejects.toThrow('冷却中');
      expect(fetcher).toHaveBeenCalledTimes(1);
      now += 1000; expect(await http.text(url)).toBe('ok');
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { http.dispose(); }
  });
  it.each([null, 'bad date', '0', '-1'])('uses the minimum cooldown for hint %s', async hint => {
    let now = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('', { status: 429, headers: hint === null ? {} : { 'Retry-After': hint } }));
    const http = new HttpClient(config, fetcher, () => now);
    try {
      await expect(http.text(url)).rejects.toThrow('过于频繁');
      now = 999; await expect(http.text(url)).rejects.toThrow('冷却中');
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { http.dispose(); }
  });
  it('blocks requests already queued when the upstream starts limiting', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const http = new HttpClient(config, fetcher);
    try {
      const first = http.text(url); const second = http.text(`${url}?next=1`);
      const checks = [expect(first).rejects.toThrow('过于频繁'), expect(second).rejects.toThrow('冷却中')];
      await started(); release(new Response('', { status: 429 })); await Promise.all(checks);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { http.dispose(); }
  });
});

describe('bounded response consumption', () => {
  it('rejects declared oversized bodies before reading and without retry', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(body, { headers: { 'Content-Length': '1025' } }));
    const http = new HttpClient(config, fetcher);
    try {
      await expect(http.text(url)).rejects.toThrow('大小限制');
      expect(cancel).toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { http.dispose(); }
  });
  it('counts actual streamed bytes even when Content-Length understates the response', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(600)); controller.enqueue(new Uint8Array(600)); }, cancel });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(body, { headers: { 'Content-Length': '1' } }));
    const http = new HttpClient(config, fetcher);
    try {
      await expect(http.text(url)).rejects.toThrow('大小限制');
      expect(cancel).toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { http.dispose(); }
  });
  it('decodes UTF-8 spanning stream chunks', async () => {
    const bytes = new TextEncoder().encode('北京上海');
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes.slice(0, 2)); controller.enqueue(bytes.slice(2)); controller.close(); } });
    const http = new HttpClient(config, async () => new Response(body));
    try { expect(await http.text(url)).toBe('北京上海'); } finally { http.dispose(); }
  });
  it('times out and cancels stalled response bodies', async () => {
    const cancel = vi.fn();
    const http = new HttpClient({ ...config, timeoutMs: 100 }, async () => new Response(new ReadableStream({ cancel })));
    try { await expect(http.text(url)).rejects.toThrow('超时'); expect(cancel).toHaveBeenCalled(); } finally { http.dispose(); }
  });
});

describe('in-flight request sharing', () => {
  it('removes shared failures so a later query can try again', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(async () => new Response('invalid-json')).mockImplementation(async () => new Response('{"ok":true}'));
    const http = new HttpClient(config, fetcher);
    try {
      const first = http.json(url, new URLSearchParams()); const second = http.json(url, new URLSearchParams());
      await Promise.all([expect(first).rejects.toThrow('非 JSON'), expect(second).rejects.toThrow('非 JSON')]);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await http.json(url, new URLSearchParams())).toEqual({ ok: true }); expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { http.dispose(); }
  });
  it('disposal aborts every subscriber while reading a shared body', async () => {
    let received!: () => void; const responseReady = new Promise<void>(resolve => { received = resolve; });
    const cancel = vi.fn();
    const http = new HttpClient(config, async () => {
      const response = new Response(new ReadableStream({ cancel })); received(); return response;
    });
    const first = http.text(url); const second = http.text(url);
    const checks = [expect(first).rejects.toThrow(), expect(second).rejects.toThrow()];
    await responseReady; await started(); http.dispose(); await Promise.all(checks);
    expect(cancel).toHaveBeenCalled(); await expect(http.text(url)).rejects.toThrow();
  });
  it('merges concurrent identical queries but fetches completed queries again', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockImplementation(async () => new Response('fresh'));
    const http = new HttpClient(config, fetcher);
    try {
      const first = http.json(url, new URLSearchParams('date=2026-10-07'));
      const second = http.json(url, new URLSearchParams('date=2026-10-07'));
      await started(); expect(fetcher).toHaveBeenCalledTimes(1);
      release(new Response('{"trains":[]}'));
      const [a, b] = await Promise.all([first, second]); expect(a).toEqual(b); expect(a).not.toBe(b);
      expect(await http.text(`${url}?date=2026-10-07`)).toBe('fresh'); expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { http.dispose(); }
  });
  it('cancels one subscriber without interrupting another', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const http = new HttpClient(config, fetcher); const caller = new AbortController();
    try {
      const canceled = http.text(url, caller.signal); const remaining = http.text(url);
      const rejection = expect(canceled).rejects.toThrow(); await started(); caller.abort(); await rejection;
      expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
      release(new Response('ok')); expect(await remaining).toBe('ok'); expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { http.dispose(); }
  });
  it('aborts the underlying request once every subscriber cancels', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }); }));
    const http = new HttpClient(config, fetcher); const a = new AbortController(); const b = new AbortController();
    try {
      const first = http.text(url, a.signal); const second = http.text(url, b.signal);
      const checks = [expect(first).rejects.toThrow(), expect(second).rejects.toThrow()];
      await started(); a.abort(); b.abort(); await Promise.all(checks);
      expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true); expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { http.dispose(); }
  });
  it('bounds distinct pending requests and frees capacity after completion', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockImplementation(async () => new Response('next'));
    const http = new HttpClient({ ...config, maxPendingRequests: 1 }, fetcher);
    try {
      const first = http.text(url); const same = http.text(url); await started();
      await expect(http.text(`${url}?different=1`)).rejects.toThrow('队列已满');
      release(new Response('ok')); expect(await Promise.all([first, same])).toEqual(['ok', 'ok']);
      expect(await http.text(`${url}?different=1`)).toBe('next');
    } finally { http.dispose(); }
  });
});

it('keeps conservative defaults and rejects invalid resource limits', () => {
  expect(normalizeConfig({})).toMatchObject({ requestIntervalMs: 1000, rateLimitCooldownMs: 60000, maxResponseBytes: 4194304, maxPendingRequests: 32 });
  expect(() => normalizeConfig({ maxResponseBytes: 0 })).toThrow();
  expect(() => normalizeConfig({ rateLimitCooldownMs: 999 })).toThrow();
  expect(() => normalizeConfig({ maxPendingRequests: 129 })).toThrow();
});

describe('anonymous cookie boundaries', () => {
  it('honors expiry, Max-Age precedence and path boundaries', () => {
    let now = Date.parse('2026-10-07T00:00:00Z'); const jar = new AnonymousCookies(() => now);
    const headers = new Headers();
    headers.append('Set-Cookie', 'anon=a=b; Path=/otn; Max-Age=1; Expires=Wed, 07 Oct 2020 00:00:00 GMT');
    headers.append('Set-Cookie', 'expired=no; Path=/; Expires=Wed, 07 Oct 2020 00:00:00 GMT');
    jar.update(headers);
    expect(jar.header(new URL('https://kyfw.12306.cn/otn/query'))).toBe('anon=a=b');
    expect(jar.header(new URL('https://kyfw.12306.cn/otn-other'))).toBe('');
    expect(jar.header(new URL('https://search.12306.cn/otn'))).toBe('');
    now += 1000; expect(jar.header(new URL('https://kyfw.12306.cn/otn/query'))).toBe('');
  });
  it('uses the response path as the default and rejects foreign domains', () => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'anon=yes'); headers.append('Set-Cookie', 'foreign=no; Domain=evil.invalid; Path=/');
    const jar = new AnonymousCookies(); jar.update(headers, new URL('https://kyfw.12306.cn/otn/leftTicket/init'));
    expect(jar.header(new URL('https://kyfw.12306.cn/otn/leftTicket/queryG'))).toBe('anon=yes');
    expect(jar.header(new URL('https://kyfw.12306.cn/lcquery/queryG'))).toBe('');
  });
  it('bounds cookie entries and ignores oversized values', () => {
    const headers = new Headers();
    for (let i = 0; i < 130; i++) headers.append('Set-Cookie', `c${i}=v; Path=/`);
    const jar = new AnonymousCookies(); jar.update(headers);
    expect(jar.header().split('; ')).toHaveLength(128);
    jar.update(new Headers({ 'Set-Cookie': `large=${'a'.repeat(4096)}; Path=/` }));
    expect(jar.header()).not.toContain('large='); jar.clear(); expect(jar.header()).toBe('');
  });
});
