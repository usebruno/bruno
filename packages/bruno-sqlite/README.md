# @usebruno/sqlite

SQLite storage for the Bruno API client. You author migrations as `.ts` and statements as `.sql`; the package compiles them into a typed data layer for the Electron main process.

## Entry point

`@usebruno/sqlite` (or `/node`) — main process only. Owns the DB and runs statements, using the built-in `node:sqlite`.

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

### Schema

[`SCHEMA.md`](./SCHEMA.md) shows the schema the migrations produce: an ER diagram plus each table's columns, keys and indexes. The pre-commit hook regenerates it whenever a migration is staged; `npm run schema` regenerates it by hand.

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

Params are always an **object** keyed by the named parameters (no positional/array binding).

The package does not expose statements to a renderer. The host application registers its own IPC handler for each statement it wants to expose.

## Development

```bash
npm run build --workspace=packages/bruno-sqlite    # generate + bundle + types
npm run watch --workspace=packages/bruno-sqlite    # rebuild on change
npm run test  --workspace=packages/bruno-sqlite    # jest
```

`.sql` files are the only source of truth committed; `src/generated/` and `dist/` are git-ignored and produced by the build.
