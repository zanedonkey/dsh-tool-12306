import { defineTool } from '@deepseek-ai/dsh-tools';
import type { RailwayClient } from '../client/index.js';
import { executeQuery } from './execute.js';
import { tripParameters, filterParameters, transferOutputSchema } from './schema.js';
export function queryTransferTool(client: RailwayClient) {
  return defineTool({
    name: '12306_query_transfer',
    description: '查询中国铁路 12306 两程中转换乘方案，包括每程余票、总历时、换乘间隔及跨站信息。可指定中转站、首程出发/末程到达窗口、最短/最长换乘间隔和仅同站换乘。跨午夜出发内部查当天及次日。trainTypes 和 onlyAvailable 均要求两程满足；有限分页内按总历时选取，truncated=true 不保证全局最优。换乘间隔不保证实际赶得上车，跨站交通需自行核对。',
    parameters: {
      ...tripParameters, ...filterParameters,
      transferStation: { type: 'string', description: '可选中转城市或具体车站，例如西安；省略由 12306 自动寻找。' },
      departureAfter: { type: 'string', description: '首程出发下限 HH:mm，锚定 date，含边界。与 departureBefore 同时给出且下限较晚时跨到次日；不筛选第二程出发时间。' },
      departureBefore: { type: 'string', description: '首程出发上限 HH:mm，含边界；小于 departureAfter 时自动为次日，否则为 date 当天。' },
      arrivalAfter: { type: 'string', description: '末程到达下限 HH:mm 或 YYYY-MM-DDTHH:mm，中国当地时间，含边界。HH:mm 锚定 date；仅筛选第二程实际到达日期时间。' },
      arrivalBefore: { type: 'string', description: '末程到达上限 HH:mm 或 YYYY-MM-DDTHH:mm，含边界。两个 HH:mm 的晚到早窗口自动跨到次日；次日或更晚到达请明确传日期。' },
      minTransferMinutes: { type: 'integer', description: '最短换乘间隔（分钟），非负整数，含边界；省略不额外限制。实际站内或跨站交通耗时需自行核对。' },
      maxTransferMinutes: { type: 'integer', description: '最长换乘间隔（分钟），非负整数，含边界；不得小于 minTransferMinutes，省略不额外限制。' },
      sameStationOnly: { type: 'boolean', description: 'true 时只返回前程到达站代码与后程出发站代码相同的方案；默认 false，允许跨站换乘。' },
    },
    output: { schema: transferOutputSchema, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) { return executeQuery(() => client.queryTransfer(args, exec.signal)); },
  });
}
