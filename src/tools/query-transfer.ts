import { defineTool } from '@deepseek-ai/dsh-tools';
import type { RailwayClient } from '../client/index.js';
import { executeQuery } from './execute.js';
import { tripParameters, filterParameters, transferOutputSchema } from './schema.js';
import { SEAT_TYPES } from '../types.js';
export function queryTransferTool(client: RailwayClient) {
  return defineTool({
    name: '12306_query_transfer',
    description: '查询中国铁路 12306 两程中转换乘方案，包括余票、历时、换乘间隔、跨站信息和当前有票席别组合。可分别指定两程席别、首程出发/末程到达窗口及换乘限制。跨午夜出发内部查两天。默认按总历时选取，也可按已知组合票价排序；未知价格为 null，价格不完整可能存在更便宜的未知组合。trainTypes 和 onlyAvailable 要求两程满足。有限分页不保证全局最优，不提供订票，换乘交通需自行核对。',
    parameters: {
      ...tripParameters, ...filterParameters,
      seatType: { ...filterParameters.seatType, description: '两程共同的席别偏好；firstSeatType/secondSeatType 分别覆盖对应程。onlyAvailable=true 时筛选余票；也用于当前有票组合推荐。' },
      firstSeatType: { type: 'string', enum: SEAT_TYPES, description: '第一程席别偏好，例如 secondClass；覆盖该程的 seatType，省略回退 seatType。与 onlyAvailable=true 一起使用时要求第一程此席别有票。' },
      secondSeatType: { type: 'string', enum: SEAT_TYPES, description: '第二程席别偏好，例如 hardSleeper；覆盖该程的 seatType，省略回退 seatType。与 onlyAvailable=true 一起使用时要求第二程此席别有票。' },
      sortBy: { type: 'string', enum: ['duration', 'price'], description: '默认 duration 按总历时排序；price 按符合席别偏好的当前有票组合中最低已知票价排序，无已知合计的路线排最后，同价按历时。仅比较有限分页，incomplete=true 时不保证实际最低价。' },
      maxSeatCombinations: { type: 'integer', description: '每条路线展示的有票席别组合数，1–20，默认 5；已知合计优先并按价格升序，未知合计排后。pricing.truncated 只表示组合列表被截断，不影响最低已知票价计算。' },
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
