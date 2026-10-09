import { readFileSync } from 'node:fs';

// Both src/ and dist/ are one directory below the package manifest.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
export const PLUGIN_VERSION = manifest.version;
export const TOOL_NAMES = ['12306_query_tickets', '12306_query_transfer', '12306_train_route', '12306_plugin_info'] as const;
