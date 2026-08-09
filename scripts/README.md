# Scripts

Helper and utility scripts: environment setup, CI orchestration, report
generation/aggregation, and maintenance tasks. Keep one-off exploration
scripts out of version control.

## Emailed smoke report — sent automatically on every test run

Emailing is wired in at the Playwright level, not into any one script:
`playwright.config.ts` registers a custom reporter
(`email-reporter.js`) that runs after **every** test run finishes,
regardless of how it was started — `npx playwright test`, `npm run
test:smoke`, VS Code's Test Explorer, Task Scheduler, or CI. See
`.env.example` in the project root for SMTP config (`MAIL_TO` controls the
recipient).

- `email-reporter.js` — the Playwright reporter itself. Collects each
  test's pass/fail + duration as the run happens, then on completion zips
  the HTML report and emails it.
- `email-lib.js` — the actual "zip the report / send the email" logic,
  shared by the reporter and `send-report.js`.
- `report-lib.js` — pure report-building helpers (parses
  `reports/results.json`, builds the standalone `tekyz-smoke-report.html`).
  No test execution, no email, no network.
- `build-html-report.js` (`npm run report:html`) — rebuilds
  `reports/email-report.html` from the last run's results without
  re-running tests or sending anything.
- `send-report.js` (`npm run test:daily`) — thin, stable entry point that
  just runs the `smoke` project; kept as the documented command name for
  the scheduled task below. Emailing happens via the reporter, same as
  any other run.
- `run-daily-report.bat` — thin wrapper for Windows Task Scheduler that
  `cd`s into the project and runs `npm run test:daily`, logging output to
  `reports/daily-run.log`.

To skip emailing for a one-off local run (e.g. rapid debugging), set an
environment variable before running: `SKIP_EMAIL_REPORT=true`.

One-time setup to also run the smoke suite automatically every day at
8:00 AM (on top of emailing on every manual/VS Code run):
```
schtasks /create /tn "Tekyz QA Daily Smoke Test" /tr "\"C:\Users\MyPC\Documents\tekyz-ai-qa-agent\scripts\run-daily-report.bat\"" /sc daily /st 08:00
```
