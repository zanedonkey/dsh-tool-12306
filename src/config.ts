import Schema from '@deepseek-ai/schemastery';
export interface Config {
  timeoutMs?: number;
  maxResults?: number;
  requestIntervalMs?: number;
  maxRetries?: number;
  maxTransferPages?: number;
  rateLimitCooldownMs?: number;
  maxResponseBytes?: number;
  maxPendingRequests?: number;
}
export const Config: Schema<Config> = Schema.object({
  timeoutMs: Schema.number().min(100).max(120000).step(1).default(15000),
  maxResults: Schema.number().min(1).max(100).step(1).default(20),
  requestIntervalMs: Schema.number().min(100).max(60000).step(1).default(1000),
  maxRetries: Schema.number().min(0).max(2).step(1).default(1),
  maxTransferPages: Schema.number().min(1).max(10).step(1).default(3),
  rateLimitCooldownMs: Schema.number().min(1000).max(3600000).step(1).default(60000),
  maxResponseBytes: Schema.number().min(1024).max(16777216).step(1).default(4194304),
  maxPendingRequests: Schema.number().min(1).max(128).step(1).default(32),
});
export type RuntimeConfig = Required<Config>;
export function normalizeConfig(config: Config = {}): RuntimeConfig {
  return Config(config) as RuntimeConfig;
}
