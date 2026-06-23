import { defineConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables for the test runner and webServer
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Run E2E tests sequentially to avoid database/realtime conflicts
  workers: 1,
  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:4005',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'PORT=4005 npx tsx --env-file=../../.env.test src/index.ts',
      url: 'http://localhost:4005/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'inherit',
      stderr: 'inherit',
    },
    {
      command: 'npx next dev --port 3000',
      cwd: path.resolve(__dirname, '../../apps/dashboard'),
      env: {
        NODE_ENV: 'test',
        NEXT_PUBLIC_API_URL: 'http://localhost:4005',
        NEXT_PUBLIC_WS_URL: 'http://localhost:4005',
        NEXT_PUBLIC_CDN_URL: 'http://localhost:4005',
      },
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
      stdout: 'inherit',
      stderr: 'inherit',
    },
    {
      command: 'npx next dev --port 3002',
      cwd: path.resolve(__dirname, '../../apps/scanner'),
      env: {
        NODE_ENV: 'test',
        NEXT_PUBLIC_API_URL: 'http://localhost:4005',
        NEXT_PUBLIC_WS_URL: 'http://localhost:4005',
        NEXT_PUBLIC_CDN_URL: 'http://localhost:4005',
      },
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
      stdout: 'inherit',
      stderr: 'inherit',
    },
    {
      command: 'npx next dev --port 3001',
      cwd: '/home/mochrafi/wedding-project/wedding-ecosystem-invitation',
      env: {
        NODE_ENV: 'test',
        NEXT_PUBLIC_API_URL: 'http://localhost:4005',
        NEXT_PUBLIC_WS_URL: 'http://localhost:4005',
        NEXT_PUBLIC_CDN_URL: 'http://localhost:4005',
      },
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
      stdout: 'inherit',
      stderr: 'inherit',
    },
  ],
});
