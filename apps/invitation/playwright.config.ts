import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Invitation App UI tests.
 * Run: npx playwright test --config=apps/invitation/playwright.config.ts
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  fullyParallel: false, // Run sequentially to preserve screenshot order
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['line'],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'Mobile Chrome (iPhone 14)',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],

  // Start invitation dev server automatically (only if not already running)
  webServer: {
    command: 'npx turbo dev --filter=@wedding/invitation',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
