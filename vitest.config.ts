import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['cypress/**', 'playwright/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.*', 'src/main.tsx', 'src/sw.ts'],
      reporter: ['text-summary', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage-unit',
    },
    passWithNoTests: false,
  },
  test: {
    alias: {
      'node:test': resolve(__dirname, 'test/vitest-node-test-compat.ts'),
    },
  },
});
