import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Step 1: authenticate once, save cookie
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
    },
    // Step 2: API-level tests (no browser needed)
    {
      name: 'api',
      testMatch: '**/api.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: 'tests/.auth/user.json',
      },
    },
    // Step 3: full browser E2E tests
    {
      name: 'e2e',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  // Global timeout for entire test suite
  timeout: 60_000,
});
