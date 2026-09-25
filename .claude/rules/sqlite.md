---
paths:
  - "packages/bruno-sqlite/**/*"
  - "packages/bruno-electron/src/ipc/sqlite.js"
---

# SQLite SDK (`@usebruno/sqlite`)

Bruno's local database layer. You author **migrations** (`migrations/*.ts`) and **statements**
(`statements/*.sql`); a codegen step compiles them into a typed data layer with two entry points —
the Electron main process owns the database and executes statements; the renderer calls those same
statements by name over IPC through React Query hooks that cache results and invalidate themselves
when a write touches a table they read.

Statement names are the only API. **The renderer never sends SQL** — it sends a statement name and
a params object, and the main process looks that name up in the generated registry. Do not add an
IPC handler, statement, or option that accepts SQL text from the renderer.

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
- **UI state** — Redux, or local `useState` (see `.claude/rules/redux-store.md`). Rows read through
  the hooks are React Query cache entries; don't copy them into a slice.

The database file is `bruno.db` under `app.getPath('userData')`. **Treat it as disposable**: the
open path below deletes and rebuilds it rather than failing, so never let it hold the only copy of
anything.

## Package layout

```
packages/bruno-sqlite/
  migrations/<seq>_<name>.ts   authored — exports up()/down() returning SQL
  statements/*.sql             authored — sqlc-style annotated statements
  scripts/                     codegen (generate-artifacts), new-migration, verify-migrations
  src/node/                    db.ts (migrations), statements.ts (prepare/execute), ipc.ts
  src/web/                     provider.tsx, use-sqlite.ts, tables.ts (invalidation predicate)
  src/shared/                  types + IPC channel/key constants
  src/generated/               GENERATED, gitignored — never edit or commit
  tests/node, tests/web
```

Two entry points, and the boundary is absolute: **`@usebruno/sqlite` (= `/node`) is main-process
only** (it imports `node:sqlite`, `node:fs`, `node:crypto`); **`@usebruno/sqlite/web` is renderer
only** (peer deps `react` 19 + `@tanstack/react-query` 5). Never import one from the other's
process. The package has zero internal `@usebruno/*` dependencies and must stay that way.

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

| annotation | runs as | returns | mutation event |
|---|---|---|---|
| `:one` | single row | row or `undefined` | no |
| `:many` | rows | array | no |
| `:exec` | write | `{ changes, lastInsertRowid }` | yes, on success |

- Statement names are **globally unique across all `.sql` files** (a duplicate fails codegen) and
  are the contract between main and renderer — renaming one means updating both call sites.
- Use `@param` for consistency with the existing statements, even though `node:sqlite` also accepts
  `:name` and `$name`.
- **Codegen extracts the tables each statement touches, and cache invalidation depends on it.** If
  `node-sql-parser` can't parse your SQL it logs `Could not determine the tables for statement` and
  records `tables: []` — the statement still works, but reads of it never refresh and writes of it
  never invalidate anything. Read the `npm run generate` output; an empty table list is a bug.

## Main process

`packages/bruno-electron/src/ipc/sqlite.js` owns the single instance: it calls `createDatabase`
with an `onMutation` callback that forwards the event to the window, registers
`registerSQLiteIpc(ipcMain, statements)`, and exposes `getStatements()`. It is wired in
`index.js`'s ready block (`registerSqliteIpc(mainWindow)`) and torn down in `before-quit`.

```js
const { getStatements } = require('../sqlite');

const statements = getStatements();
if (!statements) return false;              // always null-check
statements.execute('create_user', { name, email });
const user = statements.execute('get_user', { id });
```

Two failure modes every caller must handle:

- **`getStatements()` returns `null`** before registration and after shutdown, and `createDatabase`
  returns `{ db: undefined, statements: undefined }` when even the in-memory fallback fails. A
  caller must stay useful without the database — degrade, don't throw.
- **`execute` throws** for an unknown statement, for one that couldn't be prepared against this
  schema (prepare failures are logged at construction and only that statement is discarded — the
  rest of the database stays usable), and for any SQL error. Wrap writes in try/catch.

`createDatabase` degrades rather than failing: file → (migration error) delete the `bruno.db*` files
and rebuild → in-memory → `undefined`. A real backup is still a `TODO` in `src/node/index.ts`; it
deletes today.

**`node:sqlite` is synchronous — every `execute` blocks the main process.** Keep statements indexed,
bounded, and off hot paths; no full-table scans, no unbounded result sets, no per-event writes in a
tight loop.

## Renderer

`SQLiteProvider` wraps the app once in `pages/Main.js` with `window.ipcRenderer` as the bridge —
the preload's `invoke` + `on` (which strips the Electron event arg and returns an unsubscribe) is
exactly the `SQLiteBridge` shape. It owns its own `QueryClient`.

```jsx
const { data, isFetching } = useSqliteQuery('list_users');
const user = useSqliteQuery('get_user', { id }, { enabled: Boolean(id) });

const { mutateAsync } = useSqliteMutation('create_user');
```

- **Wrap every statement in a named hook** under `src/hooks/useX/index.js` and let components use
  that; no component calls `useSqliteQuery`/`useSqliteMutation` with a raw statement name.
- `useSqliteQuery` only accepts read statements and `useSqliteMutation` only write ones; the types
  are generated from the annotations. The query key is `['sqlite', name, params]`, and the third
  argument takes the usual React Query options (`enabled`, `select`, …).
- **Invalidation is per-table, not per-row.** After a successful `:exec`, main sends
  `{ name, tables }` on `SQLITE_MUTATION_CHANNEL` and the provider invalidates every sqlite query
  whose statement reads one of those tables — every params variant of it. A row written in several
  steps therefore refetches every reader on each write: gate the read with `enabled` until the row
  is final, rather than adding manual invalidation.
- The broadcast goes to the window registered with `registerSqliteIpc`; Bruno has one renderer
  window, so don't design around multi-window fan-out that isn't wired.

## Commands

```bash
npm run build:bruno-sqlite                          # generate + rollup (from the repo root)
npm run watch --workspace=packages/bruno-sqlite     # rebuild on change
npm run test  --workspace=packages/bruno-sqlite     # jest; sets --experimental-sqlite for you
```

`npm run dev` does **not** rebuild this package, and both bruno-app and bruno-electron consume its
`dist/` — after editing anything under `packages/bruno-sqlite`, rebuild or run the watcher or the
app keeps the old statements. Run the tests through the npm script: bare `jest` misses the
`NODE_OPTIONS="--experimental-sqlite"` the repo's Node needs for `node:sqlite`.

## Before you call it done

- [ ] New persistence genuinely belongs here — not `.bru`/`.yml`, electron-store, or Redux
- [ ] No merged migration edited; new schema added as a new migration with a working `down`
- [ ] `npm run generate` output shows the expected statements **and no empty table list**
- [ ] `migration:verify` run against a real `bruno.db` copy
- [ ] Main-process callers null-check `getStatements()` and try/catch `execute`, and still work
      when the database is unavailable
- [ ] Renderer access goes through a named hook; no raw statement names in components
- [ ] Package rebuilt (`npm run build:bruno-sqlite`) before testing in the app
- [ ] `npm run test --workspace=packages/bruno-sqlite` plus the affected app/electron specs
