import { defineTool } from '@deepseek-ai/dsh-tools';
import type { RailwayClient } from '../client/index.js';
import { executeQuery } from './execute.js';
import { tripParameters, filterParameters, ticketOutputSchema } from './schema.js';
import { renderTickets } from './render.js';
export function queryTicketsTool(client: RailwayClient) {
  return defineTool({
    name: '12306_query_tickets',
    description: '查询中国铁路 12306 直达列车时刻和余票。直接提供城市或车站中文名，内部自动解析站代码；日期按中国时区。支持跨午夜出发窗口，内部查询当天和次日；到达筛选比较真实到达日期与时间，次日凌晨等明确日期请用 YYYY-MM-DDTHH:mm。可筛高铁和特定席别有票。只提供匿名查询。',
    parameters: {
      ...tripParameters, ...filterParameters,
      departureAfter: { type: 'string', description: '出发下限 HH:mm，锚定 date，含边界。与 departureBefore 同时给出且下限较晚时表示跨午夜，例如 23:00–02:00 查询 date 晚间至次日凌晨。' },
      departureBefore: { type: 'string', description: '出发上限 HH:mm，含边界；若小于 departureAfter，日期自动为 date 的次日，否则为 date 当天。' },
      arrivalAfter: { type: 'string', description: '到达下限，HH:mm 或 YYYY-MM-DDTHH:mm，中国当地时间，含边界。仅 HH:mm 锚定乘车 date；比较列车实际 arrivalDate + arrivalTime，不按每日时钟循环。' },
      arrivalBefore: { type: 'string', description: '到达上限，HH:mm 或 YYYY-MM-DDTHH:mm，含边界。两个 HH:mm 且下限较晚时上限自动为次日；单独的 HH:mm 为 date 当天。次日凌晨 02:00 前到达请明确传次日日期，如 2026-10-08T02:00。' },
    },
    output: { schema: ticketOutputSchema, render: renderTickets },
    async execute(args, exec) { return executeQuery(() => client.queryTickets(args, exec.signal)); },
  });
}
