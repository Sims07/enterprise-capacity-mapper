import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test as base, type Page } from '@playwright/test';

type CoverageWindow = Window & { __coverage__?: Record<string, unknown> };

async function persistCoverage(page: Page, testId: string, workerIndex: number, retry: number) {
  if (process.env.PLAYWRIGHT_COVERAGE !== 'true' || page.isClosed()) return;

  const coverage = await page.evaluate(() => {
    return (window as CoverageWindow).__coverage__ ?? null;
  }).catch(() => null);

  if (!coverage || Object.keys(coverage).length === 0) return;

  const directory = path.resolve(process.cwd(), '.nyc_output');
  await fs.mkdir(directory, { recursive: true });
  const filename = `${workerIndex}-${testId.replace(/[^a-zA-Z0-9_-]/g, '_')}-retry-${retry}.json`;
  await fs.writeFile(path.join(directory, filename), JSON.stringify(coverage));
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    await persistCoverage(page, testInfo.testId, testInfo.workerIndex, testInfo.retry);
  },
});

export { expect };
export type { Page };
