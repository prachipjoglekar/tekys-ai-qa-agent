import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Tekyz AI QA & security monitoring
 * project, targeting the live production site (read-only testing only —
 * see README.md).
 *
 * Timeout/concurrency note: a real run against tekyz.com's homepage
 * launching 4 parallel Chromium instances (Playwright's local
 * auto-detected worker count) produced timeouts across every test,
 * including one that timed out just creating the browser page — a
 * resource-contention signature, not a test-logic bug (the same
 * unmodified test file passed cleanly run serially via the CLI). The
 * homepage also loads several third-party scripts (analytics, ads, a
 * chat widget, fonts) that add real latency on cold/first-run loads.
 * `timeout` / `navigationTimeout` are raised accordingly, and local
 * worker concurrency is capped to reduce simultaneous browser launches.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://tekyz.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 45_000,
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: 'smoke',
      testDir: './tests/smoke',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'functional',
      testDir: './tests/functional',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security',
      testDir: './tests/security',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression',
      testDir: './tests/regression',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
