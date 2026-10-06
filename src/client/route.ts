import { HttpClient, QUERY_ORIGIN } from './http.js';
import { decodeRoute, decodeTrainSearch } from './validation.js';
import { InvalidQueryError, Upstream12306Error } from '../errors.js';
import type { RawRouteResponse } from '../types.js';
export async function requestRoute(http: HttpClient, code: string, date: string, signal?: AbortSignal): Promise<RawRouteResponse> {
  const trainCode = code.trim().toUpperCase();
  if (!/^[A-Z]?\d{1,5}$/.test(trainCode)) throw new InvalidQueryError(`无效车次：${code}`);
  const search = decodeTrainSearch(await http.json('https://search.12306.cn/search/v1/train/search', new URLSearchParams({
    keyword: trainCode, date: date.replaceAll('-', ''),
  }), signal));
  const matches = search.data.filter(row => row.station_train_code.toUpperCase().split('/').includes(trainCode));
  if (matches.length !== 1 || !matches[0]) throw new Upstream12306Error(`未找到唯一的 ${trainCode} 车次，请确认车次及乘车日期。`);
  return decodeRoute(await http.json(`${QUERY_ORIGIN}/otn/queryTrainInfo/query`, new URLSearchParams({
    'leftTicketDTO.train_no': matches[0].train_no, 'leftTicketDTO.train_date': date, rand_code: '',
  }), signal));
}
