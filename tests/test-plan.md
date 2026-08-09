# Test Plan — tekyz.com (Proposed, Pending Approval)

Derived from `tests/test-inventory.md`. **28 tests proposed** across 8 categories. None of these are implemented yet — this is a proposal for review.

All tests are designed to be **non-destructive**: no form submissions with real data delivery, no account creation, no write/modify actions against the production site. Where a test needs to verify a form works, it validates client-side behavior (field presence, validation messages, required-field enforcement) without completing a real submission, or it intercepts/mocks the network call in Playwright rather than hitting the live endpoint.

Priority scale: **P0** = must-have / blocks release confidence, **P1** = high value, **P2** = nice-to-have / lower risk if skipped.

---

## 1. Smoke

### SMK-01 — Homepage loads successfully
- **Purpose:** Verify the homepage is reachable and renders core content.
- **Preconditions:** None.
- **Steps:** 1) Navigate to `https://tekyz.com/`. 2) Wait for the page to finish loading.
- **Expected result:** HTTP 200. Page title contains "Bespoke Software Development". Hero heading "Tekyz Software Solutions" and the header logo are visible.
- **Priority:** P0
- **Category:** Smoke

### SMK-02 — Core pages return 200
- **Purpose:** Confirm the site's primary pages are all up.
- **Preconditions:** None.
- **Steps:** For each of `/case-studies/`, `/job-openings/`, `/blogs/`, `/privacy-policy/`, `/terms-of-use`: navigate and check response status.
- **Expected result:** All URLs return HTTP 200 with no unhandled error page.
- **Priority:** P0
- **Category:** Smoke

### SMK-03 — Header and footer render on every page
- **Purpose:** Verify global layout doesn't break per-page.
- **Preconditions:** None.
- **Steps:** 1) Visit home, `/case-studies/`, `/job-openings/`, `/blogs/`. 2) Assert header nav and footer are present on each.
- **Expected result:** Header logo, main nav, and footer links are visible on all four pages.
- **Priority:** P0
- **Category:** Smoke

### SMK-04 — Site is served over HTTPS
- **Purpose:** Baseline check that the production site loads securely.
- **Preconditions:** None.
- **Steps:** 1) Navigate to `https://tekyz.com/`. 2) Check the page URL/protocol after load.
- **Expected result:** Final URL uses `https://`, no mixed-content browser warnings.
- **Priority:** P0
- **Category:** Smoke

---

## 2. Functional

### FUNC-01 — Case Studies domain filters link correctly
- **Purpose:** Verify each business-domain filter on `/case-studies/` goes to the right sub-page.
- **Preconditions:** None.
- **Steps:** 1) Go to `/case-studies/`. 2) Click each of Health Tech, Law Enforcement Tech, Agri Tech, Prop Tech, Workflow Automation.
- **Expected result:** Each click navigates to its matching `/case-studies/{domain}/` URL with relevant content, no 404s.
- **Priority:** P1
- **Category:** Functional

### FUNC-02 — Jobs listing shows open positions and links to detail pages
- **Purpose:** Verify the job board lists roles and each links correctly.
- **Preconditions:** At least one job posting must be live.
- **Steps:** 1) Go to `/job-openings/`. 2) Confirm job cards are listed. 3) Click "More Details" on a job.
- **Expected result:** User lands on the correct `/jobs/{slug}/` detail page matching the clicked job title.
- **Priority:** P1
- **Category:** Functional

### FUNC-03 — Blog "Load More" reveals additional posts
- **Purpose:** Verify blog pagination works without a full page reload.
- **Preconditions:** Blog has more posts than the initial page size.
- **Steps:** 1) Go to `/blogs/`. 2) Note the visible post count. 3) Click "Load More".
- **Expected result:** Additional blog post cards appear; post count increases; no page navigation/reload occurs.
- **Priority:** P2
- **Category:** Functional

### FUNC-04 — "more…" links in the "How We Build" section are not dead/placeholder links
- **Purpose:** Catch the CMS-artifact issue flagged in the inventory (`#` and Elementor preview URLs).
- **Preconditions:** None.
- **Steps:** 1) On the homepage, scroll to "How We Build". 2) Inspect each "more…" link's `href`.
- **Expected result:** No `href="#"` placeholders and no `?elementor-preview=` editor URLs are exposed to visitors; each links to real, relevant content (or the element is removed if no destination exists).
- **Priority:** P1
- **Category:** Functional — *(this test is expected to fail against current production; that's the point of writing it)*

### FUNC-05 — Job application external screening link works
- **Purpose:** Verify the Google Form link on applicable job posts is valid.
- **Preconditions:** A job posting with an external screening link (e.g. AI ML Engineer) is live.
- **Steps:** 1) Go to `/jobs/ai-ml-engineer/`. 2) Locate the Google Form link. 3) Verify the link target (without submitting the external form).
- **Expected result:** Link resolves to a live `forms.gle` URL, opens without error. No data is submitted.
- **Priority:** P2
- **Category:** Functional

---

## 3. Navigation

### NAV-01 — Main nav items resolve from every page (not just home)
- **Purpose:** Directly test the anchor-link bug flagged in the inventory (`#services`, `#ourwork`, `#contactus` only work from `/`).
- **Preconditions:** None.
- **Steps:** 1) From `/case-studies/` (a non-home page), click "Services" in the nav. 2) Repeat for "Our Work" and "About Us".
- **Expected result:** Each nav item scrolls to (or navigates to) the intended section correctly, regardless of starting page.
- **Priority:** P1
- **Category:** Navigation — *(expected to currently fail per inventory findings; validates the bug)*

### NAV-02 — Case Studies and Blog dropdown submenus open and link correctly
- **Purpose:** Verify multi-level nav dropdowns function.
- **Preconditions:** None.
- **Steps:** 1) Hover/click "Case Studies" in nav, confirm submenu appears. 2) Click each submenu item. 3) Repeat for "Blog" and "Media" dropdowns.
- **Expected result:** Each submenu opens on hover/click and each item navigates to its correct destination.
- **Priority:** P1
- **Category:** Navigation

### NAV-03 — Footer links match header links where both exist
- **Purpose:** Verify consistency between header and footer nav (and catch the trailing-slash discrepancy on Jobs noted in the inventory).
- **Preconditions:** None.
- **Steps:** 1) Compare footer "Jobs" link target to header "Jobs" link target. 2) Follow both.
- **Expected result:** Both resolve to the same final page (HTTP 200), regardless of trailing slash.
- **Priority:** P2
- **Category:** Navigation

### NAV-04 — Logo click returns to homepage from any page
- **Purpose:** Standard nav sanity check.
- **Preconditions:** None.
- **Steps:** 1) From `/job-openings/`, click the header logo.
- **Expected result:** User lands on `https://tekyz.com/`.
- **Priority:** P1
- **Category:** Navigation

---

## 4. Forms

### FRM-01 — Job application form renders all required fields
- **Purpose:** Verify the application form's structure matches spec, without submitting.
- **Preconditions:** A job detail page is live (e.g. `/jobs/ai-ml-engineer/`).
- **Steps:** 1) Navigate to the job page. 2) Locate the application form. 3) Assert presence of Full Name, Email, Phone, Cover Letter, Upload CV/Resume, and the consent checkbox.
- **Expected result:** All fields are present and marked required (`*`) as documented in the inventory.
- **Priority:** P0
- **Category:** Forms

### FRM-02 — Job application form enforces required-field validation
- **Purpose:** Verify client-side validation blocks incomplete submissions (without sending a real one).
- **Preconditions:** Same as FRM-01.
- **Steps:** 1) Leave all fields empty. 2) Attempt to submit. 3) Observe validation state.
- **Expected result:** Submission is blocked client-side; validation messages appear on required fields; **no network request that would deliver data is allowed to complete** (assert via route interception).
- **Priority:** P0
- **Category:** Forms

### FRM-03 — Resume upload only accepts allowed file types
- **Purpose:** Verify the file-type restriction (`.pdf`, `.doc`, `.docx`) documented in the inventory is enforced.
- **Preconditions:** Same as FRM-01. Requires test fixture files in `test-data/` (e.g. a `.txt` and a valid `.pdf`).
- **Steps:** 1) Attempt to attach a disallowed file type (e.g. `.txt`). 2) Attempt to attach an allowed type (e.g. `.pdf`).
- **Expected result:** Disallowed type is rejected (client-side) or flagged; allowed type is accepted into the field. Test stops short of final submission.
- **Priority:** P1
- **Category:** Forms

### FRM-04 — Consultation "Schedule Now" control is present and interactive
- **Purpose:** Baseline coverage for the one CTA whose behavior is unconfirmed (flagged in inventory as needing live confirmation).
- **Preconditions:** None.
- **Steps:** 1) Locate "Schedule Now" in the contact widget. 2) Click it. 3) Observe resulting UI change (modal, embedded widget, or navigation).
- **Expected result:** Some scheduling UI appears/loads without a JS error. *(Exact expected behavior to be refined once live behavior is confirmed — see inventory gap #8.)*
- **Priority:** P1
- **Category:** Forms

---

## 5. Network / API

### API-01 — No failed (4xx/5xx) requests during a normal homepage visit
- **Purpose:** Catch broken asset/API references during a standard page load.
- **Preconditions:** None.
- **Steps:** 1) Open a fresh browser context. 2) Navigate to `/`. 3) Record all network responses until the page is idle.
- **Expected result:** No 4xx/5xx responses for same-origin requests (image loads, scripts, styles, fonts, XHR/fetch).
- **Priority:** P0
- **Category:** Network/API

### API-02 — Blog "Load More" issues a successful request and returns new content
- **Purpose:** Validate the pagination mechanism's underlying network call.
- **Preconditions:** `/blogs/` has more posts than fit on the first page.
- **Steps:** 1) Go to `/blogs/`. 2) Intercept network activity. 3) Click "Load More". 4) Inspect the triggered request/response.
- **Expected result:** Request returns HTTP 200 with valid content (HTML fragment or JSON); no error is logged in the console.
- **Priority:** P1
- **Category:** Network/API

### API-03 — Google Maps embed loads without error
- **Purpose:** Verify the third-party map iframe initializes correctly.
- **Preconditions:** None.
- **Steps:** 1) Navigate to a page containing the map embed (home/contact section). 2) Wait for the iframe to load. 3) Check for failed requests scoped to the maps domain.
- **Expected result:** Map iframe loads (HTTP 200 on its resources); no blocked/failed request for the embed itself.
- **Priority:** P2
- **Category:** Network/API

---

## 6. Security regression

### SEC-01 — Key security response headers are present
- **Purpose:** Baseline check on response headers not yet confirmed in the inventory (gap #5).
- **Preconditions:** None.
- **Steps:** 1) Request `/` directly (not via browser rendering). 2) Inspect response headers.
- **Expected result:** Document current state of `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` / `frame-ancestors`, `Content-Security-Policy`, `Referrer-Policy`. Flag any missing headers as a finding rather than an automatic fail on first run (baseline-then-regress).
- **Priority:** P1
- **Category:** Security regression

### SEC-02 — HTTP requests redirect to HTTPS
- **Purpose:** Confirm the redirect behavior noted as unverified in the inventory (gap #7).
- **Preconditions:** None.
- **Steps:** 1) Request `http://tekyz.com/` directly. 2) Follow any redirect chain.
- **Expected result:** Final response is served over HTTPS with a 301/302 (or the origin enforces HTTPS by another documented mechanism); no plaintext HTTP page is ever rendered.
- **Priority:** P0
- **Category:** Security regression

### SEC-03 — 404 page returns a real 404 status
- **Purpose:** Confirm/deny the gap flagged in the inventory — verify unknown URLs don't silently return 200.
- **Preconditions:** None.
- **Steps:** 1) Request a known-invalid path (e.g. `/this-page-does-not-exist-qa-check-123`). 2) Check HTTP status and rendered content.
- **Expected result:** HTTP 404 status, with a user-friendly not-found page (not a raw error or a 200 masking a missing page).
- **Priority:** P1
- **Category:** Security regression

### SEC-04 — No sensitive plugin/version strings are exposed unnecessarily
- **Purpose:** Track the information-disclosure items already found (All in One SEO version in sitemap, `image-prioritizer` beta version) so any *new* disclosures are caught.
- **Preconditions:** None.
- **Steps:** 1) Fetch `/sitemap.xml` and the homepage `<head>`. 2) Extract any version strings/generator tags.
- **Expected result:** Result is diffed against the baseline captured in `test-inventory.md` §15; the test fails only on new/unexpected disclosures, not on the already-known baseline (avoids false positives on a low-severity, accepted-risk item).
- **Priority:** P2
- **Category:** Security regression

---

## 7. Visual regression

### VIS-01 — Homepage hero and nav visual baseline
- **Purpose:** Catch unintended layout/style changes to the highest-traffic section of the site.
- **Preconditions:** Baseline screenshot captured and approved.
- **Steps:** 1) Navigate to `/`. 2) Screenshot the header + hero region at desktop viewport. 3) Compare to baseline.
- **Expected result:** No unapproved visual diff beyond an agreed pixel/percentage threshold.
- **Priority:** P2
- **Category:** Visual regression

### VIS-02 — Job application form layout baseline (desktop + mobile)
- **Purpose:** Catch layout breakage on a page with a real conversion form, across viewports.
- **Preconditions:** Baseline screenshots captured and approved for both viewports.
- **Steps:** 1) Navigate to `/jobs/ai-ml-engineer/`. 2) Screenshot the form at desktop (e.g. 1280×800) and mobile (e.g. 375×812) viewports. 3) Compare to baselines.
- **Expected result:** No unapproved visual diff; form fields remain usable/visible at both sizes.
- **Priority:** P2
- **Category:** Visual regression

---

## 8. Performance

### PERF-01 — Homepage load performance baseline
- **Purpose:** Track homepage speed given the page is fairly asset-heavy (many images, embeds, widgets).
- **Preconditions:** None.
- **Steps:** 1) Navigate to `/` in a clean browser context. 2) Capture navigation timing (e.g. `DOMContentLoaded`, full load, and Core Web Vitals if available via Playwright + Lighthouse/CDP).
- **Expected result:** Metrics recorded and compared against an agreed baseline/budget (e.g. LCP under an agreed threshold); test flags regression beyond the budget, not an arbitrary hard-coded number on first run.
- **Priority:** P2
- **Category:** Performance

### PERF-02 — Job listing page load performance baseline
- **Purpose:** Track performance of a conversion-relevant page (job board) separately from the heavier homepage.
- **Preconditions:** None.
- **Steps:** 1) Navigate to `/job-openings/`. 2) Capture the same timing/vitals as PERF-01.
- **Expected result:** Metrics recorded and compared against an agreed baseline/budget.
- **Priority:** P2
- **Category:** Performance

---

## Test count by category

| Category | Count |
|---|---|
| Smoke | 4 |
| Functional | 5 |
| Navigation | 4 |
| Forms | 4 |
| Network/API | 3 |
| Security regression | 4 |
| Visual regression | 2 |
| Performance | 2 |
| **Total** | **28** |

**Status: awaiting your review/approval. Nothing in this plan has been implemented.**
