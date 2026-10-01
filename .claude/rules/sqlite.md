---
paths:
  - "packages/bruno-sqlite/**/*"
  - "packages/bruno-electron/src/ipc/sqlite.js"
  - "packages/bruno-electron/src/services/sqlite/**/*"
---

# SQLite SDK (`@usebruno/sqlite`)

Bruno's local database layer. You author **migrations** (`migrations/*.ts`) and **statements**
(`statements/*.sql`); a codegen step compiles them into a typed data layer for the Electron main
process, which owns the database and executes statements. The package has no renderer entry point:
the renderer reaches a statement only through an IPC handler written by hand for that statement in
`bruno-electron`.

**The renderer never sends SQL, and never picks the statement.** Each IPC channel is bound to exactly
one statement in the main process; the renderer sends only that statement's params. Do not add an
IPC handler, statement, or option that accepts SQL text or a statement name from the renderer.

## When to use it — and when not to

Use it for state that is **derived, bulky, or secondary**: data Bruno can rebuild or lose without
corrupting anything the user authored, and that would bloat Redux or the IPC payloads if held in
memory.

It is **not** the right home for:

- **Anything the user authored.** Collections, requests, environments, folders and `bruno.json` live
  on disk as `.bru`/`.yml` — see `.claude/rules/dsl-changes.md`. Never mirror or migrate a
  serialized field into SQLite.
- **App preferences and small keyed state** — those are electron-store JSON files under
  `src/store/` (see `.claude/rules/electron-ipc.md`).
- **UI state** — Redux, or local `useState` (see `.claude/rules/redux-store.md`).

The database file is `bruno.db` under `app.getPath('userData')`, and the file store spills large
payloads to `sqlite-files/` beside it. **Treat both as disposable**: the open path below deletes
and rebuilds the database rather than failing (startup `collect()` then sweeps the spilled files no
row names), so never let either hold the only copy of anything.

## Package layout

```
packages/bruno-sqlite/
  migrations/<seq>_<name>.ts   authored — exports up()/down() returning SQL
  statements/*.sql             authored — sqlc-style annotated statements
  scripts/                     codegen (generate-artifacts), new-migration, verify-migrations,
                               generate-schema
  SCHEMA.md                    GENERATED, committed — ER diagram + table schemas
  src/node/                    db.ts (migrations), statements.ts (prepare/execute)
  src/shared/                  shared types
  src/generated/               GENERATED, gitignored — never edit or commit
  tests/node
```

**`@usebruno/sqlite` (= `/node`) is main-process only** (it imports `node:sqlite`, `node:fs`,
`node:crypto`); never import it from the renderer. The package has zero internal `@usebruno/*`
dependencies and must stay that way.

`src/generated/` is produced from the authored migration and `.sql` files by `npm run generate`
(which `prebuild`/`pretest` run for you). Those authored files are the only source of truth.

## Adding a migration

```bash
npm run migration:new --workspace=packages/bruno-sqlite    # prompts for a name
```

This scaffolds `migrations/<7-digit sequence>_<name>.ts` exporting `up` and `down`, each returning
the SQL to apply or revert:

```ts
export const up = (): string => {
  return 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT);';
}
export const down = (): string => {
  return 'DROP TABLE users;';
}
```

Migrations run at open time, in sequence order, each in its own transaction, and are recorded in a
`_migrations` table with a sha256 of both `up` and `down`.

- **A merged migration is immutable.** Editing one changes its hash; the next open throws
  `does not match the migration already applied`, and `createDatabase` responds by **deleting the
  user's database and rebuilding it**. Add a new migration instead — always.
- **`down` must genuinely revert `up`.** It is not decoration: when the tail migration disappears
  from the code (a user downgrading Bruno, or you switching branches), the recorded `down` is
  executed automatically against the existing database. An empty or wrong `down` corrupts that path.
- Only the **tail** rolls back (recorded sequences above the highest local one). Deleting a
  migration from the middle silently leaves its schema in place — don't.
- Design schema changes to tolerate an older Bruno opening the same file afterwards: prefer new
  tables and nullable columns over reshaping an existing one.

Verify against a real database rather than an empty one — this replays every migration on a
throwaway `VACUUM INTO` copy and then prepares every statement against the result:

```bash
cp .env.example .env    # set DB_PATH to an absolute path to a real bruno.db
npm run migration:verify --workspace=packages/bruno-sqlite
```

`SCHEMA.md` documents the resulting schema: a Mermaid ER diagram plus each table's columns, keys and
indexes, produced by applying every migration to an empty in-memory database. The pre-commit hook
regenerates and stages it whenever a file under `migrations/` is staged; run
`npm run schema --workspace=packages/bruno-sqlite` to regenerate it by hand. Never edit it directly.

## Adding statements

Statements live in `statements/*.sql`, several per file, each introduced by a sqlc-style
annotation. Params are **named** and always passed as an object — there is no positional binding:

```sql
-- name: list_users :many
SELECT id, name, email FROM users ORDER BY name;

-- name: get_user :one
SELECT id, name, email FROM users WHERE id = @id;

-- name: create_user :exec
INSERT INTO users (name, email) VALUES (@name, @email);
```

| annotation | runs as | returns |
|---|---|---|
| `:one` | single row | row or `undefined` |
| `:many` | rows | array |
| `:exec` | write | `{ changes, lastInsertRowid }` |

- Statement names are **globally unique across all `.sql` files** (a duplicate fails codegen).
  Renaming a statement, or moving it to another file, means renaming its IPC channel and every
  renderer call site too.
- Use `@param` for consistency with the existing statements, even though `node:sqlite` also accepts
  `:name` and `$name`.

## Main process

`packages/bruno-electron/src/services/sqlite/index.js` owns the single database instance:
`openDatabase()` calls `createDatabase` on `bruno.db` and starts a background `files.collect()`; the
service exposes `getStatements()`, `getFiles()` (the SDK's file store — see the package README),
`transaction(callback)`, `reclaimDiskSpace()` and `shutdown()`. It never hands out the `DB` itself,
and it knows nothing about IPC. `index.js`'s ready block opens it (`sqliteService.openDatabase()`),
and `before-quit` reclaims disk space and shuts it down.

```js
const { getStatements, transaction } = require('../../services/sqlite');

try {
  transaction(() => {
    getStatements().execute('create_user', { name, email });
  });
} catch (err) {
  // degrade: the database may be unavailable
}
```

`getStatements()` never returns `null`. Before `openDatabase()`, after shutdown, and when
`createDatabase` returns `{ db: undefined, statements: undefined }` (even the in-memory fallback
failed), it returns a stub whose `execute` logs the skipped statement and throws; `getFiles()`
returns a matching stub whose methods log and throw (or reject, for the async ones), and
`transaction` throws the same way. So there is one failure mode, and every caller must handle it:

- **`execute` and `transaction` throw** when the database is unavailable, for an unknown statement,
  for one that couldn't be prepared against this schema (prepare failures are logged at construction
  and only that statement is discarded — the rest of the database stays usable), and for any SQL
  error. Wrap calls in try/catch and stay useful without the database — degrade, don't crash.

`createDatabase` degrades rather than failing: file → (migration error) delete the `bruno.db*` files
and rebuild → in-memory → `undefined`. A real backup is still a `TODO` in `src/node/index.ts`; it
deletes today.

**`node:sqlite` is synchronous — every `execute` blocks the main process.** Keep statements indexed,
bounded, and off hot paths; no full-table scans, no unbounded result sets, no per-event writes in a
tight loop.

## Exposing a statement to the renderer

Only statements the renderer actually needs are exposed, each with its own hand-written
`ipcMain.handle` in `packages/bruno-electron/src/ipc/sqlite.js`. `registerSqliteIpc()` is called in
`index.js` right after `openDatabase()`; each handler calls the service's `getStatements()` per
invocation, so a call after shutdown hits the stub, not a closed database.

The channel name follows a fixed convention: **`datastore:<statement_file>:<statement_name>`**, where
`<statement_file>` is the `.sql` file's name without the extension, written exactly as the file is
named. Channel names are written by hand, not generated.

```js
ipcMain.handle('datastore:runner_responses:get_runner_response', (_event, params) => {
  const request_uid = requireUid(params?.request_uid, 'request_uid');
  return getStatements().execute('get_runner_response', { request_uid });
});
```

- The handler validates and picks the params it forwards — never pass the renderer's object
  straight through to `execute`.
- In the renderer, wrap each channel in a named hook or helper under `src/hooks/useX/index.js`
  (or the relevant util) and call `window.ipcRenderer.invoke(channel, params)` there; no component
  invokes a `datastore:*` channel directly.

## Commands

```bash
npm run build:bruno-sqlite                          # generate + rollup (from the repo root)
npm run watch --workspace=packages/bruno-sqlite     # rebuild on change
npm run test  --workspace=packages/bruno-sqlite     # jest; sets --experimental-sqlite for you
```

`npm run dev` does **not** rebuild this package, and bruno-electron consumes its `dist/` — after
editing anything under `packages/bruno-sqlite`, rebuild or run the watcher or the app keeps the old
statements. Run the tests through the npm script: bare `jest` misses the
`NODE_OPTIONS="--experimental-sqlite"` the repo's Node needs for `node:sqlite`.

## Before you call it done

- [ ] New persistence genuinely belongs here — not `.bru`/`.yml`, electron-store, or Redux
- [ ] No merged migration edited; new schema added as a new migration with a working `down`
- [ ] `npm run generate` output shows the expected statements
- [ ] `migration:verify` run against a real `bruno.db` copy
- [ ] Main-process callers try/catch `execute` / `transaction`, and still work when the database
      is unavailable
- [ ] Each statement the renderer needs has its own `ipcMain.handle` on
      `datastore:<statement_file>:<statement_name>`; renderer access goes through a named hook
- [ ] Package rebuilt (`npm run build:bruno-sqlite`) before testing in the app
- [ ] `npm run test --workspace=packages/bruno-sqlite` plus the affected app/electron specs
