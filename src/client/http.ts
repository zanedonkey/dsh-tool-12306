import { setTimeout as sleep } from 'node:timers/promises';
import type { RuntimeConfig } from '../config.js';
import { ParseError, RailwayError, RateLimitedError, Upstream12306Error } from '../errors.js';
import { AnonymousCookies } from './cookie.js';
export const QUERY_ORIGIN = 'https://kyfw.12306.cn';
const OFFICIAL_ORIGINS = new Set([QUERY_ORIGIN, 'https://www.12306.cn', 'https://search.12306.cn']);
export type Fetcher = typeof fetch;
interface Flight {
  controller: AbortController;
  promise: Promise<string>;
  subscribers: number;
}

export class HttpClient {
  private readonly lifetime = new AbortController();
  private readonly cookies = new AnonymousCookies();
  private tail: Promise<void> = Promise.resolve();
  private lastStart = 0;
  private cooldownUntil = 0;
  private readonly flights = new Map<string, Flight>();
  constructor(readonly config: RuntimeConfig, private readonly fetcher: Fetcher = fetch, private readonly now = Date.now) {}
  dispose(): void {
    this.lifetime.abort(); this.cookies.clear(); this.flights.clear();
  }
  private checkCooldown(): void {
    const seconds = Math.ceil((this.cooldownUntil - this.now()) / 1000);
    if (seconds > 0) throw new RateLimitedError(`12306 限流冷却中，请约 ${seconds} 秒后重试。`);
  }
  private startCooldown(value: string | null): void {
    // Bound malformed or extreme upstream hints to one day, with a configurable minimum.
    const seconds = value && /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
    const hinted = Number.isFinite(seconds) ? seconds * 1000 : value ? Date.parse(value) - this.now() : 0;
    const delay = Math.max(this.config.rateLimitCooldownMs, Number.isFinite(hinted) ? Math.min(hinted, 86400000) : 0);
    this.cooldownUntil = Math.max(this.cooldownUntil, this.now() + delay);
  }
  private async readBody(response: Response, signal: AbortSignal): Promise<string> {
    const limit = this.config.maxResponseBytes;
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > limit) {
      void response.body?.cancel().catch(() => undefined);
      throw new ParseError('12306 响应超过大小限制，已停止读取。');
    }
    if (!response.body) return '';
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    signal.addEventListener('abort', cancel, { once: true });
    const decoder = new TextDecoder();
    let bytes = 0; let text = '';
    try {
      if (signal.aborted) cancel();
      signal.throwIfAborted();
      while (true) {
        const chunk = await reader.read();
        signal.throwIfAborted();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > limit) {
          cancel();
          throw new ParseError('12306 响应超过大小限制，已停止读取。');
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      return text + decoder.decode();
    } finally {
      signal.removeEventListener('abort', cancel);
      reader.releaseLock();
    }
  }
  private async request(url: URL, signal?: AbortSignal): Promise<string> {
    if (!OFFICIAL_ORIGINS.has(url.origin) || url.username || url.password) throw new Upstream12306Error('拒绝非 12306 官方地址。');
    const caller = AbortSignal.any([this.lifetime.signal, ...(signal ? [signal] : [])]);
    caller.throwIfAborted();
    this.checkCooldown();
    // Serialize requests for this plugin instance. Rejections never poison the queue.
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    try {
      // An aborted waiter remains a queue barrier until its predecessor finishes.
      await new Promise<void>((resolve, reject) => {
        const aborted = () => { caller.removeEventListener('abort', aborted); reject(caller.reason); };
        caller.addEventListener('abort', aborted, { once: true });
        void previous.then(() => { caller.removeEventListener('abort', aborted); resolve(); });
      });
      caller.throwIfAborted();
      this.checkCooldown();
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        const delay = Math.max(0, this.lastStart + this.config.requestIntervalMs - Date.now());
        if (delay) await sleep(delay, undefined, { signal: caller });
        caller.throwIfAborted();
        this.lastStart = Date.now();
        const timeout = AbortSignal.timeout(this.config.timeoutMs);
        const combined = AbortSignal.any([caller, timeout]);
        try {
          const headers: Record<string, string> = {
            'User-Agent': 'dsh-tool-12306/0.1.3 (anonymous railway query)',
            Accept: 'application/json, text/plain, text/html, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            Referer: `${QUERY_ORIGIN}/otn/leftTicket/init`,
          };
          const cookie = url.origin === QUERY_ORIGIN ? this.cookies.header(url) : '';
          if (cookie) headers.Cookie = cookie;
          const response = await this.fetcher(url, { headers, signal: combined, redirect: 'error' });
          if (url.origin === QUERY_ORIGIN) this.cookies.update(response.headers, url);
          if (response.status === 429) {
            this.startCooldown(response.headers.get('retry-after'));
            await response.body?.cancel();
            throw new RateLimitedError('12306 请求过于频繁，请稍后重试。');
          }
          if (!response.ok) {
            await response.body?.cancel();
            if (response.status >= 500 && attempt < this.config.maxRetries) {
              await sleep(this.config.requestIntervalMs * (attempt + 1), undefined, { signal: caller });
              continue;
            }
            throw new Upstream12306Error(`12306 查询失败（HTTP ${response.status}）。`);
          }
          return await this.readBody(response, combined);
        } catch (error) {
          caller.throwIfAborted();
          if (error instanceof RailwayError) throw error;
          if (timeout.aborted) throw new Upstream12306Error('12306 查询超时，请稍后重试。', { cause: error });
          if (attempt < this.config.maxRetries) {
            await sleep(this.config.requestIntervalMs * (attempt + 1), undefined, { signal: caller });
            continue;
          }
          throw new Upstream12306Error('无法连接 12306 查询接口，请检查网络后重试。', { cause: error });
        }
      }
      throw new Upstream12306Error('12306 查询失败。');
    } finally { void previous.then(release); }
  }
  async text(url: string | URL, signal?: AbortSignal): Promise<string> {
    this.lifetime.signal.throwIfAborted(); signal?.throwIfAborted();
    const target = new URL(url); const key = target.href;
    let flight = this.flights.get(key);
    if (!flight) {
      if (this.flights.size >= this.config.maxPendingRequests) throw new Upstream12306Error('查询队列已满，请等待已有查询完成后重试。');
      const controller = new AbortController();
      flight = { controller, promise: this.request(target, controller.signal), subscribers: 0 };
      this.flights.set(key, flight);
      const owned = flight;
      const remove = () => { if (this.flights.get(key) === owned) this.flights.delete(key); };
      void flight.promise.then(remove, remove);
    }
    const shared = flight; shared.subscribers++;
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const detach = () => {
        if (settled) return false;
        settled = true; signal?.removeEventListener('abort', aborted);
        if (--shared.subscribers === 0) {
          if (this.flights.get(key) === shared) this.flights.delete(key);
          shared.controller.abort();
        }
        return true;
      };
      const aborted = () => { if (detach()) reject(signal?.reason); };
      signal?.addEventListener('abort', aborted, { once: true });
      void shared.promise.then(value => { if (detach()) resolve(value); }, error => { if (detach()) reject(error); });
    });
  }
  async json(url: string | URL, params: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
    const target = new URL(url); target.search = params.toString();
    const text = await this.text(target, signal);
    let value: unknown;
    try { value = JSON.parse(text); }
    catch (cause) { throw new ParseError('12306 返回了非 JSON 数据，查询服务可能暂时不可用。', { cause }); }
    if (typeof value === 'object' && value !== null && 'status' in value && value.status === false) {
      throw new Upstream12306Error('12306 未接受此次查询，请检查日期和查询条件，或稍后重试。');
    }
    return value;
  }
}

/** Validate dynamically advertised query paths, without allowing upstream HTML to redirect requests. */
export function queryPath(html: string, kind: 'tickets' | 'transfer'): URL {
  const variable = kind === 'tickets' ? 'CLeftTicketUrl' : 'lc_search_url';
  const path = html.match(new RegExp(`\\b${variable}\\s*=\\s*['"]([^'"]+)['"]`))?.[1];
  if (!path) throw new ParseError(`12306 ${kind === 'tickets' ? '余票' : '中转'}查询页面未提供接口地址。`);
  const normalized = path.replace(/^\//, '').replace(/^otn\//, '');
  if (kind === 'tickets' && /^leftTicket\/query[A-Za-z]*$/.test(normalized)) return new URL(`/otn/${normalized}`, QUERY_ORIGIN);
  if (kind === 'transfer' && /^lcquery\/query[A-Za-z]*$/.test(normalized)) return new URL(`/${normalized}`, QUERY_ORIGIN);
  throw new ParseError('12306 动态查询地址不符合预期。');
}
