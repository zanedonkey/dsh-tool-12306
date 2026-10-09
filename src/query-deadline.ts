import { QueryTimeoutError } from './errors.js';

/** One budget for queueing, initialization, retry delays, pages and body reads. */
export async function withQueryDeadline<T>(timeoutMs: number, caller: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  caller?.throwIfAborted();
  const deadline = new AbortController();
  const signal = caller ? AbortSignal.any([caller, deadline.signal]) : deadline.signal;
  const timer = setTimeout(() => deadline.abort(new QueryTimeoutError(`12306 整次查询超过 ${timeoutMs} 毫秒，已取消剩余请求；请减少查询范围或稍后重试。`)), timeoutMs);
  let aborted!: () => void;
  const cancellation = new Promise<never>((_resolve, reject) => {
    aborted = () => reject(signal.reason);
    signal.addEventListener('abort', aborted, { once: true });
  });
  try {
    return await Promise.race([run(signal), cancellation]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', aborted);
  }
}
