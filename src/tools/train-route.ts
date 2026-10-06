import { defineTool } from '@deepseek-ai/dsh-tools';
import type { RailwayClient } from '../client/index.js';
import { executeQuery } from './execute.js';
import { routeOutputSchema } from './schema.js';
export function trainRouteTool(client: RailwayClient) {
  return defineTool({
    name: '12306_train_route',
    description: '查询某趟中国铁路列车完整经停站、到达出发时间和停站分钟。直接提供车次如 G1，内部自动搜索 train_no。日期省略为中国当天；from/to 可截取沿途区间。',
    parameters: {
      trainCode: { type: 'string', required: true, description: '车次编号，例如 G1；无需内部 train_no 或 telecode。' },
      date: { type: 'string', description: 'YYYY-MM-DD；省略使用 Asia/Shanghai 当前日期。' },
      from: { type: 'string', description: '可选区间起点城市或具体车站。' },
      to: { type: 'string', description: '可选区间终点城市或具体车站。' },
    },
    output: { schema: routeOutputSchema, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) { return executeQuery(() => client.trainRoute(args, exec.signal)); },
  });
}
