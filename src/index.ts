import type { Context } from '@deepseek-ai/cordis';
import { RailwayClient } from './client/index.js';
import type { Config } from './config.js';
import { queryTicketsTool } from './tools/query-tickets.js';
import { queryTransferTool } from './tools/query-transfer.js';
import { trainRouteTool } from './tools/train-route.js';
export { Config } from './config.js';
export type * from './types.js';
export const name = 'tool-12306';
export const inject = ['tools'];
export function apply(ctx: Context, config: Config = {}): void {
  const client = new RailwayClient(config);
  ctx.effect(() => () => client.dispose());
  ctx.tools.register(queryTicketsTool(client));
  ctx.tools.register(queryTransferTool(client));
  ctx.tools.register(trainRouteTool(client));
}
