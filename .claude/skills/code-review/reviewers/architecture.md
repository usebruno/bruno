# Architecture & dependency-boundaries reviewer

**Scope:** `packages/**`.

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Review the diff against **`.claude/rules/architecture.md`** — read its "Dependency direction &
ownership boundaries" section. The `@usebruno/*` packages form a strict dependency DAG and some
carry hard platform constraints. Report violations with `file:line`, severity:

- **blocker** — a new internal `@usebruno/*` dependency that points *upward* or forms a cycle (a
  shared lib importing `@usebruno/app` or `@usebruno/electron`); `bruno-common` importing a Node
  built-in (`fs`/`path`/`os`/`crypto`/`child_process`/`node:*`) or any other `@usebruno/*` package
  (it must stay browser-safe and dependency-free); `bruno-js` importing `electron`/IPC (it also runs
  in the CLI); a runtime import of `bruno-schema-types` (types-only).
- **suggestion** — code placed in the wrong package/layer: renderer-only logic in a shared lib,
  host/Electron wiring pushed into `bruno-js`, or a util added to `bruno-common` that needs another
  package; a new shared dependency that would be better kept local.
- **Not a finding:** dependency edges already in the DAG, or a new *downward* dependency that fits
  the established direction.
