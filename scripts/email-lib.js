/**
 * Email-sending logic, shared by the custom Playwright reporter
 * (email-reporter.js) so every test run emails a report automatically,
 * and by the manual npm run test:daily entry point.
 */
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
const {
  PROJECT_ROOT,
  HTML_REPORT_DIR,
  ZIP_PATH,
  computeStatus,
  writeStandaloneReport,
  buildResultsListsHtml,
  buildResultsListsText,
} = require('./report-lib');

const ENV_PATH = path.join(PROJECT_ROOT, '.env');
// Load .env by explicit path (not cwd) so this works the same regardless of
// how/where the test run was triggered from (terminal, VS Code Test
// Explorer, Task Scheduler).
require('dotenv').config({ path: ENV_PATH });

function zipHtmlReport() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(HTML_REPORT_DIR)) return resolve(false);
    const output = fs.createWriteStream(ZIP_PATH);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(true));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(HTML_REPORT_DIR, false);
    archive.finalize();
  });
}

async function sendEmail(summary) {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    const envExists = fs.existsSync(ENV_PATH);
    throw new Error(
      `Missing required email config: ${missing.join(', ')}. ` +
        `Looked for .env at: ${ENV_PATH} (${envExists ? 'file exists, but values are blank/commented' : 'file does NOT exist — create it'}). ` +
        `Copy .env.example to .env in the project root and fill in real, uncommented values.`
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const statusInfo = computeStatus(summary);
  const standaloneReportPath = writeStandaloneReport(summary, statusInfo);
  const listsHtml = buildResultsListsHtml(summary);

  const summaryLine = summary.parsed
    ? `${summary.passed} out of ${summary.total} checks passed.`
    : 'No results were found to summarize.';

  // Full readable report lives directly in the email body (not just a
  // pointer to the attachment) — some mail apps show attachment previews
  // as raw source rather than a rendered page, but the message body itself
  // always renders properly.
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 600px; color:#1f2328; line-height:1.6;">
      <h2 style="margin-bottom:4px;">Tekyz.com — Smoke Test Report</h2>
      <p style="margin-top:0; color:#57606a;">${statusInfo.dateStr}</p>
      <p style="display:inline-block; padding:6px 14px; border-radius:6px; color:#fff; font-weight:600; background:${statusInfo.statusColor};">${statusInfo.statusText}</p>
      <p>${summaryLine}</p>
      ${listsHtml}
      <p style="margin-top:24px; color:#57606a; font-size:13px;">
        A copy of this report is attached (open it in your browser). For the
        full technical/developer report, run <code>npm run report</code> on
        the project locally.
      </p>
    </div>
  `;

  // Plain-text fallback for any client that can't render HTML at all.
  const text = [
    'Tekyz.com — Smoke Test Report',
    statusInfo.dateStr,
    statusInfo.statusText,
    summaryLine,
    '',
    buildResultsListsText(summary),
  ].join('\n');

  const attachments = [];
  if (fs.existsSync(standaloneReportPath)) attachments.push({ filename: 'tekyz-smoke-report.html', path: standaloneReportPath });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.MAIL_TO || 'prachi@tekyz.com',
    subject: `Tekyz.com — Smoke Test Report — ${statusInfo.dateStr} — ${statusInfo.statusText}`,
    html,
    text,
    attachments,
  });
}

module.exports = { zipHtmlReport, sendEmail, ENV_PATH };
