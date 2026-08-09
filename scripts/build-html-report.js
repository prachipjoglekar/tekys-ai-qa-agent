/**
 * Regenerates the human-readable HTML report (reports/email-report.html)
 * from the most recent reports/results.json — without re-running the
 * tests and without sending any email. Useful for previewing the report
 * or rebuilding it after tests were run some other way (e.g. from VS
 * Code's Test Explorer).
 *
 * Usage:
 *   npm run report:html
 */
const { parseResults, computeStatus, writeStandaloneReport, STANDALONE_REPORT_PATH } = require('./report-lib');

const summary = parseResults();
if (!summary.parsed) {
  console.error('No reports/results.json found — run the smoke tests first (npm run test:smoke).');
  process.exitCode = 1;
} else {
  const statusInfo = computeStatus(summary);
  writeStandaloneReport(summary, statusInfo);
  console.log(`Report written to ${STANDALONE_REPORT_PATH}`);
  console.log(`Result: ${statusInfo.statusText}`);
}
