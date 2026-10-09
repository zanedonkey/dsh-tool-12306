import type { ValueSchemaSpec } from '@deepseek-ai/dsh-tools';
import { SEAT_TYPES, TRAIN_TYPES } from '../types.js';

const string = { type: 'string', required: true } as const;
const integer = { type: 'integer', required: true } as const;
const nullableNumber = { required: true, oneOf: [{ type: 'number' }, { type: 'null' }] } as const;
const nullableInteger = { required: true, oneOf: [{ type: 'integer' }, { type: 'null' }] } as const;
const nullableString = { required: true, oneOf: [{ type: 'string' }, { type: 'null' }] } as const;
const seat = {
  type: 'object', additionalProperties: false, required: true,
  properties: {
    available: { required: true, oneOf: [{ type: 'boolean' }, { type: 'null' }] },
    count: nullableInteger, price: nullableNumber,
    status: { type: 'string', required: true, enum: ['available', 'unavailable', 'waitlist', 'notOffered', 'unknown'] },
  },
} as const;
export const trainSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    trainCode: string, trainNo: string, fromStation: string, toStation: string,
    fromTelecode: string, toTelecode: string, departureDate: string, arrivalDate: string,
    departureTime: string, arrivalTime: string, durationMinutes: integer,
    seats: {
      type: 'object', additionalProperties: false, required: true,
      properties: {
        business: seat, specialClass: seat, firstClass: seat, secondClass: seat,
        premiumSleeper: seat, softSleeper: seat, hardSleeper: seat, softSeat: seat,
        hardSeat: seat, standing: seat, movingSleeper: seat, other: seat,
      },
    },
  },
} as const satisfies ValueSchemaSpec;
const query = {
  type: 'object', additionalProperties: false, required: true,
  properties: { date: string, from: string, to: string },
} as const;
export const ticketOutputSchema = {
  type: 'object', additionalProperties: false,
  properties: { query, trains: { type: 'array', required: true, items: trainSchema } },
} as const satisfies ValueSchemaSpec;
export const transferOutputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    query, truncated: { type: 'boolean', required: true },
    routes: {
      type: 'array', required: true,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          totalDurationMinutes: integer, transferStation: string, transferToStation: string,
          sameStation: { type: 'boolean', required: true }, transferMinutes: integer,
          firstLeg: { ...trainSchema, required: true }, secondLeg: { ...trainSchema, required: true },
          pricing: {
            type: 'object', additionalProperties: false, required: true,
            properties: {
              currency: { type: 'string', enum: ['CNY'], required: true }, lowestKnownPrice: nullableNumber,
              incomplete: { type: 'boolean', required: true }, combinationCount: integer,
              truncated: { type: 'boolean', required: true },
              combinations: {
                type: 'array', required: true,
                items: {
                  type: 'object', additionalProperties: false,
                  properties: {
                    firstSeatType: { type: 'string', enum: SEAT_TYPES, required: true },
                    secondSeatType: { type: 'string', enum: SEAT_TYPES, required: true },
                    firstPrice: nullableNumber, secondPrice: nullableNumber, totalPrice: nullableNumber,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies ValueSchemaSpec;
export const routeOutputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    trainCode: string, date: string,
    stations: {
      type: 'array', required: true,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          stationName: string, arrivalTime: nullableString, departureTime: nullableString,
          stopMinutes: nullableInteger, arrivalDayOffset: nullableInteger,
        },
      },
    },
  },
} as const satisfies ValueSchemaSpec;
export const tripParameters = {
  date: { type: 'string', required: true, description: '乘车日期 YYYY-MM-DD。相对日期按 Asia/Shanghai 当前日期换算。' },
  from: { type: 'string', required: true, description: '出发城市或明确车站中文名，例如北京、北京南。' },
  to: { type: 'string', required: true, description: '到达城市或明确车站中文名，例如上海、上海虹桥。' },
} as const;
export const filterParameters = {
  outputMode: { type: 'string', enum: ['full', 'compact'], description: '默认 full 保留完整输出；compact 精简提供给模型的文本，展示明确有票或指定席别，保留实际日期、换乘和完整 pricing。未展示的席别不代表无票；结构化结果仍完整。' },
  trainTypes: { type: 'array', items: { type: 'string', enum: TRAIN_TYPES }, description: '按车次首字母筛选：G/D/C/Z/T/K。G 与 C 分开，省略即所有车次。' },
  onlyAvailable: { type: 'boolean', description: '仅返回当前有票的车次；候补和未知票量不算有票。' },
  seatType: { type: 'string', enum: SEAT_TYPES, description: '与 onlyAvailable 一起使用指定席别；二等座为 secondClass。' },
  maxResults: { type: 'integer', description: '返回数量上限，1–100，默认由插件配置决定（20）。' },
} as const;
