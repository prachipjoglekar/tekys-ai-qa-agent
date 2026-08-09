import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Proof-of-concept smoke tests for tekyz.com.
 *
 * Scope: the first 8 tests from tests/test-plan.md, plus an added 9th test
 * that checks every link found on the homepage, run against the live
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

    // Check every top-level item in the main nav bar (Home, Services, Our
    // Work, Case Studies, Jobs, About Us, Blog, Media, Launch 1st) plus the
    // "Free Consultation" CTA — not just a spot-check of a few of them.
    const topLevelNavItems = [
      /^home$/i,
      /^services$/i,
      /our work/i,
      /case studies/i,
      /^jobs$/i,
      /about us/i,
      /^blog$/i,
      /^media$/i,
      /launch 1st/i,
      /free consultation/i,
    ];
    for (const name of topLevelNavItems) {
      await expect(
        page.getByRole('link', { name }).first(),
        `Nav item matching ${name} should be visible`
      ).toBeVisible();
    }
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

  // Added after a live check found https://launch1st.tekyz.com (linked from
  // the main nav as "Launch 1st") rendering a WordPress "Nothing here" /
  // not-found page instead of real content — a genuine production issue,
  // not a test artifact. This test pins that down: it should FAIL for as
  // long as that subdomain is broken, and start passing again once it's
  // fixed.
  test('8. "Launch 1st" nav link leads to real content, not a broken page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const launch1stLink = page.getByRole('link', { name: /launch 1st/i }).first();
    await expect(launch1stLink, '"Launch 1st" nav link should be visible').toBeVisible();

    const href = await launch1stLink.getAttribute('href');
    expect(href, '"Launch 1st" nav link should have an href').toBeTruthy();

    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `Expected a 2xx response from ${href}, got ${response?.status()}`).toBeTruthy();

    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    const looksLikeNotFoundPage =
      bodyText.includes('nothing here') ||
      /it seems we can.?t find what you.?re looking for/.test(bodyText);
    expect(
      looksLikeNotFoundPage,
      `${href} appears to be showing a "not found" page ("Nothing here...") instead of real content.`
    ).toBeFalsy();
  });

  // Checks every link found on the homepage (header nav + submenus, footer,
  // body content, social icons) — not just the hand-picked ones in tests 4
  // and 8. Uses lightweight HTTP requests (the `request` fixture) instead
  // of full page navigations for each link, since looping page.goto() over
  // dozens of URLs would be slow and prone to the navigation timeouts we've
  // seen elsewhere on this network.
  //
  // Records a result for EVERY link checked (name, URL, and pass/fail with
  // the reason) as a test annotation, not just an aggregate pass/fail — so
  // the emailed report can list each link individually by name, e.g.
  // "[Case Studies](https://tekyz.com/case-studies/)", instead of only
  // surfacing the ones that failed.
  //
  // Scope note: this covers links reachable from the homepage. A full
  // site-wide crawl (following links across every page) would be a heavier,
  // slower check better suited to the regression suite, not this smoke test.
  test('9. All links on the homepage return a valid response (no broken links)', async ({ page, request }) => {
    // A real site can easily have 40-60+ links on the homepage (nav,
    // submenus, footer, socials). Checking each one individually is slow
    // enough that the default 60s test timeout isn't a fair budget for this
    // specific test, and checking them one at a time in sequence made things
    // worse (a single slow/hanging link could burn most of the budget by
    // itself). Give this test more time, and check links concurrently
    // (bounded, so we don't hammer the server) instead of sequentially.
    test.setTimeout(120_000);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Capture the visible link text (its "name", e.g. "Case Studies") along
    // with the href — not just the href — so failures and the report can
    // both refer to links the way a person reading the nav bar would. Some
    // links (the logo, social icons) have no text of their own — an image
    // with alt text, or an aria-label — so fall back to those too.
    // Exclude the Google Translate widget's language picker — it injects
    // 100+ "#" links (one per language), which aren't real site navigation
    // and would drown out the actual nav/content links in the report.
    const rawLinks = await page.locator('a[href]').evaluateAll((links) =>
      links
        .filter((a) => !a.closest('[id*="google_translate" i], [class*="goog-te" i]'))
        .map((a) => {
          const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
          const imgAlt = a.querySelector('img')?.getAttribute('alt')?.trim() || '';
          const ariaLabel = a.getAttribute('aria-label')?.trim() || '';
          return { name: text || imgAlt || ariaLabel, href: a.getAttribute('href') };
        })
    );

    // The site's Google-Translate-style language picker renders ~100 plain
    // "#" links (one per language) directly in the page HTML rather than
    // inside a container we can reliably select — so filter them out by
    // name instead, using the fixed, well-known language list that widget
    // uses. These aren't real site navigation and would otherwise drown out
    // the actual nav/content links in the report.
    const translateWidgetLanguages = new Set([
      'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque', 'Belarusian',
      'Bengali', 'Bosnian', 'Bulgarian', 'Catalan', 'Cebuano', 'Chichewa', 'Chinese (Simplified)',
      'Chinese (Traditional)', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Esperanto',
      'Estonian', 'Filipino', 'Finnish', 'French', 'Frisian', 'Galician', 'Georgian', 'German', 'Greek',
      'Gujarati', 'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew', 'Hindi', 'Hmong', 'Hungarian',
      'Icelandic', 'Igbo', 'Indonesian', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kazakh',
      'Khmer', 'Korean', 'Kurdish (Kurmanji)', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lithuanian',
      'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Maori', 'Marathi',
      'Mongolian', 'Myanmar (Burmese)', 'Nepali', 'Norwegian', 'Pashto', 'Persian', 'Polish', 'Portuguese',
      'Punjabi', 'Romanian', 'Russian', 'Samoan', 'Scottish Gaelic', 'Serbian', 'Sesotho', 'Shona',
      'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sundanese', 'Swahili', 'Swedish',
      'Tajik', 'Tamil', 'Telugu', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Welsh',
      'Xhosa', 'Yiddish', 'Yoruba', 'Zulu',
    ]);

    const skipPrefixes = ['mailto:', 'tel:', 'javascript:'];
    // Same-page anchors like href="#services" aren't separate pages to
    // request over HTTP — they're jumps to a section on THIS page. A bare
    // href="#" (no id) is typically a JS-driven dropdown toggle (e.g. the
    // "Blog"/"Media" menu headers), not a real destination either. Both get
    // checked differently below: real anchors are verified against the
    // page's own element IDs; bare "#" toggles are recorded as OK menu
    // controls without any request.
    const pageAnchorsById = new Map<string, string>();
    const menuToggleNames = new Set<string>();
    // Dedupe cross-page links by resolved absolute URL. Prefer the first
    // *non-empty* name seen for a given URL (nav links appear before
    // repeated footer/body links in DOM order, so this naturally prefers
    // the more recognizable nav label — while still letting a later link
    // supply a name if the first occurrence had none, e.g. an image-only
    // logo link followed by a text "Home" link to the same URL).
    const linksByUrl = new Map<string, string>();
    for (const { name, href } of rawLinks) {
      if (!href) continue;
      if (skipPrefixes.some((p) => href.startsWith(p))) continue;
      if (translateWidgetLanguages.has(name)) continue;

      if (href.startsWith('#')) {
        const id = href.slice(1);
        if (id) {
          const existingName = pageAnchorsById.get(id);
          if (existingName === undefined || (!existingName && name)) {
            pageAnchorsById.set(id, name);
          }
        } else if (name) {
          menuToggleNames.add(name);
        }
        continue;
      }

      try {
        const absoluteUrl = new URL(href, 'https://tekyz.com/').toString();
        const existing = linksByUrl.get(absoluteUrl);
        if (existing === undefined) {
          linksByUrl.set(absoluteUrl, name);
        } else if (!existing && name) {
          linksByUrl.set(absoluteUrl, name);
        }
      } catch {
        // Not a parsable URL — skip rather than fail the whole test over a
        // malformed href attribute.
      }
    }

    // Some external platforms (LinkedIn especially) block non-browser/bot
    // requests with 4xx codes — or, in LinkedIn's case, its own non-standard
    // "999" anti-scraping status — even when the link itself is perfectly
    // valid. For known third-party domains, only treat a genuine 5xx
    // (500-599) as a real failure.
    const lenientHosts = ['linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com'];
    const isLenientHost = (url: string) => {
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return lenientHosts.some((h) => host.endsWith(h));
      } catch {
        return false;
      }
    };

    type LinkResult = { name: string; url: string; ok: boolean; detail: string; order: number };
    const results: LinkResult[] = [];
    // Assign each item a place in the combined "order" list matching first
    // appearance in rawLinks, so results (which finish concurrently, out of
    // order) can be sorted back into page reading order afterwards.
    let orderCounter = 0;
    const orderFor = (key: string, seen: Map<string, number>) => {
      if (!seen.has(key)) seen.set(key, orderCounter++);
      return seen.get(key)!;
    };
    const urlOrder = new Map<string, number>();
    const anchorOrder = new Map<string, number>();
    const toggleOrder = new Map<string, number>();
    for (const { href } of rawLinks) {
      if (!href || skipPrefixes.some((p) => href.startsWith(p))) continue;
      if (href.startsWith('#')) {
        const id = href.slice(1);
        if (id && pageAnchorsById.has(id)) orderFor(id, anchorOrder);
        continue;
      }
      try {
        const absoluteUrl = new URL(href, 'https://tekyz.com/').toString();
        if (linksByUrl.has(absoluteUrl)) orderFor(absoluteUrl, urlOrder);
      } catch {
        // ignore, already skipped above
      }
    }
    for (const name of menuToggleNames) orderFor(name, toggleOrder);

    // Check links concurrently, capped at a handful in flight at once —
    // fast enough to fit the test budget without opening so many
    // connections at once that we look like a mini denial-of-service test.
    const CONCURRENCY = 8;
    const entries = Array.from(linksByUrl.entries()); // [url, name][]

    async function checkOne(url: string, name: string) {
      try {
        const response = await request.get(url, { timeout: 15000, maxRedirects: 5 });
        const status = response.status();
        const ok = isLenientHost(url) ? !(status >= 500 && status <= 599) : status < 400;
        results.push({ name: name || url, url, ok, detail: `HTTP ${status}`, order: urlOrder.get(url)! });
      } catch (err) {
        results.push({ name: name || url, url, ok: false, detail: (err as Error).message, order: urlOrder.get(url)! });
      }
    }

    let nextIndex = 0;
    async function worker() {
      while (nextIndex < entries.length) {
        const [url, name] = entries[nextIndex++];
        await checkOne(url, name);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));

    // Same-page anchors (href="#services" etc.) aren't HTTP requests — verify
    // an element with that id actually exists on the page. A missing target
    // means clicking that nav item does nothing, which is just as broken as
    // a 404 from a person's point of view.
    for (const [id, name] of pageAnchorsById) {
      const displayUrl = `https://tekyz.com/#${id}`;
      // Use an attribute selector rather than "#id" so this doesn't need a
      // browser-only CSS.escape() call (this runs in Node, not the page).
      const targetCount = await page.locator(`[id="${id}"]`).count();
      results.push({
        name: name || displayUrl,
        url: displayUrl,
        ok: targetCount > 0,
        detail: targetCount > 0 ? 'section found on page' : `no element with id="${id}" found on the page`,
        order: anchorOrder.get(id)!,
      });
    }

    // Bare "#" links (no id) are menu/dropdown toggles, not real
    // destinations — record them as OK without making any request.
    for (const name of menuToggleNames) {
      results.push({
        name,
        url: 'https://tekyz.com/ (menu toggle)',
        ok: true,
        detail: 'menu toggle, not a page link',
        order: toggleOrder.get(name)!,
      });
    }

    // Sort back into page reading order (worker completion order above is
    // nondeterministic) so the report lists links the way a person reading
    // the page top-to-bottom would encounter them.
    results.sort((a, b) => a.order - b.order);

    test.info().annotations.push({ type: 'link-check-results', description: JSON.stringify(results) });

    const failures = results.filter((r) => !r.ok);
    expect(
      failures,
      `Broken links found on the homepage:\n${failures.map((f) => `${f.name} (${f.url}) — ${f.detail}`).join('\n')}`
    ).toEqual([]);
  });

  // Note on Playwright HTML report generation:
  // This is not a per-test assertion — it's produced automatically by the
  // 'html' reporter already configured in playwright.config.ts for every
  // `playwright test` run. After running this file, view it with:
  //   npm run report
});
