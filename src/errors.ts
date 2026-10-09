export class RailwayError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
export class StationNotFoundError extends RailwayError {}
export class InvalidTravelDateError extends RailwayError {}
export class InvalidQueryError extends RailwayError {}
export class Upstream12306Error extends RailwayError {}
export class RateLimitedError extends Upstream12306Error {}
export class ParseError extends RailwayError {}
export class QueryTimeoutError extends RailwayError {}

export function publicError(error: unknown): Error {
  if (error instanceof RailwayError || (error instanceof Error && error.name === 'AbortError')) return error;
  return new Upstream12306Error('12306 查询暂时不可用，请稍后重试。', { cause: error });
}
