# Project Guide

Bruno fork — open-source API client (Electron + React + Redux).

Bruno is an API **client**, not a server: it sends requests and handles responses (auth, params, headers, bodies, environments, cookies). Judge every behavior and edge case by "what should a *client* do here?" — surface malformed or hostile responses clearly and stay robust; don't enforce server-side correctness.

## Quick Commands

```bash
npm run dev              # Run electron + react concurrently
npm run dev:watch        # Same, with hot-reload of the electron main process
npm run storybook        # Component dev (bruno-app)
npm run lint:fix         # ESLint fix
npm test --workspaces    # Unit tests (Jest) across all packages
```

Full script list: root `package.json`. Setup: `nvm use && npm i --legacy-peer-deps && npm run setup` (Node **v22.12.0**, see `.nvmrc`).

### Running a single test

```bash
# Single unit test (Jest) — scope to the workspace, pass a path/pattern after --
npm test --workspace=packages/bruno-app -- path/to/file.spec.js
npm test --workspace=packages/bruno-requests -- -t "test name pattern"

# Single e2e test (Playwright) — a project flag is REQUIRED (config has no default)
npx playwright test tests/collection/create-collection.spec.ts --project=default
npx playwright test --project=default -g "test name pattern"
```

Prefer the smallest scope — one workspace, one spec — over `--workspaces` or the full e2e run.

### Building shared packages

`npm run dev` does **not** rebuild the shared packages (bruno-common, bruno-requests,
bruno-filestore, bruno-converters, bruno-query, bruno-schema-types, bruno-graphql-docs).
After editing one, rebuild it or run its watcher, or the app won't pick up changes:

```bash
npm run build:bruno-common      # also :bruno-requests, :bruno-filestore, etc.
npm run watch:common            # also watch:requests, watch:converters
```

## Key Architecture

- **Main process entry**: `packages/bruno-electron/src/index.js`
- **Renderer + Redux store**: `packages/bruno-app/src/providers/ReduxStore/`
- Packages live under `packages/`, with top-level `tests/` and `playwright/`.

## Testing

- **Unit**: Jest, config per-package (`packages/*/jest.config.js`); bruno-app uses jsdom + `jest.setup.js`.
- **E2E**: Playwright — fixtures, helpers, isolation rules, and pitfalls live in
  `.claude/rules/testing.md`; use the `write-e2e-test` skill when adding specs.

## Coding Standards

Full list: `CODING_STANDARDS.md`. Mechanical style (indent, quotes, semicolons, no trailing
commas, arrow-param parens) is ESLint-enforced — run `npm run lint:fix`, don't hand-police it.
Non-obvious project rules worth holding:

- React: avoid `useEffect` (prefer derived state / custom hooks); import hooks by name, never `React.useX`; a component is controlled XOR uncontrolled; Tailwind for layout, styled-components `theme` for colors.
- Extract for readability or clear reuse; avoid only indirection that adds no payoff. Add `data-testid` attributes for Playwright selectors.

## Detailed rules & references

Path-scoped rules in `.claude/rules/` auto-attach when you touch matching files:
`architecture.md` (`@usebruno/*` dependency boundaries), `electron-ipc.md` (IPC handlers + startup),
`redux-store.md` (slices/middleware), `testing.md` (e2e patterns & gotchas), `cross-platform.md`
(Windows file/process/path pitfalls), `dsl-changes.md` (on-disk `.bru`/`.yml` format & backward
compat), `conventions.md` (readability + comment/diff hygiene).

Read on demand (not auto-loaded): `.claude/reference/architecture.md` — the monorepo map, request
pipeline, sandbox, core types, and dependency versions. Consult it before cross-package or
architectural work.
