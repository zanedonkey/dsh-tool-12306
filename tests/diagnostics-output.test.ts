import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRuntime from '@deepseek-ai/dsh-tools';
import { ToolCallId } from '@deepseek-ai/dsh-llm';
import * as Plugin from '../src/index.js';
import { fixtureFetch } from './helpers.js';
import transfer from './fixtures/transfer.json' with { type: 'json' };
import { renderTickets, renderTransfer } from '../src/tools/render.js';
import { parseTickets } from '../src/parser/ticket.js';
import { parseTransfer } from '../src/parser/transfer.js';
import { priceTransferRoute } from '../src/transfer-pricing.js';
import tickets from './fixtures/tickets.json' with { type: 'json' };
const contexts: Context[] = [];
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose(); });
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
async function setup() {
  const ctx = new Context(); contexts.push(ctx);
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime);
  const original = fixtureFetch(); const fetcher = fixtureFetch();
  fetcher.mockImplementation(async (input, init) => {
    if (String(input).includes('/lcquery/query')) {
      const raw = structuredClone(transfer);
      raw.data.middleList[0]!.train_date = '2099-10-07'; raw.data.middleList[0]!.middle_date = '2099-10-08';
      return new Response(JSON.stringify(raw));
    }
    return original(input, init);
  });
  vi.stubGlobal('fetch', fetcher); await ctx.plugin(Plugin, { requestIntervalMs: 100, queryTimeoutMs: 2000 });
  return { ctx, fetcher, execute: (name: string, args: unknown) => ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('diagnostics'), name, arguments: args }) };
}
describe('runtime diagnostics and compact model output', () => {
  it('reports the loaded manifest version, capabilities and budgets without HTTP or secrets', async () => {
    const { execute, fetcher } = await setup();
    const result = await execute('12306_plugin_info', {});
    expect(result.isError).toBe(false);
    if (result.isError) throw new Error(JSON.stringify(result.content));
    expect(result.value).toMatchObject({ version, nodeVersion: process.version,
      capabilities: { transferPricing: true, compactOutput: true, queryDeadline: true }, queryTimeoutMs: 2000, requestTimeoutMs: 15000 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(result.value)).not.toMatch(/[A-Z]:[\\/]|cookie|token|password|authorization/i);
    expect(JSON.parse(result.content.filter(block => block.type === 'text').map(block => block.text).join(''))).toEqual(result.value);
  });
  it.each(['12306_query_tickets', '12306_query_transfer'])('keeps %s canonical values complete while compacting model text', async name => {
    const { execute, fetcher } = await setup();
    const args = name === '12306_query_tickets' ? { date: '2099-10-07', from: '北京', to: '上海' } : { date: '2099-10-07', from: '深圳', to: '拉萨' };
    const full = await execute(name, args); const compact = await execute(name, { ...args, outputMode: 'compact' });
    expect(full.isError).toBe(false); expect(compact.isError).toBe(false);
    if (full.isError || compact.isError) throw new Error('Unexpected tool error');
    expect(compact.value).toEqual(full.value);
    const fullText = full.content.filter(block => block.type === 'text').map(block => block.text).join('');
    const compactText = compact.content.filter(block => block.type === 'text').map(block => block.text).join('');
    expect(compactText.length).toBeLessThan(fullText.length);
    const rendered = JSON.parse(compactText);
    expect(rendered).toMatchObject({ outputMode: 'compact', pluginVersion: version });
    const train = name === '12306_query_tickets' ? rendered.trains[0] : rendered.routes[0].firstLeg;
    expect(train).not.toHaveProperty('trainNo'); expect(train).not.toHaveProperty('fromTelecode');
    expect(train).toHaveProperty('departureDate'); expect(train).toHaveProperty('arrivalDate');
    if (name === '12306_query_transfer') expect(rendered.routes[0].pricing).toEqual((full.value as { routes: { pricing: unknown }[] }).routes[0]!.pricing);
    const calls = fetcher.mock.calls.length;
    expect((await execute(name, { ...args, outputMode: 'invalid' })).isError).toBe(true);
    expect(fetcher.mock.calls).toHaveLength(calls);
    expect(fetcher.mock.calls[0]![1]!.headers).toMatchObject({ 'User-Agent': `dsh-tool-12306/${version} (anonymous railway query)` });
  });
  it('preserves requested unavailable/unknown seats, unknown fares, cross-date arrivals and truncation without mutating results', () => {
    const query = { date: '2026-10-07', from: '北京', to: '上海' };
    const train = parseTickets(tickets, query.date)[0]!;
    train.arrivalDate = '2026-10-08'; train.seats.hardSleeper = { available: null, price: null, count: null, status: 'unknown' };
    const result = { query, trains: [train] }; const snapshot = structuredClone(result);
    const compact = JSON.parse(renderTickets({ ...query, outputMode: 'compact', seatType: 'hardSleeper' }, result)[0]!.text);
    expect(compact.trains[0]).toMatchObject({ arrivalDate: '2026-10-08', seats: { hardSleeper: { available: null, price: null } } });
    expect(compact.trains[0].seats).not.toHaveProperty('premiumSleeper'); expect(result).toEqual(snapshot);
    const route = priceTransferRoute(parseTransfer(transfer)[0]!, query);
    route.pricing.lowestKnownPrice = null; route.pricing.incomplete = true; route.pricing.truncated = true;
    const transferResult = { query, routes: [route], truncated: true };
    const rendered = JSON.parse(renderTransfer({ ...query, outputMode: 'compact' }, transferResult)[0]!.text);
    expect(rendered.truncated).toBe(true); expect(rendered.routes[0].pricing).toEqual(route.pricing);
  });
});
