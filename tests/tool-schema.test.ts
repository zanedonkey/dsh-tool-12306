import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import { ToolCallId } from '@deepseek-ai/dsh-llm';
import * as Plugin from '../src/index.js';
import { fixtureFetch, midnightFetch } from './helpers.js';
import transfer from './fixtures/transfer.json' with { type: 'json' };
import type { RawTransferRoute } from '../src/types.js';
const contexts: Context[] = [];
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose(); });
async function setup() {
  const ctx = new Context(); contexts.push(ctx);
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime);
  vi.stubGlobal('fetch', fixtureFetch());
  return ctx;
}
describe('real Harness ToolRuntime', () => {
  it('accepts mixed-leg seat preferences, price sorting and bounded combinations through native schemas', async () => {
    const ctx = await setup(); const original = fixtureFetch(); const fetcher = fixtureFetch();
    fetcher.mockImplementation(async (input, init) => {
      if (String(input).includes('/lcquery/query')) {
        const raw = structuredClone(transfer); const route: RawTransferRoute = raw.data.middleList[0]!;
        route.train_date = '2099-10-07'; route.middle_date = '2099-10-08';
        route.fullList[0]!.yp_info = 'O004250001';
        route.fullList[1]!.ze_num = '无'; route.fullList[1]!.yw_num = '有'; route.fullList[1]!.yp_info = '3008750001';
        return new Response(JSON.stringify(raw));
      }
      return original(input, init);
    });
    vi.stubGlobal('fetch', fetcher); await ctx.plugin(Plugin, { requestIntervalMs: 100 });
    const execute = (args: unknown) => ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('transfer-prices'), name: '12306_query_transfer', arguments: args });
    const args = { date: '2099-10-07', from: '深圳', to: '拉萨', onlyAvailable: true, firstSeatType: 'secondClass', secondSeatType: 'hardSleeper', sortBy: 'price', maxSeatCombinations: 1 };
    const result = await execute(args);
    expect(result.isError).toBe(false);
    if (result.isError) throw new Error(JSON.stringify(result.content));
    expect(result.value).toMatchObject({ routes: [{ pricing: { currency: 'CNY', lowestKnownPrice: 130, incomplete: false, combinationCount: 1, truncated: false,
      combinations: [{ firstSeatType: 'secondClass', secondSeatType: 'hardSleeper', firstPrice: 42.5, secondPrice: 87.5, totalPrice: 130 }] } }] });
    expect(JSON.parse(result.content.filter(b => b.type === 'text').map(b => b.text).join(''))).toEqual(result.value);
    const calls = fetcher.mock.calls.length;
    for (const invalid of [{ firstSeatType: 'invalid' }, { sortBy: 'cheapest' }, { maxSeatCombinations: 0 }, { maxSeatCombinations: 21 }]) {
      expect((await execute({ ...args, ...invalid })).isError).toBe(true);
    }
    expect(fetcher.mock.calls).toHaveLength(calls);
    const schema = ctx.tools.schemas().find(tool => tool.name === '12306_query_transfer');
    expect(schema?.parameters).toMatchObject({ properties: {
      firstSeatType: { enum: expect.arrayContaining(['secondClass']) }, secondSeatType: { enum: expect.arrayContaining(['hardSleeper']) },
      sortBy: { enum: ['duration', 'price'] }, maxSeatCombinations: { type: 'integer' },
    } });
  });
  it('exposes transfer filters and validates their execution with canonical output', async () => {
    const ctx = await setup(); const original = fixtureFetch();
    const fetcher = fixtureFetch();
    fetcher.mockImplementation(async (input, init) => {
      if (String(input).includes('/lcquery/query')) {
        const raw = structuredClone(transfer);
        raw.data.middleList[0]!.train_date = '2099-10-07'; raw.data.middleList[0]!.middle_date = '2099-10-08';
        return new Response(JSON.stringify(raw));
      }
      return original(input, init);
    });
    vi.stubGlobal('fetch', fetcher); await ctx.plugin(Plugin, { requestIntervalMs: 100 });
    const execute = (args: unknown) => ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('transfer-filters'), name: '12306_query_transfer', arguments: args });
    const args = { date: '2099-10-07', from: '深圳', to: '拉萨', departureAfter: '16:00', departureBefore: '16:00',
      arrivalAfter: '2099-10-08T21:50', arrivalBefore: '2099-10-08T21:50', minTransferMinutes: 180, maxTransferMinutes: 180, sameStationOnly: false };
    const result = await execute(args);
    expect(result.isError).toBe(false);
    if (result.isError) throw new Error(JSON.stringify(result.content));
    expect(result.value).toMatchObject({ routes: [{ transferMinutes: 180, sameStation: false }], truncated: false });
    expect(JSON.parse(result.content.filter(b => b.type === 'text').map(b => b.text).join(''))).toEqual(result.value);
    const calls = fetcher.mock.calls.length;
    expect((await execute({ ...args, minTransferMinutes: 181 })).isError).toBe(true);
    expect((await execute({ ...args, maxTransferMinutes: 1.5 })).isError).toBe(true);
    expect((await execute({ ...args, sameStationOnly: 'true' })).isError).toBe(true);
    expect(fetcher.mock.calls).toHaveLength(calls);
    const schema = ctx.tools.schemas().find(tool => tool.name === '12306_query_transfer');
    expect(schema?.parameters.required).toEqual(['date', 'from', 'to']);
    expect(schema?.parameters).toMatchObject({ properties: {
      minTransferMinutes: { type: 'integer' }, maxTransferMinutes: { type: 'integer' }, sameStationOnly: { type: 'boolean' },
      departureAfter: { type: 'string' }, arrivalBefore: { description: expect.stringContaining('YYYY-MM-DDTHH:mm') },
    } });
  });
  it('supports one overnight call and preserves the correct next-day arrival in canonical output', async () => {
    const ctx = await setup(); const fetcher = midnightFetch(); vi.stubGlobal('fetch', fetcher);
    await ctx.plugin(Plugin, { requestIntervalMs: 100 });
    const result = await ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('midnight'), name: '12306_query_tickets', arguments: {
      date: '2099-10-07', from: '北京', to: '上海', departureAfter: '23:00', departureBefore: '02:00',
      arrivalAfter: '2099-10-08T00:00', arrivalBefore: '2099-10-08T02:00',
    } });
    expect(result.isError).toBe(false);
    if (result.isError) throw new Error(JSON.stringify(result.content));
    expect(result.value).toMatchObject({ trains: [
      { trainCode: 'G9271', departureDate: '2099-10-07', departureTime: '23:16', arrivalDate: '2099-10-08', arrivalTime: '00:29' },
      { trainCode: 'G9007' }, { trainCode: 'G9002' },
    ] });
    expect(result.value).toHaveProperty('trains.length', 3);
    expect(fetcher).toHaveBeenCalledTimes(5);
    const schema = ctx.tools.schemas().find(tool => tool.name === '12306_query_tickets');
    expect(schema?.parameters).toMatchObject({ properties: { arrivalBefore: { description: expect.stringContaining('YYYY-MM-DDTHH:mm') } } });
  });
  it('registers query tools plus local diagnostics and unregisters on unload', async () => {
    const ctx = await setup(); const fiber = ctx.plugin(Plugin, { requestIntervalMs: 100 }); await fiber;
    const names = ['12306_query_tickets', '12306_query_transfer', '12306_train_route', '12306_plugin_info'];
    expect(ctx.tools.schemas().map(tool => tool.name)).toEqual(names);
    expect((await ctx.systemPrompt.assemble()).tools.map(tool => tool.name)).toEqual([...names].sort());
    expect(ctx.tools.schemas()[0]?.parameters.required).toEqual(['date', 'from', 'to']);
    await fiber.dispose(); expect(ctx.tools.schemas()).toEqual([]);
  });
  it('validates tool input and preserves structured canonical output', async () => {
    const ctx = await setup(); await ctx.plugin(Plugin, { requestIntervalMs: 100 });
    const execute = (args: unknown) => ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('test'), name: '12306_query_tickets', arguments: args });
    expect((await execute({ from: '北京', to: '上海' })).isError).toBe(true);
    expect((await execute({ date: '2099-10-07', from: '北京', to: '上海', trainTypes: ['X'] })).isError).toBe(true);
    const result = await execute({ date: '2099-10-07', from: '北京', to: '上海', trainTypes: ['G'], onlyAvailable: true, seatType: 'secondClass' });
    expect(result.isError).toBe(false);
    if (result.isError) throw new Error(JSON.stringify(result.content));
    expect(result.value).toMatchObject({ trains: [{ trainCode: 'G1', seats: { secondClass: { count: 21, price: 553 } } }] });
    expect(JSON.parse(result.content.filter(b => b.type === 'text').map(b => b.text).join(''))).toEqual(result.value);
  });
  it('returns concise domain errors without TypeError details', async () => {
    const ctx = await setup(); await ctx.plugin(Plugin, { requestIntervalMs: 100 });
    const result = await ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('unknown'), name: '12306_query_tickets', arguments: { date: '2099-10-07', from: '北京西南', to: '上海' } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('无法识别车站：北京西南');
    expect(JSON.stringify(result.content)).not.toContain('TypeError');
  });
  it('validates plugin config and fills default values', () => {
    expect(Plugin.Config({})).toMatchObject({ timeoutMs: 15000, maxResults: 20, requestIntervalMs: 1000 });
    expect(() => Plugin.Config({ requestIntervalMs: 0 })).toThrow();
    expect(() => Plugin.Config({ maxResults: 1.5 })).toThrow();
  });
  it('declares the installable native bundle with no MCP runtime dependency', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml');
    expect(Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.devDependencies }).some(key => key.includes('modelcontextprotocol') || key.includes('mcp'))).toBe(false);
  });
});
