import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /(?:critical-workflows|regression|mosaic-rendering|presentation-applications|presentation-print|move-capability-between-domains|add-n0-existing-map|tools-menu-layout|companion-dock-layout|pwa-update)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: /(?:mobile-navigation|mobile|tools-menu-layout)\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_COVERAGE === 'true'
      ? 'npm run preview -- --host 127.0.0.1 --port 4173 --outDir dist-coverage'
      : 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
