/**
 * Convenience entry point for running the smoke suite: npm run test:daily
 *
 * Emailing no longer lives here — every Playwright run now emails a report
 * automatically via the custom reporter wired into playwright.config.ts
 * (scripts/email-reporter.js), regardless of how it's triggered. This
 * script is kept as a stable, documented command name (and what
 * scripts/run-daily-report.bat calls for the scheduled task) but is now
 * just a thin wrapper around the smoke project.
 */
const { execSync } = require('child_process');
const path = require('path');

try {
  execSync('npx playwright test --project=smoke', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });
} catch (err) {
  // Non-zero exit here just means one or more tests failed — that's
  // already reflected in the emailed report. Mirror the exit code so a
  // scheduled task / CI step can still detect it.
  process.exitCode = 1;
}
