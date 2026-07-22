---
name: write-e2e-test
description: Write a Playwright E2E test for Bruno. Use when adding or modifying
  tests under tests/, creating a new test suite, or reproducing a bug as an
  e2e spec.
---

# Writing a Bruno E2E test

Read `.claude/rules/testing.md` first for the full fixture and helper reference. See
`docs/playwright-testing-guide.md` for the extended walkthrough (codegen, running,
debugging, troubleshooting) — but where it disagrees with this skill or the actual repo,
trust the repo: specs live in `tests/` (not `e2e-tests/`), the suite is `fullyParallel`,
and projects are `default`, `system-pac`, `auth`, and `ssl`
(verify in `playwright.config.ts`).

## Start with codegen or by hand

- **Codegen** (fastest for a new flow): `npm run test:codegen <name>` launches the app,
  records your clicks, and writes `tests/<name>.spec.ts`. Treat the output as a rough
  draft — move it into the right area folder, swap generated selectors for `data-testid`
  or helpers, wrap steps in `test.step`, and delete dead recorded actions.
- **By hand**: `import { test, expect } from '../../playwright'` and follow the steps below.

## Steps

1. **Place the spec** at `tests/<area>/<name>.spec.ts` — reuse an existing area dir under
   `tests/` (list it for the current set; e.g. `request/`, `collection/`, `environments/`,
   `runner/`, `scripting/`) or add one. Pick the project: `default` for most specs;
   `auth` / `ssl` / `system-pac` only when the test needs those
   servers or external dependencies.
2. **Use fixtures** from `playwright/index.ts` (read it for the full set) instead of launching
   the app yourself:
   - `page` / `electronApp` — default app with onboarding skipped.
   - `pageWithUserData` — seeds data from `tests/<area>/init-user-data/`
     (use `init-user-data-fresh/` for new-user flows).
   - `createTmpDir(tag?)` — throwaway dir for collections/files the test creates; cleaned
     up automatically, so prefer it over hardcoded paths.
   - `newPage`, `launchElectronApp`, `reuseOrLaunchElectronApp`, `restartApp` — for
     multi-window or app-restart scenarios.
   - `collectionFixturePath` / `workspaceFixturePath` — copy a committed fixture to a tmp
     dir and get its path.
3. **Use helpers** from `tests/utils/page/` instead of hand-rolling clicks — read the module
   for the current set (e.g. `createCollection`, `sendRequest`, `runCollection`).
4. **Structure each test** arrange → act → assert, and wrap the phases in `test.step` so
   the HTML report reads clearly. Prefer several focused assertions over one broad check.
5. **Wait for readiness**: `await page.locator('[data-app-state="loaded"]').waitFor()`
   before asserting on app state.
6. **Locate** by `data-testid` (Bruno's dominant convention) or documented classes
   (`.collection-item-name`); stable `getByRole` / `getByText` locators are fine too.
   Avoid brittle CSS, `#id`, or index-based selectors. If no stable selector exists, add a
   `data-testid` to the component rather than locating by text.
7. **If the test mutates a committed fixture**, restore it in `afterAll`. Existing specs
   do this with `git checkout <fixturePath>` (e.g. `tests/response-examples/*.spec.ts`) —
   follow the pattern already used by neighbouring specs in that area.
8. **Use auto-retrying assertions** (`expect(locator).toBeVisible()`); never assert
   immediately after a file-watcher-triggered change (created files take a tick to appear).
   Reserve `page.waitForTimeout()` for when no locator assertion can wait instead.
9. **Run it**: `npx playwright test tests/<area>/<name>.spec.ts --project=default`
   (the web + test servers start automatically). Debug with `--ui`, `--headed`, `--debug`,
   or `--trace on` (then `npx playwright show-trace test-results/**/trace.zip`).

## Checklist before done

- [ ] Test is isolated — unique tmp paths (`createTmpDir`), no state shared with other tests
- [ ] Passes on a clean second run (retry-safe; worker fixtures persist across retries)
- [ ] Folders expanded before asserting on their children (collapsed = not in DOM)
- [ ] Any mutated committed fixture is restored in `afterAll`
- [ ] Any codegen-generated draft refactored to fixtures/helpers + stable selectors
- [ ] Steps wrapped in `test.step`; no `test.only`, no `page.pause()`
