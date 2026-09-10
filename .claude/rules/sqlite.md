---
paths:
  - "packages/bruno-sqlite/**/*"
---

# SQLite Storage (`@usebruno/sqlite`)

`statements/*.sql` and `migrations/*.ts` are compiled by `npm run generate` into a typed data
layer. `src/generated/**` and `dist/**` are build output (git-ignored) — **never hand-edit or
commit them**; the `.sql`/`.ts` sources plus handwritten `src/**` are the only source of truth.
`README.md` has the authoring flow.

The stakes are higher than a normal package: the DB runs **synchronously on the Electron main
thread**, every statement is **callable by any renderer code**, the rows hold **credentials**, and
migrations run **unattended against real user databases** at startup.

## Entry points & boundaries

- `@usebruno/sqlite` (`/node`) — main process only; owns `DatabaseSync` and runs statements.
  Wired in `packages/bruno-electron/src/ipc/sqlite.js` against `userData/bruno.db`.
- `@usebruno/sqlite/web` — renderer only; React Query hooks over the IPC bridge. Never import
  `/node` from the renderer or the web entry from the main process.
- `src/shared/**` must stay platform-neutral (types + channel constants) — no `node:*` imports.
- Statement names are public API: the renderer's `useSqliteQuery`/`useSqliteMutation` unions are
  derived from them, and renaming one breaks every caller.

## Authoring statements

- Values bind as **named `@params` only**. Never concatenate or interpolate into SQL — not values,
  and not identifiers, table/column names, `LIMIT`, or `ORDER BY`. The rare construct SQLite can't
  bind (`scripts/lib/sql.ts`'s `VACUUM INTO`) must escape by doubling `'`, with a test proving it.
- The `:one | :many | :exec` annotation must match the SQL. Only `:exec` emits the mutation event,
  so a write annotated `:one` leaves the UI stale and a read annotated `:exec` fires a spurious
  refresh.
- Statements are prepared **once when the DB opens**, against the migrated schema. A missing table
  or column only `console.error`s at startup and then throws at call time — verify new SQL against
  the schema all migrations produce, not just the one you added.
- Every statement is reachable from the renderer with arbitrary params over `SQLITE_CHANNEL`
  (`registerSQLiteIpc` forwards name + params with no filtering). Scope each one to its owner
  (`request_uid`, `collection_uid`); an unfiltered `DELETE`/`UPDATE` is an app-wide capability.
- Invalidation keys off the tables extracted by `node-sql-parser`, which **fails soft** — it warns
  and returns `[]` for SQL it can't parse, silently killing UI refresh. Confirm a new statement
  yields non-empty `tables` in the generated output.
- Statement names are unique across all `.sql` files (the generator throws on duplicates).

## Migrations are immutable

- Each migration's `up`/`down` text is hashed into the `_migrations` table. Editing one that has
  already been applied throws on open — and `createDatabase` responds by **deleting the user's DB
  files and rebuilding empty**. Ship a new sequence instead; never edit a released migration.
- Scaffold with `npm run migration:new --workspace=packages/bruno-sqlite`. Sequence prefixes must
  be unique and monotonic — two branches both claiming the next number collide on merge.
- `down` is not decoration: `_rollbackObsolete` runs it when a user opens an **older Bruno** whose
  bundle lacks that migration. Every `up` needs a guarded exact inverse (`DROP … IF EXISTS`), or
  downgrading corrupts the database.
- `up` must be safe over existing rows — no `NOT NULL` column without a default, no unique index
  over data that may already collide, no destructive `ALTER` without a backfill.
- Migrations run at startup before the app is usable and each one is wrapped in a transaction; a
  table rewrite or backfill over a large table delays launch.
- Index what you query: any column used in a new `WHERE`/`ORDER BY`/`JOIN` that isn't the primary
  key needs an index in the same migration. (`runner_responses.collection_uid` is filtered by
  `delete_runner_responses_for_collection` but unindexed — that's the gap to avoid repeating.)
- Verify against real data before shipping: `npm run migration:verify` replays every migration
  over a `VACUUM INTO` copy of a real DB (`DB_PATH` in `.env`).

## Security & data at rest

- Rows persist whole request/response exchanges — auth headers, tokens, cookies, bodies — in plain
  text under `userData`. Treat the DB as credential storage.
- Never log bound params, row contents, or query results. Logging the error object is fine;
  logging what was passed to it is a leak.
- Widening what's persisted needs a matching delete path and a reason; nothing prunes the DB today.

## Performance & memory

- `DatabaseSync` is **synchronous**: a slow statement blocks IPC and freezes the UI. No `:many`
  without a `LIMIT`, no full scans on a growing table.
- Rows carry MB-scale serialized exchanges. Every read materializes in main, structured-clones
  across IPC, then parks in the React Query cache — select the columns you need instead of
  `SELECT *`, page large reads, and don't key big payloads on volatile params.
- Batch writes: N sequential `:exec` calls are N transactions and N fsyncs. Loop inside a single
  `DB._transaction`.
- A mutation invalidates **every** live query touching its tables, so a high-frequency write
  against a hot table causes refetch storms. `useStoredRunnerExchange` handles this by gating the
  read until the row is final — follow that pattern rather than adding manual invalidation.

## Failure modes

- `createDatabase` never throws: it falls back to rebuilding the file, then to `:memory:`, and can
  return `{ db: undefined, statements: undefined }`. Consumers must tolerate a missing DB
  (`getStatements()` returns `null`) — new APIs degrade, they don't crash startup.
- DB files come as a set — `''`, `-journal`, `-wal`, `-shm`. Any file operation must cover all four
  and close the handle first; Windows won't delete an open file (see `.claude/rules/cross-platform.md`).
- `node:sqlite` is still experimental — the workspace's `test` script passes `--experimental-sqlite`
  for you. New statement, migration, or generator behavior needs a spec under `tests/node` or
  `tests/web`: `npm test --workspace=packages/bruno-sqlite`.
