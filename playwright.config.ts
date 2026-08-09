import { defineConfig, devices } from '@playwright/test';

/**
 * Placeholder Playwright configuration for the Tekyz AI QA & security
 * monitoring project. No tests are implemented yet — this only wires up
 * the four test projects (smoke, functional, security, regression) so
 * the structure is ready for test implementation.
 *
 * Target: https://tekyz.com (read-only testing only — see README.md).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://tekyz.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
