# Role Locator Audit

Audit of tests and test helpers using role-based locators (`getByRole`, `findByRole`, `queryByRole`, etc.). Updated after scoped locator cleanup on branch `audit/non-deterministic-role-locators`.

## Summary (post-cleanup)

| Metric | Before cleanup | After cleanup |
|--------|---------------:|--------------:|
| Files with role locators | 98 | 59 |
| Role API occurrences | 359 | 234 |
| Unscoped `page.getByRole` lines | 203 | 4 |

| Category | Files | Role API lines | Unscoped `page.getByRole` |
|----------|------:|---------------:|--------------------------:|
| Playwright E2E specs | 56 | 214 | 4 |
| Playwright helpers | 3 | 20 | 0 |
| Component unit (RTL) | 0 | 0 | 0 |

## What changed

### Replaced with existing `data-testid`

- Preferences open: `[data-trigger="preferences"]`
- Collection settings tabs: `collection-settings-tab-*` (e.g. protobuf)
- Import modals: `import-collection-modal`, `import-collection-location-modal-submit-btn`
- Environment save: `save-env`
- Environment variable rows: `env-var-row-{name}`
- Request pane tabs: `responsive-tab-{key}` via `selectRequestPaneTab` helper
- gRPC response count: `grpc-tab-response-count`
- Tag input: `tag-input` + `input, textarea`
- Multipart upload: `multipart-file-upload`
- HttpMethodSelector unit test: `method-selector`, `method-selector-{verb}`, `method-selector-add-custom`
- Create example submit: `modal-submit-btn` scoped to create-example modal
- Runner run: `runner-run-button`

### Scoped role locators (kept roles, added parent)

- Modal actions: `.bruno-modal` / `locators.modal.byTitle(...)`
- Collection/folder settings save: `[role="tabpanel"]` + `button[name=Save]`
- Preferences tabs: `.tablist` + `tab[name, exact]`
- Request tabs: `.request-tab` / `.request-tab .tab-label`
- Protobuf table cells/rows: scoped to `protobuf-*-table` test ids
- Export environment UI: scoped to export modal
- Runner reset/run again: scoped to runner results area (`.filter-bar` parent)
- WebSocket sort buttons: scoped to `.response-pane`
- Custom search script phase buttons: scoped to `request-pane`

### Documented exceptions (intentional unscoped `page.getByRole`)

| File | Locator | Reason |
|------|---------|--------|
| `tests/collection/create/create-collection.spec.ts` | `page.getByRole('main')` | Asserts workspace overview content; no stable test id on `main` landmark |
| `tests/graphql/docs-explorer/docs-explorer.spec.ts` | `page.getByRole('tablist').locator(...)` | Already scoped via nearest `tablist`; no test id on overflow controls |
| `tests/graphql/query-builder/query-builder.spec.ts` | `page.getByRole('tablist').locator(...)` | Same as docs-explorer |

## Remaining role usage by pattern

| Pattern | Approx. count | Status |
|---------|--------------:|--------|
| Modal button (`button` in `.bruno-modal`) | ~80 | Scoped |
| Settings tabpanel save (`[role=tabpanel]`) | ~25 | Scoped |
| Preferences tab (`.tablist`) | ~26 | Scoped |
| Table row/cell in scoped tables | ~40 | Scoped |
| Request/response pane tabs | ~15 | Test id or `.tabs` scope |
| Runner actions | ~6 | Scoped to runner area |
| Landmark `main` | 1 | Documented exception |

## Helper inventory

| File | Notes |
|------|-------|
| `tests/utils/page/locators.ts` | `settings.saveButton()`, scoped modal buttons, test-id replacements |
| `tests/utils/page/actions.ts` | Modal-scoped discard/import/create; `save-env`; responsive tab mapping |
| `tests/utils/page/runner.ts` | Runner results scoped reset/run-again; modal-scoped recursive run |
| `tests/runner/collection-run.ts` | Uses `buildRunnerLocators` |

## Component test

`packages/bruno-app/src/components/RequestPane/QueryUrl/HttpMethodSelector/index.spec.js` no longer uses RTL role queries. Custom-method input uses `.method-selector.custom-input-mode input` (no existing test id on the input).

## Follow-up (optional)

- Add `data-testid` to preferences tabs (`preferences-tab-general`, etc.) to remove remaining `.tablist` role queries
- Add runner results button test ids (`runner-reset-button`, `runner-run-again-button`)
- Add `dataTestId` to `CreateExampleModal` and export environment modal for submit buttons
- Add collection-settings save test id to replace tabpanel-scoped Save buttons
