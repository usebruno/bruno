# @usebruno/sqlite

SQLite storage for the Bruno API client. You author migrations and statements as `.sql`; the package compiles them into a typed, cached data layer for the Electron main process and the React renderer.

## Entry points

- `@usebruno/sqlite` (or `/node`) — main process. Owns the DB and runs statements.
- `@usebruno/sqlite/web` — renderer. React Query hooks that call statements over IPC.

Peer deps for the web layer: `react` 19, `@tanstack/react-query` 5. The node layer uses the built-in `node:sqlite`.

## Add a migration

```bash
npm run migration:new --workspace=packages/bruno-sqlite   # prompts for a name
```

Fill in the `-- UP` / `-- DOWN` sections:

```sql
-- UP: create_users
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT);

-- DOWN: create_users
DROP TABLE users;
```

Migrations apply automatically (in prefix order) when the DB opens. Verify them against an in-memory DB with `npm run migration:verify`.

## Add statements (sqlc syntax)

Write them in `statements/*.sql` — multiple per file. Each starts with a `-- name:` annotation, and params are named (`@param`):

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

Run `npm run generate` (or `build`) to compile statements into the typed registry.

## Use it — main process

```js
const { createDatabase } = require('@usebruno/sqlite');

const { db, statements } = createDatabase('/path/to/bruno.db');

statements.execute('create_user', { name: 'Ada', email: 'ada@example.com' });
const users = statements.execute('list_users');       // no params
const ada   = statements.execute('get_user', { id: 1 });
// db.close() on shutdown
```

`registerSQLiteIpc(ipcMain, statements)` exposes every statement to the renderer over IPC.

## Use it — renderer

Wrap the app once (Electron's `window.ipcRenderer` works as the bridge):

```jsx
import { SQLiteProvider } from '@usebruno/sqlite/web';

<SQLiteProvider bridge={window.ipcRenderer}>
  <App />
</SQLiteProvider>
```

Then read and write by statement name:

```jsx
import { useSqliteQuery, useSqliteMutation } from '@usebruno/sqlite/web';

const { data, isFetching } = useSqliteQuery('list_users');
const one = useSqliteQuery('get_user', { id: 5 });

const create = useSqliteMutation('create_user');
create.mutate({ name: 'Ada', email: 'ada@x.com' });
```

- `useSqliteQuery(name, params?)` returns the React Query result (`data`, `isFetching`, `error`, `refetch`, …); results are cached.
- `useSqliteMutation(name)` returns `{ mutate, mutateAsync, … }`.
- After a mutation, any query reading an affected table refreshes **automatically** (across windows too) — no manual invalidation needed.

Params are always an **object** keyed by the named parameters (no positional/array binding).

## Development

```bash
npm run build --workspace=packages/bruno-sqlite    # generate + bundle + types
npm run watch --workspace=packages/bruno-sqlite    # rebuild on change
npm run test  --workspace=packages/bruno-sqlite    # jest
```

`.sql` files are the only source of truth committed; `src/generated/` and `dist/` are git-ignored and produced by the build.
