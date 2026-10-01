# @usebruno/sqlite

SQLite storage for the Bruno API client. You author migrations as `.ts` and statements as `.sql`; the package compiles them into a typed, cached data layer for the Electron main process and the React renderer.

## Entry points

- `@usebruno/sqlite` (or `/node`) — main process. Owns the DB and runs statements.
- `@usebruno/sqlite/web` — renderer. React Query hooks that call statements over IPC.

Peer deps for the web layer: `react` 19, `@tanstack/react-query` 5. The node layer uses the built-in `node:sqlite`.

## Add a migration

```bash
npm run migration:new --workspace=packages/bruno-sqlite   # prompts for a name
```

This scaffolds a sequence-prefixed `migrations/<seq>_<name>.ts` file exporting `up` and `down`. Each returns the SQL to apply or revert the migration (a plain string also works):

```ts
export const up = (): string => {
  return 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT);';
}
export const down = (): string => {
  return 'DROP TABLE users;';
}
```

Migrations apply automatically (in prefix order) when the DB opens, and their content is hashed into a `_migrations` table so an already-applied migration can't be silently edited.

### Verify migrations

`npm run migration:verify` replays every migration against a throwaway `VACUUM INTO` copy of a real database, so it exercises them over actual data without touching the source DB. Point it at the DB with an absolute `DB_PATH`:

```bash
cp .env.example .env      # then set DB_PATH to an absolute path
npm run migration:verify --workspace=packages/bruno-sqlite
```

It fails if a migration errors, or if a migration's content no longer matches what was recorded when it was first applied to that DB.

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

## Files

Rows are a poor home for a large payload, so the package ships a `files` table with a store in front
of it. Each entry is kept in whichever shape fits its size:

| size | stored as |
|---|---|
| up to 1MB | a `BLOB` on the row |
| over 1MB | a file next to the database, with the row pointing at it |

`createDatabase` returns the store alongside the statements:

```js
const { db, statements, files } = createDatabase('/path/to/bruno.db');

const entry = await files.write(buffer, { contentType: 'image/png' });  // { id, size, inline, contentType }
const bytes = await files.read(entry.id, { offset: 0, length: 4096 });   // Uint8Array, or null
const text  = await files.readText(entry.id);
files.stat(entry.id);
await files.remove(entry.id);
```

Offsets and lengths are **bytes**. A range read never materialises the whole payload: inline rows are
sliced inside sqlite with `substr()`, spilled ones are read at a position.

The files directory defaults to `<database path minus extension>-files`; pass `filesDir` to place it
elsewhere, and `inlineMaxBytes` to move the threshold.

### Lifetime

A file lives for as long as some row points at it. Declare that with a foreign key:

```sql
ALTER TABLE runner_responses ADD COLUMN body_file_id INTEGER REFERENCES files(id);
```

`files.collect()` reads the foreign keys back off the schema, deletes every row no table references,
removes the files they own, and sweeps files on disk that no row names. Nothing has to be registered
with the store — adding the column is enough. Call it at startup.

As a safety rule, when *no* table references `files` the store leaves rows alone: with no referrers
every row would look unreferenced. The disk sweep still runs.

### Reading files from the renderer

Register the file channel in the main process:

```js
registerFileIpc(ipcMain, files);
```

and read through the hooks, which share the `<SQLiteProvider>` bridge:

```jsx
const { data: entry } = useSqliteFile(fileId);                       // metadata
const { data: text }  = useSqliteFileText(fileId);                   // utf-8
const { data: bytes } = useSqliteFileBytes(fileId, { offset, length });
```

Each IPC reply is capped (4MB by default), and the client walks a longer payload range by range, so a
large file never rides on a single message. Writes are main-process only. After a mutation to `files`,
file reads refresh with everything else.

## Development

```bash
npm run build --workspace=packages/bruno-sqlite    # generate + bundle + types
npm run watch --workspace=packages/bruno-sqlite    # rebuild on change
npm run test  --workspace=packages/bruno-sqlite    # jest
```

`.sql` files are the only source of truth committed; `src/generated/` and `dist/` are git-ignored and produced by the build.
