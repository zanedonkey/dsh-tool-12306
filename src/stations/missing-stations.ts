import type { Station } from './store.js';
// Adapted from Joooook/12306-mcp (MIT), Copyright (c) 2025 Jok.
// This upstream supplemental entry is separate from the official 成都东 entry.
export const MISSING_STATIONS: readonly Station[] = [
  { name: '成  都东', telecode: 'WEI', city: '成都', pinyin: 'chengdudong' },
];
