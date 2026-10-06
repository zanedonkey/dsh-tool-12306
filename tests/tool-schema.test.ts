import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import { ToolCallId } from '@deepseek-ai/dsh-llm';
import * as Plugin from '../src/index.js';
import { fixtureFetch, midnightFetch } from './helpers.js';
const contexts: Context[] = [];
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose(); });
async function setup() {
  const ctx = new Context(); contexts.push(ctx);
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime);
  vi.stubGlobal('fetch', fixtureFetch());
  return ctx;
}
describe('real Harness ToolRuntime', () => {
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
  it('registers exactly three model-visible tools and unregisters on unload', async () => {
    const ctx = await setup(); const fiber = ctx.plugin(Plugin, { requestIntervalMs: 100 }); await fiber;
    const names = ['12306_query_tickets', '12306_query_transfer', '12306_train_route'];
    expect(ctx.tools.schemas().map(tool => tool.name)).toEqual(names);
    expect((await ctx.systemPrompt.assemble()).tools.map(tool => tool.name)).toEqual(names);
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
