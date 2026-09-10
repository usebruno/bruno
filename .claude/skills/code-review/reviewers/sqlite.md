# SQLite storage reviewer

**Scope:** `packages/bruno-sqlite/**`.

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Review the diff against **`.claude/rules/sqlite.md`** (read it) — the DB is synchronous on the
Electron main thread, every statement is renderer-callable, rows hold credentials, and migrations
run unattended against real user databases. Read the changed `.sql`/migration against the schema
all migrations produce, not just the hunk. Report with `file:line`, severity:

- **blocker** — SQL built by interpolation rather than named `@params` (values *or* identifiers),
  or an unbindable construct escaped without doubling `'`; an edited migration that has already
  shipped, or a duplicate/non-monotonic sequence (both wipe user DBs via the rebuild path); a
  missing or non-inverse `down`; an `up` unsafe over existing rows; a statement referencing a
  table/column the migrations don't produce; a statement not scoped to its owning
  `request_uid`/`collection_uid`, or a `DELETE`/`UPDATE` with no `WHERE`; logging params, rows, or
  results that carry credentials; main-thread stalls (`:many` with no `LIMIT`, a full scan, a
  startup backfill over a large table); hand-edited or committed `src/generated/**` or `dist/**`.
- **suggestion** — a new `WHERE`/`ORDER BY`/`JOIN` column left unindexed; memory waste (`SELECT *`
  over MB-scale payload columns, unpaged reads, big results keyed on volatile params); N `:exec`
  calls where one `DB._transaction` would do; a hot-table write that triggers refetch storms; SQL
  `node-sql-parser` can't parse, so `tables` comes back empty and invalidation silently dies; a
  `:one|:many|:exec` annotation that disagrees with the SQL; new rows with no delete path; an API
  that throws instead of tolerating `{ db: undefined, statements: undefined }`; missing spec under
  `tests/node` or `tests/web`.
- **nit** — a renamed statement (names are public API — the renderer's typed unions derive from
  them); `src/shared/**` reaching for `node:*`.
