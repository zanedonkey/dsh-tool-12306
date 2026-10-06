// Real AgentLoop, ToolRuntime and plugin; scripted LLM and synthetic HTTP only.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import AgentLoop from '@deepseek-ai/dsh-agent-loop';
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit';
import { createUserMessage, LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm';
import { SessionId } from '@deepseek-ai/dsh-session';
import * as Plugin from '../src/index.js';
import { fixtureFetch, midnightFetch } from './helpers.js';
class ScriptedAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = [];
  constructor(private readonly toolName: string, private readonly args: object) { super(); }
  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: model });
  }
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options);
    if (this.requests.length === 1) {
      const id = ToolCallId('rail-call'); const args = JSON.stringify(this.args);
      yield { type: 'block-start', index: 0, blockType: 'tool-call' };
      yield { type: 'tool-call-delta', index: 0, id, name: this.toolName, argumentsDelta: args };
      yield { type: 'block-end', index: 0, block: { type: 'tool-call', id, name: this.toolName, arguments: args } };
      yield { type: 'finish', reason: { kind: 'tool-calls' } };
    } else {
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: '查询完成' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: '查询完成' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    }
  }
}
const contexts: Context[] = [];
afterEach(async () => { for (const ctx of contexts.splice(0)) await ctx.fiber.dispose(); });
describe('acceptance requests through real Agent → Tool (scripted model)', () => {
  const cases = [
    { text: '查明天北京到上海的高铁。', tool: '12306_query_tickets', args: { date: '2026-10-07', from: '北京', to: '上海', trainTypes: ['G'] } },
    { text: '查上海虹桥到杭州东下午出发的车。', tool: '12306_query_tickets', args: { date: '2026-10-07', from: '上海虹桥', to: '杭州东', departureAfter: '14:00' } },
    { text: '深圳去拉萨有哪些中转方案？', tool: '12306_query_transfer', args: { date: '2026-10-07', from: '深圳', to: '拉萨' } },
    { text: 'G1经过哪些站？', tool: '12306_train_route', args: { trainCode: 'G1' } },
    { text: '查明晚23点到后天凌晨2点北京到上海的车。', tool: '12306_query_tickets', args: { date: '2026-10-07', from: '北京', to: '上海', departureAfter: '23:00', departureBefore: '02:00' } },
    { text: '查明晚出发且后天凌晨2点前到上海的车。', tool: '12306_query_tickets', args: { date: '2026-10-07', from: '北京', to: '上海', departureAfter: '23:00', arrivalBefore: '2026-10-08T02:00' } },
  ];
  it.each(cases)('$text', async ({ text, tool, args }) => {
    vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-10-06T00:00:00Z'));
    const fetcher = 'arrivalBefore' in args || 'departureBefore' in args ? midnightFetch() : fixtureFetch();
    vi.stubGlobal('fetch', fetcher);
    const ctx = new Context(); contexts.push(ctx);
    await mountAgentLoopTestDependencies(ctx); await ctx.plugin(AgentLoop, { agents: [] });
    await ctx.plugin(Plugin, { requestIntervalMs: 100 });
    const adapter = new ScriptedAdapter(tool, args); ctx.llm.registerAdapter(['scripted'], adapter);
    const agent = await ctx.agentLoop.create(SessionId(`rail-${tool}-${text.length}`), { provider: 'scripted', model: 'fixture' });
    const idle = new Promise<void>(resolve => {
      const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
        if (subject === agent && status === 'idle') { dispose(); resolve(); }
      });
    });
    agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }));
    await idle;
    const events = agent.session.snapshotEvents();
    const calls = events.filter(event => event.type === 'tool/call');
    expect(calls).toHaveLength(1); expect(calls[0]?.data.name).toBe(tool);
    const result = events.find(event => event.type === 'tool/result');
    expect(result?.data.message.isError).toBe(false);
    const content = result?.data.message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    expect(content).toBeTruthy();
    const value = JSON.parse(content ?? '{}');
    if (tool === '12306_query_tickets') expect(value.trains.length).toBeGreaterThan(0);
    if (tool === '12306_query_transfer') expect(value.routes.length).toBeGreaterThan(0);
    if (tool === '12306_train_route') expect(value.stations.length).toBeGreaterThan(1);
    if ('arrivalBefore' in args) expect(value.trains).toEqual(expect.arrayContaining([
      expect.objectContaining({ trainCode: 'G9271', arrivalDate: '2026-10-08', arrivalTime: '00:29' }),
    ]));
    if ('departureBefore' in args) {
      expect(new Set(value.trains.map((train: { departureDate: string }) => train.departureDate))).toEqual(new Set(['2026-10-07', '2026-10-08']));
      expect(fetcher.mock.calls.filter(call => String(call[0]).includes('/leftTicket/query'))).toHaveLength(2);
    }
    expect(adapter.requests).toHaveLength(2);
  });
});
