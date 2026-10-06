import { afterEach, beforeEach, vi } from 'vitest';
beforeEach(() => vi.stubGlobal('fetch', () => Promise.reject(new Error('Network disabled in default offline test suite'))));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
