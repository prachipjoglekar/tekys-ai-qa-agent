import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Proof-of-concept smoke tests for tekyz.com.
 *
 * Scope: the first 8 tests from tests/test-plan.md, run against the live
 * production homepage in READ-ONLY mode only (GET requests via normal page
 * navigation — no form submissions, no state changes, no destructive checks).
 *
 * Run with Chromium via the existing "smoke" project in playwright.config.ts:
 *   npm run test:smoke
 *
 * Each test performs its own navigation so tests remain independent and can
 * be run/re-run individually without relying on shared state.
 *
 * Navigation note: this page embeds third-party iframes (a Google My Maps
 * embed and a reCAPTCHA badge) that keep background connections open, so
 * the browser's `load` and `networkidle` events are unreliable here and can
 * hang past Playwright's default timeout even though the page has fully
 * rendered. Per Playwright's own guidance, we navigate with
 * `waitUntil: 'domcontentloaded'` (fires as soon as the DOM is parsed) and
 * rely on auto-retrying web-first assertions to wait for the specific
 * content each test needs, rather than blocking on full page load.
 */

// Scope network/console checks to same-origin (tekyz.com) resources to
// avoid flaking on third-party scripts/widgets (analytics, ads, chat, fonts,
// SEO tags, etc.) that are out of scope for this site and routinely
// fail/abort or log their own errors in a fresh, cookie-less, automated
// browser context. Confirmed third parties observed on this page: Google
// Analytics/GTM, Google Ads/DoubleClick remarketing, a "jeeva.js" chat
// widget, a "clickrank.ai" SEO script, and Google Fonts.
function isSameOrigin(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('tekyz.com');
  } catch {
    return false;
  }
}

test.describe('Homepage — proof of concept smoke tests', () => {

  test('1. Homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response, 'Navigation should return a response').not.toBeNull();
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. Homepage returns a successful HTTP response', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response, 'Navigation should return a response').not.toBeNull();
    expect(
      response!.ok(),
      `Expected a 2xx status code, got ${response!.status()}`
    ).toBeTruthy();
  });

  test('3. Page title is captured', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    test.info().annotations.push({ type: 'captured-page-title', description: title });
    expect(title.trim().length, 'Page title should not be empty').toBeGreaterThan(0);
  });

  test('4. Main navigation is present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('header nav, nav').first();
    await expect(nav, 'A <nav> element should be visible in the header').toBeVisible();

    // Spot-check a few known top-level nav items from tests/test-inventory.md §2
    await expect(page.getByRole('link', { name: /^home$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /case studies/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /jobs/i }).first()).toBeVisible();
  });

  test('5. No unexpected JavaScript console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const sourceUrl = msg.location()?.url;
        // Only count errors attributable to tekyz.com's own scripts/resources
        // (or with no attributable source) — see isSameOrigin note above.
        if (!sourceUrl || isSameOrigin(sourceUrl)) {
          consoleErrors.push(`${msg.text()} (${sourceUrl || 'unknown source'})`);
        }
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`Uncaught exception: ${err.message}`);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Best-effort settle window: the map/reCAPTCHA iframes never go fully
    // idle, so don't block on networkidle — just give async console
    // activity a bounded window to surface, then move on regardless.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    if (consoleErrors.length) {
      test.info().annotations.push({
        type: 'console-errors',
        description: consoleErrors.join('\n'),
      });
    }
    expect(consoleErrors, `Console errors detected:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('6. No failed critical network requests', async ({ page }) => {
    const failures: string[] = [];

    page.on('requestfailed', (req) => {
      if (isSameOrigin(req.url())) {
        failures.push(`REQUEST FAILED: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
      }
    });
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400 && isSameOrigin(res.url())) {
        failures.push(`HTTP ${status}: ${res.url()}`);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Same rationale as test 5: bounded best-effort settle window instead
    // of blocking on networkidle, which never fires on this page.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    expect(failures, `Failed same-origin requests:\n${failures.join('\n')}`).toEqual([]);
  });

  test('7. Screenshot is captured', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const screenshotPath = path.join('reports', 'screenshots', 'homepage.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath), `Expected screenshot at ${screenshotPath}`).toBeTruthy();
  });

  // Note on item 8 ("Playwright HTML report is generated"):
  // This is not a per-test assertion — it's produced automatically by the
  // 'html' reporter already configured in playwright.config.ts for every
  // `playwright test` run. After running this file, view it with:
  //   npm run report
});
