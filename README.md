# Tekyz AI QA & Security Monitoring Agent

Automated QA and security monitoring project for [tekyz.com](https://tekyz.com), built on [Playwright](https://playwright.dev/) with TypeScript.

**Status:** initial scaffold only. No tests are implemented yet — this repo currently contains folder structure and placeholder config so the project is ready for build-out.

## Structure

```
tests/
  smoke/         Fast checks that critical pages/flows are up
  functional/    Feature-level behavior tests
  security/      Non-destructive security checks
  regression/    Broader suite run before releases / on a schedule
test-data/       Fixtures and mock data (no real secrets)
reports/         Generated test output (gitignored)
config/          Environment and run settings
prompts/         AI/LLM prompt templates used by the project
scripts/         Setup, CI, and maintenance scripts
playwright.config.ts
package.json
```

See the README.md in each folder for what belongs there.

## Setup (once tests are implemented)

```bash
npm install
npx playwright install
```

## Running tests

```bash
npm run test:smoke
npm run test:functional
npm run test:security
npm run test:regression
```

## Safety

All tests in this project must run against **non-production data paths only, in read-only mode against the live site**. No test may create, modify, or delete data on tekyz.com, submit real forms with side effects, perform load/stress testing, or attempt any action beyond passive observation. Security checks are limited to passive/non-intrusive techniques (header checks, TLS/config checks, etc.) — no active exploitation or intrusive scanning.

## Roadmap

- [ ] Define smoke test cases
- [ ] Define functional test cases
- [ ] Define security check list
- [ ] Define regression suite
- [ ] Wire up CI
- [ ] Define reporting format
