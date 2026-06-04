# Role Locator Audit

Audit of tests and test helpers using role-based locators (`getByRole`, `findByRole`, `queryByRole`, `getAllByRole`, etc.). Generated on branch `audit/non-deterministic-role-locators`.

## Summary

| Metric | Count |
|--------|------:|
| Files with role locators | 98 |
| Lines containing role APIs | 359 |
| Component Unit Spec files | 1 (21 lines) |
| Playwright E2E Spec files | 93 (308 lines) |
| Playwright Helper files | 4 (30 lines) |

### APIs used

- `findByRole`: 5 occurrences (line-level)
- `getAllByRole`: 1 occurrences (line-level)
- `getByRole`: 370 occurrences (line-level)
- `queryByRole`: 3 occurrences (line-level)

### Roles queried (Playwright `getByRole` first arg)

- `button`: 197
- `tab`: 51
- `dialog`: 36
- `cell`: 29
- `row`: 27
- `textbox`: 10
- `link`: 5
- `checkbox`: 4
- `complementary`: 4
- `menuitem`: 3
- `tablist`: 3
- `main`: 1

## Nondeterminism risk patterns

Role locators resolve via the accessibility tree (computed name, role, and DOM order). These patterns are most likely to cause flaky or ambiguous matches in Bruno's Electron/Playwright suite:

- **Unscoped `page.getByRole`** — query runs document-wide; multiple buttons/tabs/dialogs with the same accessible name can match the wrong element. — **203** line(s)
- **`getByRole('dialog')` without name** — any open modal/dialog matches; breaks when multiple dialogs exist or focus order changes. — **36** line(s)
- **`.first()` / `.nth()` after role query** — order-dependent when rows/tabs reorder. — **21** line(s)
- **`getByRole('button')` without `name`** — first matching button wins; unstable when UI adds buttons. — **11** line(s)
- **Bare `getByRole('button')` on rows** — no accessible name to disambiguate. — **11** line(s)
- **`getByRole('textbox')` without `name`** — ambiguous when several inputs are visible (tables, modals, panes). — **10** line(s)
- **RTL `screen.getByRole('button')`** — same ambiguity in component tests. — **9** line(s)
- **Regex / partial `name`** — can match more than one element if labels overlap. — **9** line(s)

### Highest-impact shared helpers

These centralize role usage; fixing them improves many specs:

- [`tests/runner/collection-run.ts`](tests/runner/collection-run.ts) — 2 line(s); risks: unscoped-page
- [`tests/utils/page/actions.ts`](tests/utils/page/actions.ts) — 17 line(s); risks: generic-dialog, generic-textbox, regex-name, unscoped-page
- [`tests/utils/page/locators.ts`](tests/utils/page/locators.ts) — 8 line(s); risks: generic-textbox, unscoped-page
- [`tests/utils/page/runner.ts`](tests/utils/page/runner.ts) — 3 line(s); risks: unscoped-page

## File inventory

### Playwright shared helpers

| File | Lines | Roles / APIs | Risk notes |
|------|------:|--------------|------------|
| `tests/runner/collection-run.ts` | 2 | button | unscoped-page |
| `tests/utils/page/actions.ts` | 17 | button, dialog, menuitem, tab, textbox | generic-dialog, generic-textbox, regex-name, unscoped-page |
| `tests/utils/page/locators.ts` | 8 | button, tab, textbox | generic-textbox, unscoped-page |
| `tests/utils/page/runner.ts` | 3 | button | unscoped-page |

### Playwright E2E specs (`tests/**/*.spec.{js,ts}`)

| File | Lines | Roles / APIs | Risk notes |
|------|------:|--------------|------------|
| `tests/auth/auth-mode-switch.spec.ts` | 2 | button | unscoped-page |
| `tests/auth/oauth1/oauth1.spec.ts` | 1 | button | unscoped-page |
| `tests/collection/create/create-collection.spec.ts` | 5 | button, main | unscoped-page |
| `tests/collection/draft/draft-indicator.spec.ts` | 10 | button | unscoped-page |
| `tests/collection/draft/draft-values-in-requests.spec.ts` | 3 | button | unscoped-page |
| `tests/collection/folder-docs-sticky/folder-docs-sticky.spec.ts` | 1 | button | unscoped-page |
| `tests/collection/moving-requests/cross-collection-drag-drop-folder.spec.ts` | 5 | button | unscoped-page |
| `tests/collection/moving-tabs/move-tabs.spec.ts` | 4 | button | unscoped-page |
| `tests/cookies/cookie-persistence.spec.ts` | 2 | button | regex-name |
| `tests/cookies/corrupted-passkey.spec.ts` | 2 | button | regex-name |
| `tests/environments/api-deleteEnvVar/api-deleteEnvVar.spec.ts` | 2 | row | unscoped-page |
| `tests/environments/api-setEnvVar/api-setEnvVar-with-persist.spec.ts` | 4 | cell, row | positional, unscoped-page |
| `tests/environments/api-setEnvVar/api-setEnvVar-without-persist.spec.ts` | 2 | cell, row | positional, unscoped-page |
| `tests/environments/api-setEnvVar/multiple-persist-vars.spec.ts` | 10 | button, cell, row | button-no-name, generic-button, positional, unscoped-page |
| `tests/environments/export-environment/collection-env-export/collection-env-export.spec.ts` | 10 | button, checkbox | regex-name, unscoped-page |
| `tests/environments/export-environment/global-env-export/global-env-export.spec.ts` | 10 | button, checkbox | regex-name, unscoped-page |
| `tests/environments/import-environment/bruno-env-import/collection-env-import/collection-env-import.spec.ts` | 4 | cell, row | positional, unscoped-page |
| `tests/environments/import-environment/bruno-env-import/global-env-import/global-env-import.spec.ts` | 6 | button, cell, row | positional, unscoped-page |
| `tests/environments/import-environment/collection-env-import.spec.ts` | 1 | button | — |
| `tests/environments/import-environment/env-color-import/env-color-import.spec.ts` | 1 | button | unscoped-page |
| `tests/environments/import-environment/global-env-import.spec.ts` | 1 | button | — |
| `tests/global-environments/non-string-values.spec.ts` | 3 | button | unscoped-page |
| `tests/graphql/docs-explorer/docs-explorer.spec.ts` | 1 | tablist | — |
| `tests/graphql/query-builder/query-builder.spec.ts` | 2 | tablist | — |
| `tests/grpc/method-search/grpc-method-search.spec.ts` | 2 | button, tab | unscoped-page |
| `tests/import/bruno/import-bruno-corrupted-fails.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/bruno/import-bruno-missing-required-schema.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/bruno/import-bruno-with-examples.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/bulk-import/001-multiple-files-upload.spec.ts` | 5 | button, dialog | generic-dialog |
| `tests/import/bulk-import/002-all-collection-types.spec.ts` | 5 | button, dialog | generic-dialog |
| `tests/import/bulk-import/003-selection-list-viewport.spec.ts` | 2 | dialog | generic-dialog |
| `tests/import/bulk-import/004-select-all.spec.ts` | 2 | dialog | generic-dialog |
| `tests/import/file-types/invalid-file-handling.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/insomnia/import-insomnia-v4-environments.spec.ts` | 2 | button | unscoped-page |
| `tests/import/insomnia/import-insomnia-v5-environments.spec.ts` | 2 | button | unscoped-page |
| `tests/import/insomnia/invalid-missing-collection.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/insomnia/malformed-structure.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/openapi/duplicate-operation-names-fix.spec.ts` | 1 | button | — |
| `tests/import/openapi/import-openapi-with-examples.spec.ts` | 4 | button, dialog | generic-dialog |
| `tests/import/openapi/malformed-yaml.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/openapi/missing-info.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/openapi/operation-name-with-newlines-fix.spec.ts` | 1 | button | — |
| `tests/import/openapi/path-based-grouping.spec.ts` | 1 | button | — |
| `tests/import/postman/import-apikey-header-collection.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/postman/import-apikey-query-collection.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/postman/import-postman-with-examples.spec.ts` | 2 | button, dialog | generic-dialog |
| `tests/import/postman/invalid-json.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/postman/invalid-missing-info.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/postman/invalid-schema.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/postman/malformed-structure.spec.ts` | 1 | dialog | generic-dialog |
| `tests/import/url-import/github-repository-import.spec.ts` | 3 | button, dialog | generic-dialog, unscoped-page |
| `tests/import/url-import/insomnia-url-import.spec.ts` | 1 | button | — |
| `tests/import/url-import/openapi-url-import.spec.ts` | 2 | button | — |
| `tests/import/url-import/postman-url-import.spec.ts` | 1 | button | — |
| `tests/import/wsdl/import-wsdl.spec.ts` | 4 | button, dialog | generic-dialog |
| `tests/interpolation/prompt-variables/http-request-prompt-variables.spec.ts` | 4 | button, dialog | generic-dialog |
| `tests/onboarding/sample-collection.spec.ts` | 3 | button | unscoped-page |
| `tests/onboarding/welcome-modal.spec.ts` | 7 | button | unscoped-page |
| `tests/preferences/autosave/autosave.spec.ts` | 3 | tab | unscoped-page |
| `tests/preferences/default-collection-location/default-collection-location.spec.js` | 6 | button, tab | unscoped-page |
| `tests/preferences/support-links.spec.js` | 6 | link, tab | unscoped-page |
| `tests/preferences/tab-switch-persistence/tab-switch-persistence.spec.ts` | 20 | tab | unscoped-page |
| `tests/protobuf/manage-protofile.spec.ts` | 22 | button, cell, row, tab | regex-name, unscoped-page |
| `tests/request/binary-file/binary-file-upload.spec.ts` | 1 | button | regex-name, unscoped-page |
| `tests/request/body-scroll/scroll-persistent.spec.ts` | 2 | cell, row | positional, unscoped-page |
| `tests/request/copy-request/copy-folder.spec.ts` | 3 | button | unscoped-page |
| `tests/request/copy-request/copy-request.spec.ts` | 2 | button | unscoped-page |
| `tests/request/copy-request/keyboard-shortcuts.spec.ts` | 2 | button | unscoped-page |
| `tests/request/encoding/curl-encoding.spec.ts` | 4 | dialog | generic-dialog, unscoped-page |
| `tests/request/newlines/newlines-persistence.spec.ts` | 6 | button, textbox | generic-textbox |
| `tests/request/save/save.spec.ts` | 1 | button | unscoped-page |
| `tests/request/settings/max-redirects.spec.ts` | 1 | complementary | unscoped-page |
| `tests/request/settings/no-redirects.spec.ts` | 1 | complementary | unscoped-page |
| `tests/request/settings/timeout.spec.ts` | 1 | complementary | unscoped-page |
| `tests/request/tab-panel-error-boundary/tab-panel-error-boundary.spec.ts` | 1 | tab | — |
| `tests/request/tests/custom-search/custom-search.spec.ts` | 8 | button | unscoped-page |
| `tests/request/timeline/timeline-url-update.spec.ts` | 1 | tab | — |
| `tests/response/json-response-formatting/json-response-formatting.spec.ts` | 1 | complementary | unscoped-page |
| `tests/response/large-response-crash-prevention.spec.ts` | 1 | button | unscoped-page |
| `tests/response-examples/create-example.spec.ts` | 9 | button | unscoped-page |
| `tests/response-examples/edit-example.spec.ts` | 5 | button | unscoped-page |
| `tests/response-examples/menu-operations.spec.ts` | 5 | button | unscoped-page |
| `tests/response-examples/save-as-example-multipart.spec.ts` | 1 | button | unscoped-page |
| `tests/scratch-requests/scratch-requests.spec.ts` | 2 | button | unscoped-page |
| `tests/shortcuts/bound-actions.spec.ts` | 2 | button, tab | unscoped-page |
| `tests/sidebar/rename-collection-item.spec.ts` | 1 | button | — |
| `tests/snapshots/basic.spec.ts` | 1 | tab | — |
| `tests/snapshots/workspace.spec.ts` | 10 | tab | unscoped-page |
| `tests/transient-requests/transient-request-quit-flow.spec.ts` | 2 | button | — |
| `tests/transient-requests/transient-requests.spec.ts` | 2 | button | — |
| `tests/variable-tooltip/variable-tooltip.spec.ts` | 1 | textbox | generic-textbox, positional |
| `tests/workspace/create-workspace/create-workspace.spec.ts` | 7 | button | — |
| `tests/workspace/git-backed-collections/git-backed-collections.spec.ts` | 7 | button | — |

### Component / unit specs (Testing Library)

| File | Lines | Roles / APIs | Risk notes |
|------|------:|--------------|------------|
| `packages/bruno-app/src/components/RequestPane/QueryUrl/HttpMethodSelector/index.spec.js` | 21 | button, menuitem, textbox | button-no-name, generic-button, generic-textbox, regex-name, rtl-generic-button |

### E2E specs with most role locator lines (top 15)

| File | Lines | Primary roles |
|------|------:|---------------|
| `tests/protobuf/manage-protofile.spec.ts` | 22 | `cell`, `tab`, `button`, `row` |
| `tests/preferences/tab-switch-persistence/tab-switch-persistence.spec.ts` | 20 | `tab` |
| `tests/collection/draft/draft-indicator.spec.ts` | 10 | `button` |
| `tests/environments/api-setEnvVar/multiple-persist-vars.spec.ts` | 10 | `row`, `button`, `cell` |
| `tests/environments/export-environment/collection-env-export/collection-env-export.spec.ts` | 10 | `button`, `checkbox` |
| `tests/environments/export-environment/global-env-export/global-env-export.spec.ts` | 10 | `button`, `checkbox` |
| `tests/snapshots/workspace.spec.ts` | 10 | `tab` |
| `tests/response-examples/create-example.spec.ts` | 9 | `button` |
| `tests/request/tests/custom-search/custom-search.spec.ts` | 8 | `button` |
| `tests/onboarding/welcome-modal.spec.ts` | 7 | `button` |
| `tests/workspace/create-workspace/create-workspace.spec.ts` | 7 | `button` |
| `tests/workspace/git-backed-collections/git-backed-collections.spec.ts` | 7 | `button` |
| `tests/environments/import-environment/bruno-env-import/global-env-import/global-env-import.spec.ts` | 6 | `row`, `cell`, `button` |
| `tests/preferences/default-collection-location/default-collection-location.spec.js` | 6 | `tab`, `button` |
| `tests/preferences/support-links.spec.js` | 6 | `link`, `tab` |

## Component test detail

### `packages/bruno-app/src/components/RequestPane/QueryUrl/HttpMethodSelector/index.spec.js`

Uses Testing Library: `screen.getByRole`, `getAllByRole`, `findByRole`, `queryByRole`.

| Line | Query | Risk |
|-----:|-------|------|
| 58 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 63 | `const dropdownItems = screen.getAllByRole('menuitem');` | — |
| 77 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 91 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 95 | `const postMethod = screen.getByRole('menuitem', { name: /^POST/ });` | regex-name |
| 99 | `const postMethod = screen.getByRole('menuitem', { name: /^POST/ });` | regex-name |
| 110 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 122 | `const input = screen.getByRole('textbox');` | generic-textbox |
| 150 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 158 | `const input = await screen.findByRole('textbox');` | — |
| 174 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 182 | `const input = await screen.findByRole('textbox');` | — |
| 190 | `expect(screen.queryByRole('textbox')).not.toBeInTheDocument();` | — |
| 197 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 205 | `const input = await screen.findByRole('textbox');` | — |
| 214 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 222 | `const input = await screen.findByRole('textbox');` | — |
| 228 | `expect(screen.queryByRole('textbox')).not.toBeInTheDocument();` | — |
| 236 | `const button = screen.getByRole('button');` | generic-button, button-no-name, rtl-generic-button |
| 244 | `const input = await screen.findByRole('textbox');` | — |
| 250 | `expect(screen.queryByRole('textbox')).not.toBeInTheDocument();` | — |

## Recommended replacements (follow-up)

1. Prefer `data-testid` (already used elsewhere in Bruno) or stable CSS scoped to a pane/modal (e.g. `.bruno-modal`, `getByTestId('request-pane')`).
2. When role is required, scope: `page.locator('.bruno-modal').getByRole(...)` or helper wrappers in `tests/utils/page/locators.ts`.
3. Always pass `{ name: '...', exact: true }` for buttons/tabs when multiple similar controls exist.
4. Avoid `getByRole('dialog')` alone; filter by modal title test id or `.bruno-modal-header-title`.
5. For tables, prefer row/cell `data-testid` or column indices via `getByTestId` rather than `getByRole('row', { name: ... })`.
