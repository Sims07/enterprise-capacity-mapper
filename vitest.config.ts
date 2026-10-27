import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const repositoryRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['cypress/**', 'playwright/**'],
    alias: {
      'node:test': resolve(repositoryRoot, 'test/vitest-node-test-compat.ts'),
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        '**/*.test.*',
        'src/main.tsx',
        'src/sw.ts',
        // UI composition is validated with Playwright rather than counted as unit coverage.
        'src/App.tsx',
        'src/components/**',
        'src/adapters/react/*.tsx',
        // Static demo fixtures are data, not executable business behavior.
        'src/data/demoData.ts',
      ],
      reporter: ['text-summary', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage-unit',
    },
    passWithNoTests: false,
  },
});
