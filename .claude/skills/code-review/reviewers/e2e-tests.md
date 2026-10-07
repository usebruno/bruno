# E2E tests reviewer

**Scope:** files under `tests/**` (`path: 'tests/**/**.*'`).

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Review the diff against **`.claude/rules/testing.md`** and the e2e checklist in
**`.coderabbit.yaml`** (read both). Report violations with `file:line`, severity:

- **blocker** — `test.only`; `page.pause()`.
- **suggestion** — `page.waitForTimeout()` where an `expect()` locator assertion could wait
  instead; inline raw selectors instead of `tests/utils/page/*` modules; a spec that mutates a
  committed fixture without restoring it in `afterAll`; shared state / non-isolated tmp paths.
- **suggestion** — a non-discriminating assertion: `toContain('description:')` when the fixture
  already carries that substring on unrelated rows passes even if the change under test never
  happened; assert the unique value actually written by this change.
- **suggestion** — parallel `.bru` and `.yml` fixtures for the same scenario that disagree
  field-for-field (e.g. a row `selected: false` in one, enabled in the other) — a fixture bug
  even when the current assertion tolerates it.
- **nit** — locators not stored in variables; a single broad assertion where several focused
  ones fit; steps not wrapped in `test.step`.
