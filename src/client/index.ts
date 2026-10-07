import { normalizeConfig } from '../config.js';
import type { Config } from '../config.js';
import { chinaToday, validateTravelDate } from '../date.js';
import { InvalidQueryError, ParseError } from '../errors.js';
import { matchesTrain, matchesTransfer, resultLimit, ticketQueryDates, validateFilters, validateTransferFilters } from '../filters.js';
import { parseTickets } from '../parser/ticket.js';
import { parseTransfer } from '../parser/transfer.js';
import { parseRoute } from '../parser/route.js';
import { compareTransferRoutes, priceTransferRoute } from '../transfer-pricing.js';
import { parseStationScript, stationScriptUrl } from '../stations/loader.js';
import { StationResolver } from '../stations/resolver.js';
import type { ResolvedStation } from '../stations/resolver.js';
import type { TicketQuery, TicketResult, TransferQuery, TransferResult, RouteQuery, RouteResult, PricedTransferRoute } from '../types.js';
import { HttpClient, QUERY_ORIGIN, queryPath } from './http.js';
import type { Fetcher } from './http.js';
import { requestTickets } from './tickets.js';
import { requestTransferPage } from './transfer.js';
import { requestRoute } from './route.js';

function endpointMatch(code: string, resolved: ResolvedStation): boolean {
  return resolved.isCity ? resolved.candidates.some(station => station.telecode === code) : resolved.station.telecode === code;
}
export class RailwayClient {
  readonly config;
  private readonly http: HttpClient;
  private resolver: StationResolver | undefined;
  private ticketsEndpoint: URL | undefined;
  private transferEndpoint: URL | undefined;
  constructor(config: Config = {}, fetcher?: Fetcher, private readonly now: () => Date = () => new Date()) {
    this.config = normalizeConfig(config);
    this.http = new HttpClient(this.config, fetcher);
  }
  dispose(): void {
    this.http.dispose(); this.resolver = undefined; this.ticketsEndpoint = undefined; this.transferEndpoint = undefined;
  }
  async stations(signal?: AbortSignal): Promise<StationResolver> {
    signal?.throwIfAborted();
    if (!this.resolver) {
      const html = await this.http.text('https://www.12306.cn/index/', signal);
      const script = await this.http.text(stationScriptUrl(html), signal);
      this.resolver = new StationResolver(parseStationScript(script));
    }
    return this.resolver;
  }
  private async endpoint(kind: 'tickets' | 'transfer', signal?: AbortSignal): Promise<URL> {
    const cached = kind === 'tickets' ? this.ticketsEndpoint : this.transferEndpoint;
    if (cached) { signal?.throwIfAborted(); return cached; }
    const html = await this.http.text(`${QUERY_ORIGIN}/otn/${kind === 'tickets' ? 'leftTicket' : 'lcQuery'}/init`, signal);
    const endpoint = queryPath(html, kind);
    if (kind === 'tickets') this.ticketsEndpoint = endpoint; else this.transferEndpoint = endpoint;
    return endpoint;
  }
  async queryTickets(args: TicketQuery, signal?: AbortSignal): Promise<TicketResult> {
    validateTravelDate(args.date, this.now()); validateFilters(args);
    const limit = resultLimit(args.maxResults, this.config.maxResults);
    const dates = ticketQueryDates(args);
    const resolver = await this.stations(signal);
    const from = resolver.resolve(args.from); const to = resolver.resolve(args.to);
    const endpoint = await this.endpoint('tickets', signal);
    const trains = [];
    for (const date of dates) {
      const raw = await requestTickets(this.http, endpoint, date, from.station.telecode, to.station.telecode, signal);
      // Each passenger boarding date is preserved, including the second half of an overnight window.
      trains.push(...parseTickets(raw, date).filter(train => endpointMatch(train.fromTelecode, from) && endpointMatch(train.toTelecode, to) && matchesTrain(train, args)));
    }
    trains.sort((a, b) => a.departureDate.localeCompare(b.departureDate) || a.departureTime.localeCompare(b.departureTime) || a.trainCode.localeCompare(b.trainCode));
    return { query: { date: args.date, from: args.from, to: args.to }, trains: trains.slice(0, limit) };
  }
  async queryTransfer(args: TransferQuery, signal?: AbortSignal): Promise<TransferResult> {
    validateTravelDate(args.date, this.now()); validateTransferFilters(args);
    const limit = resultLimit(args.maxResults, this.config.maxResults);
    const dates = ticketQueryDates(args);
    const resolver = await this.stations(signal);
    const from = resolver.resolve(args.from); const to = resolver.resolve(args.to);
    const middle = args.transferStation !== undefined ? resolver.resolve(args.transferStation) : undefined;
    const endpoint = await this.endpoint('transfer', signal);
    let truncated = false;
    // Keep only the best bounded candidate set while scanning the configured pages.
    const best = new Map<string, PricedTransferRoute>();
    const compare = (a: PricedTransferRoute, b: PricedTransferRoute) => compareTransferRoutes(a, b, args.sortBy);
    for (const date of dates) {
      let cursor = 0;
      const cursors = new Set<number>();
      for (let page = 0; page < this.config.maxTransferPages; page++) {
        if (cursors.has(cursor)) throw new ParseError('12306 中转分页游标重复，已停止查询。');
        cursors.add(cursor);
        const raw = await requestTransferPage(this.http, endpoint, date, from.station.telecode, to.station.telecode, middle?.station.telecode ?? '', cursor, signal);
        for (const route of parseTransfer(raw)) {
          if (route.firstLeg.departureDate !== date) throw new ParseError('12306 中转方案的出发日期与请求不一致。');
          if (!endpointMatch(route.firstLeg.fromTelecode, from) || !endpointMatch(route.secondLeg.toTelecode, to)
            || (middle && !endpointMatch(route.firstLeg.toTelecode, middle))
            || !matchesTransfer(route, args)) continue;
          const key = JSON.stringify([route.firstLeg.trainNo, route.firstLeg.fromTelecode, route.firstLeg.toTelecode, route.firstLeg.departureDate,
            route.secondLeg.trainNo, route.secondLeg.fromTelecode, route.secondLeg.toTelecode, route.secondLeg.departureDate]);
          if (best.has(key)) continue;
          best.set(key, priceTransferRoute(route, args));
          if (best.size > limit) {
            truncated = true;
            const worst = [...best].sort((a, b) => compare(a[1], b[1])).at(-1)!;
            best.delete(worst[0]);
          }
        }
        if (typeof raw.data === 'string') break; // parseTransfer above already raises a domain error.
        if (raw.data.can_query === 'N') break;
        if (raw.data.can_query !== 'Y') throw new ParseError('12306 中转分页标记无法识别。');
        if (page + 1 === this.config.maxTransferPages) { truncated = true; break; }
        cursor = raw.data.result_index;
      }
    }
    const routes = [...best.values()];
    routes.sort(compare);
    return { query: { date: args.date, from: args.from, to: args.to }, routes, truncated };
  }
  async trainRoute(args: RouteQuery, signal?: AbortSignal): Promise<RouteResult> {
    const date = args.date ?? chinaToday(this.now()); validateTravelDate(date, this.now());
    // The anonymous initialization is needed even if no station resolution is requested.
    await this.endpoint('tickets', signal);
    const raw = await requestRoute(this.http, args.trainCode, date, signal);
    let stations = parseRoute(raw);
    if (args.from || args.to) {
      const resolver = await this.stations(signal);
      const from = args.from ? resolver.resolve(args.from) : undefined;
      const to = args.to ? resolver.resolve(args.to) : undefined;
      const names = (value: ResolvedStation) => new Set(value.candidates.map(station => station.name));
      const start = from ? stations.findIndex(station => names(from).has(station.stationName)) : 0;
      const end = to ? stations.findLastIndex(station => names(to).has(station.stationName)) : stations.length - 1;
      if (start < 0 || end < start) throw new InvalidQueryError('指定区间不在该车次线路内，或到达站早于出发站。');
      stations = stations.slice(start, end + 1);
    }
    return { trainCode: args.trainCode.trim().toUpperCase(), date, stations };
  }
}
