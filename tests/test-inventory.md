# Test Inventory — tekyz.com

**Target:** https://tekyz.com/
**Method:** Static HTML retrieval and readability extraction of live pages (GET requests only), plus public reconnaissance files (`robots.txt`, `sitemap.xml`). No forms were submitted, no JavaScript was executed, no authentication was attempted, and no requests beyond normal page loads were made.
**Date:** 2026-08-09
**Non-destructive scope:** All checks below are passive/observational. No exploitation, fuzzing, brute force, or data submission was performed.

> **Coverage note / limitation:** This pass was done via static HTTP fetches, not a live browser session (headless browser binaries could not be downloaded in the sandbox used for this inspection; no Chrome extension was connected either). That means the site's structure, copy, links, forms, and meta/SEO data below are directly observed and reliable. Categories that require JavaScript execution — **console errors, exact runtime network/XHR calls, cookies, and confirmed third-party script inventory** — could not be directly captured and are marked "**Not directly observed**" with best-effort inference instead. A live Playwright trace (script provided in `scripts/`, see note at the end) is recommended to close this gap before finalizing Network/API and Security test implementations.

---

## 1. Pages (publicly accessible)

| # | URL | Notes |
|---|---|---|
| 1 | `/` | Home |
| 2 | `/case-studies/` | Case studies hub, domain filters |
| 3 | `/case-studies/healthtech/` | Case studies — Health Tech |
| 4 | `/case-studies/law-enforcement-tech/` | Case studies — Law Enforcement Tech |
| 5 | `/case-studies/agritech/` | Case studies — Agri Tech |
| 6 | `/case-studies/proptech/` | Case studies — Prop Tech |
| 7 | `/case-studies/workflow-automation/` | Case studies — Workflow Automation |
| 8 | `/law-enforcement-tech/how-qtis-revolutionized-crime-investigation-with-business-intelligence/` | Individual case study |
| 9 | `/healthtech/healthcare-technology/` | Individual case study |
| 10 | `/healthtech/clinical-trial/` | Individual case study |
| 11 | `/job-openings/` | Jobs listing (has a "Search" box) |
| 12 | `/jobs/senior-business-analyst/` | Job detail + application form |
| 13 | `/jobs/ai-ml-engineer/` | Job detail + application form (confirmed fetched) |
| 14 | `/blogs/` | Blog listing, paginated via "Load More" |
| 15 | `/navigating-startup-success-with-strategic-product-development-c05679923072/` | Blog post (flat permalink, not under `/blogs/`) |
| 16 | `/ai-driven-growth-for-startups-8afe1beee30e/` | Blog post |
| 17 | `/why-most-startups-fail-and-what-to-do-differently-4657843fc653/` | Blog post |
| 18 | `/navigating-the-startup-journey-how-to-achieve-product-market-success-7edc7aa7bf8b/` | Blog post |
| 19 | `/exploring-the-benefits-of-ai-in-testing-for-faster-and-more-accurate-results/` | Blog post |
| 20 | `/how-to-prepare-for-what-jobs-ai-will-create-expert-roadmap-to-2025-opportunities/` | Blog post |
| 21 | `/author/mageshkumar/` | Author archive (linked from blog byline) |
| 22 | `/podcast` | Media → Interviews |
| 23 | `/terms-of-use` | Legal |
| 24 | `/privacy-policy/` | Legal (fetched, see §12) |
| 25 | `/robots.txt` | Reconnaissance file (fetched, see §15) |
| 26 | `/sitemap.xml` + child sitemaps | Reconnaissance file (fetched, see §15) |

**External/separate properties on the same brand (out of scope for tekyz.com tests, but linked from it):**
- `https://podcast.tekyz.com/` and `/podcast---blog-page` — separate podcast site
- `https://launch1st.tekyz.com` — separate product site ("Launch 1st")

Sitemap index (`/sitemap.xml`) also confirms these page groups exist at scale: `post-sitemap.xml`, `page-sitemap.xml`, `awsm_job_openings-sitemap.xml`, `bafg-sitemap.xml`, `category-sitemap.xml`, `post_tag-sitemap.xml` — i.e. there are more blog posts, pages, and job listings than were individually crawled here.

---

## 2. Main navigation (header, present on every page checked)

- Home → `/`
- Services → `#services` (in-page anchor, home page only)
- Our Work → `#ourwork` (in-page anchor, home page only)
- Case Studies → `/case-studies/`
  - Business Domains: Health Tech, Law Enforcement Tech, Agri Tech, Prop Tech
  - Technical Domain: Workflow Automation
- Jobs → `/job-openings/`
- About Us → `#contactus` (in-page anchor, home page only)
- Blog
  - Articles → `/blogs/`
  - Podcast Blog → `https://podcast.tekyz.com/podcast---blog-page` (external)
- Media
  - Interviews → `/podcast`
  - Podcast → `https://podcast.tekyz.com/` (external)
- Launch 1st → `https://launch1st.tekyz.com` (external)
- Free Consultation (CTA button) → `#contactus`

**Observation:** the anchor links (`#services`, `#ourwork`, `#contactus`) only resolve correctly when clicked from the home page. From any other page, the header markup shows them as plain `#services` etc. — this is a strong candidate for a **broken-navigation bug** worth testing explicitly (see test plan NAV items).

## 3. Footer navigation

- Home → `/`
- Services → `#services`
- Jobs → `/job-openings` (note: no trailing slash here vs. `/job-openings/` in header — see §14 redirects)
- Our Work → `#ourwork`
- Terms → `/terms-of-use`
- Privacy → `/privacy-policy/`
- Social icons: LinkedIn, Facebook, Instagram, Twitter/X (see §8)
- Contact block: LinkedIn, phone (`tel:4805708557`), Cloudflare-obfuscated email, address (Google Maps link)

---

## 4. Important buttons / CTAs

| Label | Location | Target | Notes |
|---|---|---|---|
| Free Consultation | Header, hero, multiple homepage sections, footer sidebar | `#contactus` | Appears 8+ times on the homepage alone — highest-frequency CTA on the site |
| Schedule Now | Consultation widget (home + likely every page footer) | `#` | Href is a bare `#` in static HTML — almost certainly opens a JS scheduling modal/widget client-side. **Needs live-browser confirmation.** |
| Case Study (×3 on home) | "Our Work" section | Individual case study URLs | Functional, direct links |
| More Details | `/job-openings/` listing | Job detail pages | Functional |
| "more…" links in "How We Build" section | Home page | Mixed: some go to `#` (placeholder/dead), some go to `https://tekyz.com/?elementor-preview=5037&ver=...` (an Elementor preview URL — looks like leftover CMS builder link, **not a real destination for visitors**) | **Likely bug** — flagged for functional test coverage |
| Load More | `/blogs/` | AJAX (unknown endpoint, not directly observed) | Client-side pagination |
| See All Reviews | `/case-studies/` | `https://search.google.com/local/reviews?placeid=...` (external) | Functional |
| Apply / submit button on job application form | `/jobs/{slug}/` | Unknown endpoint (not directly observed, likely `admin-ajax.php`) | Present but not exercised (no submission attempted) |
| Next Job → | `/jobs/{slug}/` | Next job detail page | Functional pagination |

---

## 5. Forms

### 5.1 Job application form (per job posting, e.g. `/jobs/ai-ml-engineer/`, `/jobs/senior-business-analyst/`)
Fields observed:
- Full Name *
- Email *
- Phone *
- Cover Letter * (text area)
- Upload CV/Resume * — accepts `.pdf`, `.doc`, `.docx`
- Consent checkbox * ("By using this form you agree with the storage and handling of your data by this website.")
- Submit button (label not captured in static extraction — verify text live)

This looks like the WordPress **"AWSM Job Openings"** plugin (confirmed via `awsm_job_openings-sitemap.xml` in the sitemap index). Submission endpoint not confirmed — likely `wp-admin/admin-ajax.php`. **Tests must validate presence/client-side validation only — do not submit.**

Some job postings (e.g. AI ML Engineer) also point candidates to an **external Google Form**: `https://forms.gle/3EVdCHLybKVWTLJX8` as an alternate/required screening step — this is a third-party surface, out of scope to test/modify.

### 5.2 "Schedule Now" consultation widget
Referenced on every page's contact block ("David Hirschfeld", 30 min, "Web conferencing details provided upon confirmation"). Exact fields/vendor (Calendly-style vs. custom) **not directly observed** — href is `#`, meaning it's rendered/opened via client-side JS not present in static HTML.

### 5.3 Newsletter / marketing subscription
Not directly located in the pages crawled, but the Privacy Policy explicitly describes collecting "email address, phone number, name, company name and country provided when **subscribing to a newsletter, blogs, or other marketing materials**" — implying a subscribe form exists somewhere (footer widget, blog sidebar, or exit-intent popup) that this pass did not surface. **Needs live-browser confirmation.**

### 5.4 Blog comments
No comment form observed in the extracted blog post content, but WordPress sites commonly have one — **needs live-browser confirmation** on an actual post page.

**No standalone "Contact Us" form was found** — contact is via the consultation widget, phone, and email only.

---

## 6. Important user journeys

1. **Consultation funnel:** Home → click any "Free Consultation" CTA → land on contact section → click "Schedule Now" → (presumed) booking widget opens.
2. **Case study exploration:** Home/Case Studies hub → filter or browse by domain → open individual case study → read → CTA back to consultation.
3. **Job application:** Jobs listing → job detail → read JD → fill application form (name/email/phone/cover letter/resume) → submit (or, for some roles, follow external Google Form link instead).
4. **Content/blog discovery:** Home or nav → Blog → Articles → click into a post → read → (optional) Load More for older posts.
5. **Direct contact:** Any page → call `tel:4805708557` or click the obfuscated email link.
6. **Location lookup:** Any page → click address → Google Maps.
7. **Social/off-site discovery:** Footer → LinkedIn / Facebook / Instagram / Twitter.
8. **Cross-property navigation:** Home → "Launch 1st" or "Podcast" nav items → leaves tekyz.com for a Tekyz-owned subdomain.

---

## 7. Internal links

Covered by §1 (Pages) and §2/§3 (nav). Additional internal link patterns worth noting for link-checking tests:
- Elementor preview URLs (`/?elementor-preview=5037&ver=...`) embedded as "more…" links — these are CMS editor artifacts, not intended visitor destinations, and are a good candidate for a "no broken/placeholder links" regression test.
- Several in-page anchors (`#services`, `#ourwork`, `#contactus`, `#`) that only work correctly from `/`.

## 8. Important external links

| Destination | Where used |
|---|---|
| `https://www.linkedin.com/in/dhirschfeld/` | Header contact widget, footer social icon |
| `https://www.facebook.com/tekyzinc/` | Footer social icon |
| `https://www.instagram.com/Tekyzinc/` | Footer social icon |
| `https://twitter.com/tekyzinc` | Footer social icon |
| `https://maps.app.goo.gl/UUDa3ELYsNeZBJnX6` | Address links (multiple pages) |
| `https://www.google.com/maps/d/u/1/embed?mid=...` | Embedded map iframe |
| `https://search.google.com/local/reviews?placeid=...` | "See All Reviews" on Case Studies |
| `https://forms.gle/3EVdCHLybKVWTLJX8` | External screening form, AI ML Engineer job post |
| `https://podcast.tekyz.com/*` | Media/Blog nav |
| `https://launch1st.tekyz.com` | Main nav |

---

## 9. Login / authentication areas

**None found.** No login, sign-up, "my account", or customer-portal links appear anywhere in the navigation, footer, or crawled page content. This is a public marketing/agency site with no visitor-facing authentication surface. (The only place credentials could plausibly matter is the external Google Form and any WordPress `/wp-admin/` or `/wp-login.php`, which is administrative, not a public feature, and out of scope to probe further per the non-destructive constraint.)

---

## 10. Network / API requests visible during normal usage

**Not directly observed** — this pass used static HTML retrieval, not a live browser, so runtime `fetch`/`XHR` calls could not be captured. Based on static analysis, the following are **inferred and need live confirmation**:

- WordPress core (`/wp-json/...` REST API and/or `/wp-admin/admin-ajax.php`) — almost certainly backs the `/blogs/` "Load More" button and the job application form submission.
- Job application form submission — likely `admin-ajax.php` (AWSM Job Openings plugin convention), including a file upload for the resume.
- "Schedule Now" widget — likely loads a third-party scheduling script/iframe on click; vendor unconfirmed.
- Google Maps embed (`google.com/maps/d/...`) — confirmed present as an iframe.
- Case Studies page Google-reviews block — content matches a reviews widget pattern; loading mechanism (static vs. widget API) unconfirmed.

## 11. Third-party integrations visible during normal usage

Confirmed via static markup:
- **Google Maps** (embedded iframe)
- **Google Search Console** verification (`meta-google-site-verification`)
- **Bing Webmaster** verification (`meta-msvalidate.01`)
- **Google Business/Local reviews** (linked, and likely embedded as a widget on Case Studies)
- **Cloudflare email obfuscation** (`/cdn-cgi/l/email-protection` — decodes `mailto:` links client-side)
- **Google Forms** (external, one job posting)

**Not directly observed, needs live-browser confirmation:** analytics/tag-manager scripts (Google Analytics/GA4, Google Tag Manager, Meta Pixel, LinkedIn Insight Tag are common for a lead-gen agency site like this but no script tags were visible in the readability-stripped output used for this pass).

## 12. Important cookies

**Not directly observed** — cookie inspection requires a live browser session (`Set-Cookie` headers aren't exposed by the fetch method used here). The Privacy Policy page does explicitly disclose cookie usage: *"We may also track the effectiveness of various promotions through the use of data collection devices known as 'cookies' ... Third party vendors, including Google, use cookies to serve ads based on a user's prior visits."* So at minimum, expect Google-ads/remarketing cookies once confirmed live. Likely candidates to verify: WordPress session cookies, Cloudflare (`__cf_bm`/`cf_clearance`), Google Analytics (`_ga`, `_gid`), Google Ads/remarketing cookies.

## 13. Console errors

**Not directly observed** — requires a live browser session (JS execution). Flagged as a gap; recommend a live Playwright pass before writing console-error regression tests.

## 14. HTTP errors & redirects

- `http://tekyz.com/` was reachable and served the same content as `https://tekyz.com/` in this pass; the canonical tag correctly points to `https://tekyz.com/`. **The actual HTTP→HTTPS redirect (or lack thereof) could not be confirmed with certainty** by this fetch method — verify with a raw header check (`curl -I http://tekyz.com/`) or live browser.
- `/job-openings/` (with trailing slash, used in the header nav) vs. `/job-openings` (no trailing slash, used in the footer nav) — both resolve, consistent with WordPress's default trailing-slash canonicalization. Worth a redirect-consistency test.
- A deliberately invalid URL (`/this-page-does-not-exist-qa-check-123`) returned no readable page content in this pass — **could not confirm whether this is a proper `404` status with a styled not-found page, or something else.** This is an important gap to close live: a missing custom 404 page (or a 404 that returns HTTP 200) is a real, common WordPress misconfiguration worth testing directly.
- WWW vs. non-WWW behavior not tested in this pass — recommend adding to live verification.

## 15. Security-relevant configuration observations

*(Passive/observational only — no scanning, fuzzing, or exploitation performed.)*

- **CMS fingerprint:** WordPress, using the **All in One SEO** plugin v4.8.9 (version number is publicly exposed in the `sitemap.xml` generator comment — minor information disclosure, common and low severity, but worth noting).
- **Plugin fingerprint:** `awsm_job_openings-sitemap.xml` confirms the **AWSM Job Openings** plugin handles `/job-openings/` and job application forms. A `bafg-sitemap.xml` entry also exists (plugin unidentified from this pass).
- `meta-generator: image-prioritizer 1.0.0-beta2` — a beta-versioned image optimization plugin/tool is in production; version disclosure noted.
- **`robots.txt` explicitly allows AI crawlers** (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `GeminiBot`) full access (`Allow: /`), alongside a general `Crawl-Delay: 20`. This is a deliberate content/SEO decision, not a vulnerability, but worth documenting since it affects how site content may appear in AI-generated answers.
- Response security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) **could not be inspected** with the fetch method used in this pass (only `Content-Type` was exposed). This is the single biggest gap for the "Security regression" test category — recommend checking headers live (e.g. `curl -I`, browser devtools, or a reputable public header-scanning service) before finalizing those tests.
- Contact email addresses are Cloudflare-obfuscated (`/cdn-cgi/l/email-protection`) — reasonable basic anti-scraping measure.
- No login/auth surface was found on the public site (see §9), which reduces the public attack surface for auth-related testing; `/wp-admin/` and `/wp-login.php` were **not** probed, in line with the non-destructive/no-exploitation instruction.

---

## Summary of gaps requiring a live browser pass

The following categories the user asked for could **not** be reliably filled in from static HTML alone and should be confirmed with an actual Playwright/browser session before final security/network test implementation:
1. Console errors
2. Exact network/XHR/fetch calls and their endpoints
3. Cookies (names, flags, first vs. third-party)
4. Confirmed analytics/tag-manager third-party scripts
5. Full HTTP response headers (security headers in particular)
6. Exact HTTP status code and content of the 404 page
7. HTTP→HTTPS and www/non-www redirect chains
8. "Schedule Now" widget vendor/behavior
9. Newsletter/subscribe form location and fields
10. Blog comment form presence
