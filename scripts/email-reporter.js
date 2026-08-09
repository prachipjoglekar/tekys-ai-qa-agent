/**
 * Custom Playwright reporter that emails the report automatically at the
 * end of EVERY test run — however it was triggered: `npx playwright test`,
 * `npm run test:smoke`, VS Code's Test Explorer, Task Scheduler, CI, etc.
 * Registered in playwright.config.ts's top-level `reporter` array, so it
 * applies to all projects.
 *
 * To skip emailing for a one-off local run (e.g. rapid debugging), set:
 *   SKIP_EMAIL_REPORT=true
 *
 * A failed email send is logged but never fails the test run itself —
 * a flaky mail server shouldn't turn a passing suite red.
 */
const { zipHtmlReport, sendEmail } = require('./email-lib');

class EmailReporter {
  constructor() {
    this.specs = [];
  }

  onTestEnd(test, result) {
    this.specs.push({
      title: test.titlePath().filter(Boolean).join(' › '),
      ok: result.status === 'passed' || result.status === 'expected',
      durationMs: result.duration || 0,
      error: result.error?.message || null,
      // test.annotations reflects everything pushed via
      // test.info().annotations.push(...) during the test (e.g. the
      // per-link results from the "All links" test), same shape as the
      // JSON reporter's output — so downstream report code can treat both
      // sources the same way regardless of how the run was triggered.
      annotations: test.annotations || [],
    });
  }

  async onEnd() {
    if (this.specs.length === 0) {
      // Nothing actually ran (e.g. a project with no test files yet) —
      // nothing meaningful to email.
      return;
    }
    if (process.env.SKIP_EMAIL_REPORT === 'true') {
      console.log('\n[email-reporter] SKIP_EMAIL_REPORT=true — not sending an email for this run.');
      return;
    }

    const passed = this.specs.filter((s) => s.ok).length;
    const failedTitles = this.specs.filter((s) => !s.ok).map((s) => s.title);
    const summary = {
      total: this.specs.length,
      passed,
      failed: failedTitles.length,
      failedTitles,
      specs: this.specs,
      parsed: true,
    };

    try {
      await zipHtmlReport();
      await sendEmail(summary);
      console.log(
        `\n[email-reporter] Report emailed to ${process.env.MAIL_TO || 'prachi@tekyz.com'} (${summary.passed}/${summary.total} passed)`
      );
    } catch (err) {
      console.error(`\n[email-reporter] Failed to send report email: ${err.message}`);
    }
  }
}

module.exports = EmailReporter;
