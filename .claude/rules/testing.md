---
paths:
  - "tests/**/*"
  - "playwright/**/*"
  - "playwright.config.ts"
---

# Playwright E2E Testing Guide

> **Reference:** For the full narrative guide — test structure, the page-module locator/action pattern, and worked examples — see [`docs/playwright-testing-guide.md`](../../docs/playwright-testing-guide.md). This file is the terse, path-scoped quick reference; the guide is the canonical source for conventions.

## Running Tests

```bash
npm run test:e2e                           # default + system-pac projects (starts dev servers automatically)
npx playwright test tests/request/         # Run specific directory
npx playwright test --project=default      # Run specific project
npx playwright test --headed               # Watch mode
```

Projects: `default` (main), `system-pac` (depends on `default`), `auth`, `ssl`.
`npm run test:e2e` runs `default` + `system-pac`; the rest have their own
`test:e2e:*` scripts. Config: `playwright.config.ts` — `fullyParallel: true`, `workers` unset
(Playwright default, not single-worker), retries 0 local / 2 CI.

## Test Fixtures (playwright/index.ts)

See `playwright/index.ts` for the current set; the table covers the common ones.

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `page` | test | Default page from `electronApp` |
| `electronApp` | worker | Default Electron launch (skips onboarding) |
| `launchElectronApp(opts)` | worker | Custom launch with userData, env, init data |
| `reuseOrLaunchElectronApp(opts)` | worker | Caches app instances by key |
| `pageWithUserData` | test | Loads `init-user-data/` from test dir, waits for app ready |
| `createTmpDir(tag?)` | worker | Temp directory, auto-cleaned after worker |
| `collectionFixturePath` | test | Copies `fixtures/collection(s)/` to temp dir |
| `restartApp(opts)` | test | Restart with fresh user data |
| `newPage` | test | Fresh app instance with tracing |

## Test Data Conventions

- `tests/<suite>/init-user-data/` — Seed data for existing-user tests (`pageWithUserData`)
- `tests/<suite>/init-user-data-fresh/` — Seed data for new-user tests (hasLaunchedBefore: false)
- `tests/<suite>/fixtures/collection(s)/` — Collection fixtures auto-copied to temp dirs
- `initUserDataPath` files support `{{projectRoot}}` template variable
- No `initUserDataPath` → default prefs with `hasLaunchedBefore: true` (skip onboarding)
- `dotEnv` overrides defaults (e.g., `DISABLE_SAMPLE_COLLECTION_IMPORT: 'false'`)
- Adding/changing a key in the app's `preferences.json` defaults? Mirror it in the `defaultPreferences` mock in `playwright/index.ts` — see [the guide](../../docs/playwright-testing-guide.md#3-keep-defaultpreferences-in-sync-with-app-preferences).

## Test Helpers (tests/utils/)

Reuse existing helpers instead of hand-rolling clicks; read the module for its current exports
(e.g. `grep "^export" tests/utils/page/actions.ts`). Modules by responsibility:

- `page/actions.ts` — high-level user actions (create/open collections, requests, folders, environments; send/save requests; workspace + tab management; import)
- `page/locators.ts` — locator builders (`buildCommonLocators(page)` + per-protocol/feature variants) and table helpers
- `page/runner.ts` — collection/folder runner actions and result assertions
- `tests/utils/cli.ts` — `runCLI(cwd, args)` for bruno-cli testing
- `tests/utils/wait.ts` — polling helpers (e.g. `waitForPredicate(predicate, {tries, interval})`)

**Convention:** a spec must never inline raw selectors. Each `page/*` module owns one UI section and exports both a locator builder and its actions; a new section gets a new file whose builder is mapped into `buildCommonLocators`. Full pattern + examples in [the guide](../../docs/playwright-testing-guide.md#1-centralize-locators-and-actions-in-page-modules).

## Waiting for App Ready

```javascript
await page.locator('[data-app-state="loaded"]').waitFor();
```

This attribute is set when `main:app-loaded` IPC arrives (independent of `renderer:ready` chain).

## Mutating Fixtures

The suite must be isolated (unique tmp paths, no shared state).

Most specs load fixtures via `collectionFixturePath` (copies `fixtures/collection(s)/` to a temp dir) or `pageWithUserData` (loads `init-user-data/` into a fresh temp userData dir). These operate on **temp copies** — they need **no** cleanup, even though they mutate files on disk (e.g. persistence specs writing to `environments/*.bru` or `collection.bru`). Only a spec that mutates a **committed** fixture **in place** must restore it in `afterAll` — those use `git checkout <fixturePath>`. Don't flag a missing `afterAll` on a temp-copy spec.

## Common Pitfalls

1. **Worker-scoped fixtures persist across test retries** — app state from failed attempts carries over. If test creates resources (folders, collections), retries may fail trying to create duplicates.

2. **Collapsed folders hide children from DOM** — `toHaveCount`/`toBeVisible` won't find items inside collapsed folders. Expand folders before asserting on their children.

3. **Sequential tests sharing state** — Tests in the same `describe` that depend on prior test state will cascade-fail. The `afterAll` cleanup only runs once, not between retries.

4. **File watcher timing** — After creating files via IPC, the collection watcher must detect and process the change before the UI updates. Use Playwright's auto-retrying assertions (e.g., `expect(locator).toBeVisible()`) rather than immediate checks.

5. **Default env vars in fixture** — `launchElectronApp` sets `DISABLE_SAMPLE_COLLECTION_IMPORT: 'true'` by default. Tests that need onboarding must override via `dotEnv`.

## Test Coverage Areas

Test suites live under `tests/`, one directory per feature area — list that directory for the
current set. Examples: `request/`, `collection/`, `environments/`, `runner/`,
`scripting/`, `graphql/`, `grpc/`, `websockets/`, `auth/`, `ssl/`.
