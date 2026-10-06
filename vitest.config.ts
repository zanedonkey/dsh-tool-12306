import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/*.test.ts'], setupFiles: ['tests/offline-setup.ts'], testTimeout: 15000 } });
