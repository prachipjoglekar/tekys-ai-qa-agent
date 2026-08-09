/**
 * Shared helpers for building the human-readable smoke-test report.
 * Pure file/parsing logic only — no test execution, no network, no email.
 * Used by both send-report.js (full run + email) and build-html-report.js
 * (just rebuild the HTML report from the last results.json, e.g. to
 * preview it without waiting on SMTP).
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESULTS_JSON = path.join(PROJECT_ROOT, 'reports', 'results.json');
const HTML_REPORT_DIR = path.join(PROJECT_ROOT, 'reports', 'html');
const ZIP_PATH = path.join(PROJECT_ROOT, 'reports', 'html-report.zip');
const SCREENSHOT_PATH = path.join(PROJECT_ROOT, 'reports', 'screenshots', 'homepage.png');
const STANDALONE_REPORT_PATH = path.join(PROJECT_ROOT, 'reports', 'email-report.html');

// Recursively walk the Playwright JSON reporter's suite tree to collect
// pass/fail titles + durations, since results can be nested several suites
// deep. depth 0 is always the file-level suite (e.g. "smoke\homepage.spec.ts")
// — its title is intentionally NOT included in the path, since that's the
// noisy file-path text we don't want showing up in the report. Describe
// blocks (depth 1+) ARE included, since those already read like a section
// name (e.g. "Homepage — proof of concept smoke tests").
function collectSpecs(suite, path_ = [], out = [], depth = 0) {
  const title = depth === 0 ? path_ : suite.title ? [...path_, suite.title] : path_;
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      const lastResult = (test.results || []).slice(-1)[0];
      const outcome = test.status || lastResult?.status;
      out.push({
        title: [...title, spec.title].filter(Boolean).join(' › '),
        ok: outcome === 'expected' || outcome === 'passed',
        durationMs: lastResult?.duration ?? 0,
        error: lastResult?.error?.message || null,
        annotations: test.annotations || lastResult?.annotations || [],
      });
    }
  }
  for (const child of suite.suites || []) {
    collectSpecs(child, title, out, depth + 1);
  }
  return out;
}

function parseResults() {
  if (!fs.existsSync(RESULTS_JSON)) {
    return { total: 0, passed: 0, failed: 0, failedTitles: [], specs: [], parsed: false };
  }
  const raw = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
  const specs = (raw.suites || []).flatMap((s) => collectSpecs(s));
  const passed = specs.filter((s) => s.ok).length;
  const failedTitles = specs.filter((s) => !s.ok).map((s) => s.title);
  return {
    total: specs.length,
    passed,
    failed: failedTitles.length,
    failedTitles,
    specs,
    durationMs: raw.stats?.duration,
    parsed: true,
  };
}

// Overall headline + a color for the badge, derived once so the email body
// and the standalone report always agree with each other.
function computeStatus(summary) {
  const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  if (!summary.parsed) {
    return { dateStr, statusText: "Couldn't check — no results found", statusColor: '#9a6700' };
  }
  if (summary.failed > 0) {
    const phrase = summary.failed === 1 ? '1 problem that needs attention' : `${summary.failed} problems that need attention`;
    return { dateStr, statusText: `We found ${phrase}`, statusColor: '#cf222e' };
  }
  return { dateStr, statusText: 'Everything is working correctly', statusColor: '#1a7f37' };
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Live test runs (email-reporter.js, via test.titlePath()) and the JSON
// results file (collectSpecs above) can both still end up with a leading
// project-name / file-path segment depending on the Playwright version and
// how the title was assembled — e.g. "smoke", "tests\smoke\homepage.spec.ts".
// Strip any such leading segments defensively so the report never shows raw
// file paths, regardless of which code path produced the title.
const KNOWN_PROJECT_NAMES = new Set(['smoke', 'functional', 'security', 'regression']);

function looksLikeFilePathOrProjectName(segment) {
  if (!segment) return true;
  if (KNOWN_PROJECT_NAMES.has(segment)) return true;
  if (/[\\/]/.test(segment)) return true; // contains a path separator
  if (/\.(ts|js|tsx|jsx)$/i.test(segment)) return true; // ends like a source file
  return false;
}

// Turns a raw title (e.g. "smoke › tests\smoke\homepage.spec.ts › Homepage —
// proof of concept smoke tests › 8. \"Launch 1st\" nav link leads to real
// content, not a broken page") into the section/label form used in the
// report: "Homepage — proof of concept smoke tests › 8. \"Launch 1st\" nav
// link leads to real content, not a broken page" — i.e. strip the leading
// noise, keep the descriptive section name and test description as-is.
function cleanTitle(rawTitle) {
  const parts = String(rawTitle)
    .split('›')
    .map((p) => p.trim())
    .filter(Boolean);
  let i = 0;
  while (i < parts.length - 1 && looksLikeFilePathOrProjectName(parts[i])) i++;
  return parts.slice(i).join(' › ');
}

// Playwright error messages come through with ANSI color codes (for
// terminal output) and, for assertion failures, a verbose diff block after
// a blank line. Strip the color codes and keep only the first paragraph —
// for the custom, human-written assertion messages used throughout this
// suite (e.g. "Broken links found on the homepage:\n...") that first
// paragraph IS the whole readable message; the diff block after it is
// developer-only noise.
function stripAnsi(str) {
  return String(str).replace(/\[[0-9;]*m/g, '');
}

function summarizeError(rawError) {
  if (!rawError) return '';
  const clean = stripAnsi(rawError).trim();
  return clean.split(/\n\s*\n/)[0].trim();
}

// Per-link check failures (see extractLinkChecks below) can carry a raw
// error straight from a failed HTTP request (e.g. a low-level TLS error
// with a multi-line "Call log" attached) rather than one of our own
// human-written assertion messages. Keep just the first line so the report
// stays readable — the full call log is developer-only noise.
function summarizeLinkDetail(rawDetail) {
  if (!rawDetail) return '';
  const clean = stripAnsi(rawDetail).trim();
  return clean.split('\n')[0].trim();
}

// Turns a test title into just what a person needs to identify it in the
// report: no test numbers, no "smoke", no file path, no describe-block
// boilerplate. Tests that are fundamentally about one specific link (their
// title names it in quotes, e.g. `8. "Launch 1st" nav link leads to real
// content, not a broken page`) are reduced to just that link's name, e.g.
// "Launch 1st". Everything else is reduced to its plain description, e.g.
// "Homepage loads successfully".
function friendlyName(rawTitle) {
  const cleaned = cleanTitle(rawTitle);
  // Drop everything up through the last "<describe block> › N. " prefix.
  const withoutPrefix = cleaned.replace(/^.*›\s*\d+\.\s*/, '').replace(/^\d+\.\s*/, '');
  const quoted = withoutPrefix.match(/"([^"]+)"/);
  return quoted ? quoted[1] : withoutPrefix;
}

// Pulls the per-link results recorded by the "All links" test (see
// tests/smoke/homepage.spec.ts, annotation type 'link-check-results') back
// out of a spec's annotations, if present. Returns [] for specs that don't
// have any (i.e. every test other than the link checker).
function extractLinkChecks(spec) {
  const annotations = spec.annotations || [];
  const match = annotations.find((a) => a.type === 'link-check-results');
  if (!match) return [];
  try {
    return JSON.parse(match.description);
  } catch {
    return [];
  }
}

// Builds the "Failed tests:" / "Passed tests:" / "Links checked:" sections —
// the format used in both the email body and the standalone report file.
function buildResultsListsHtml(summary) {
  const specs = summary.specs || [];
  const failed = specs.filter((s) => !s.ok);
  const passed = specs.filter((s) => s.ok);
  const linkChecks = specs.flatMap((s) => extractLinkChecks(s));

  const listItems = (list) =>
    list
      .map((s) => {
        const title = `<li>${escapeHtml(friendlyName(s.title))}`;
        const errorSummary = !s.ok ? summarizeError(s.error) : '';
        const errorHtml = errorSummary
          ? `<br><span style="color:#cf222e; font-size:13px;">${escapeHtml(errorSummary)}</span>`
          : '';
        return `${title}${errorHtml}</li>`;
      })
      .join('');

  const failedSection = failed.length
    ? `<p><strong>Failed tests:</strong></p><ul>${listItems(failed)}</ul>`
    : `<p><strong>Failed tests:</strong> none</p>`;

  const passedSection = passed.length
    ? `<p><strong>Passed tests:</strong></p><ul>${listItems(passed)}</ul>`
    : `<p><strong>Passed tests:</strong> none</p>`;

  let linksSection = '';
  if (linkChecks.length) {
    const linkItems = linkChecks
      .map((l) => {
        const linkHtml = `<a href="${escapeHtml(l.url)}">${escapeHtml(l.name)}</a>`;
        return l.ok
          ? `<li>${linkHtml} — OK</li>`
          : `<li>${linkHtml} — <span style="color:#cf222e;">BROKEN (${escapeHtml(summarizeLinkDetail(l.detail))})</span></li>`;
      })
      .join('');
    linksSection = `<p><strong>Links checked:</strong></p><ul>${linkItems}</ul>`;
  }

  if (!specs.length) {
    return '<p>No results found — check reports/results.json</p>';
  }

  return `${failedSection}${passedSection}${linksSection}`;
}

function buildResultsListsText(summary) {
  const specs = summary.specs || [];
  const failed = specs.filter((s) => !s.ok);
  const passed = specs.filter((s) => s.ok);
  const linkChecks = specs.flatMap((s) => extractLinkChecks(s));

  const lines = [];
  lines.push('Failed tests:');
  if (failed.length) {
    for (const s of failed) {
      lines.push(`- ${friendlyName(s.title)}`);
      const errorSummary = summarizeError(s.error);
      if (errorSummary) {
        for (const errLine of errorSummary.split('\n')) lines.push(`    ${errLine}`);
      }
    }
  } else {
    lines.push('- none');
  }
  lines.push('');
  lines.push('Passed tests:');
  lines.push(...(passed.length ? passed.map((s) => `- ${friendlyName(s.title)}`) : ['- none']));

  if (linkChecks.length) {
    lines.push('');
    lines.push('Links checked:');
    for (const l of linkChecks) {
      const status = l.ok ? 'OK' : `BROKEN (${summarizeLinkDetail(l.detail)})`;
      lines.push(`- [${l.name}](${l.url}) — ${status}`);
    }
  }

  return lines.join('\n');
}

// Builds one self-contained HTML page (Failed/Passed lists + embedded
// screenshot as a base64 data URI) — meant to be opened directly in a
// browser and read like a normal webpage.
function buildStandaloneHtmlReport(summary, { dateStr, statusText, statusColor }) {
  const listsHtml = buildResultsListsHtml(summary);

  let screenshotHtml = '';
  if (fs.existsSync(SCREENSHOT_PATH)) {
    const b64 = fs.readFileSync(SCREENSHOT_PATH).toString('base64');
    screenshotHtml = `
      <h2>What the homepage looks like right now</h2>
      <img src="data:image/png;base64,${b64}" alt="tekyz.com homepage screenshot" style="max-width:100%; border:1px solid #d0d7de; border-radius:6px;" />`;
  }

  const summaryLine = summary.parsed
    ? `${summary.passed} out of ${summary.total} checks passed.`
    : `No results were found to summarize.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Tekyz.com — Smoke Test Report — ${escapeHtml(dateStr)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1f2328; line-height: 1.6; }
  h1 { font-size: 22px; }
  h2 { font-size: 16px; margin-top: 32px; }
  .status { display: inline-block; padding: 6px 14px; border-radius: 6px; color: #fff; font-weight: 600; background: ${statusColor}; }
  ul { padding-left: 20px; }
  li { padding: 4px 0; font-size: 15px; }
</style>
</head>
<body>
  <h1>Tekyz.com — Smoke Test Report</h1>
  <p><strong>Date:</strong> ${escapeHtml(dateStr)}</p>
  <p class="status">${escapeHtml(statusText)}</p>
  <p>${escapeHtml(summaryLine)}</p>
  ${listsHtml}
  ${screenshotHtml}
</body>
</html>`;
}

function writeStandaloneReport(summary, statusInfo) {
  const html = buildStandaloneHtmlReport(summary, statusInfo);
  fs.writeFileSync(STANDALONE_REPORT_PATH, html, 'utf-8');
  return STANDALONE_REPORT_PATH;
}

module.exports = {
  PROJECT_ROOT,
  RESULTS_JSON,
  HTML_REPORT_DIR,
  ZIP_PATH,
  SCREENSHOT_PATH,
  STANDALONE_REPORT_PATH,
  parseResults,
  computeStatus,
  cleanTitle,
  friendlyName,
  summarizeError,
  summarizeLinkDetail,
  extractLinkChecks,
  buildResultsListsHtml,
  buildResultsListsText,
  writeStandaloneReport,
};
