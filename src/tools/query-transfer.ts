import { defineTool } from '@deepseek-ai/dsh-tools';
import type { RailwayClient } from '../client/index.js';
import { executeQuery } from './execute.js';
import { tripParameters, filterParameters, transferOutputSchema } from './schema.js';
export function queryTransferTool(client: RailwayClient) {
  return defineTool({
    name: '12306_query_transfer',
    description: '查询中国铁路 12306 两程中转换乘方案，包括每程余票、总历时、等待时间及跨站换乘。可指定中转城市或车站；省略则由 12306 自动寻找。trainTypes 和 onlyAvailable 均要求两程满足；truncated 为 true 时结果仅覆盖有限分页。',
    parameters: {
      ...tripParameters, ...filterParameters,
      transferStation: { type: 'string', description: '可选中转城市或具体车站，例如西安；省略由 12306 自动寻找。' },
    },
    output: { schema: transferOutputSchema, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) { return executeQuery(() => client.queryTransfer(args, exec.signal)); },
  });
}
