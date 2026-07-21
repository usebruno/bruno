# @usebruno/sqlite

Typed SQLite data layer for Bruno. You author the **schema** and **statements** with Drizzle; [`@usebruno/sql-gen`](../bruno-sql-gen) generates a typed runtime for the Electron **main** process (`./node`) and the **renderer** (`./web`). Drizzle is a dev-only tool — the runtime executes raw parameterised SQL through Node's built-in `node:sqlite`, so nothing Drizzle ships to production.

## Layout

| Path | What it is | Who writes it |
| --- | --- | --- |
| `src/schema/` | Drizzle tables — the source of truth | **you** |
| `src/statements/` | Named queries built with `sql.placeholder()` | **you** |
| `gen.config.ts` | Generator config: where statements/migrations live, what to emit | rarely |
| `drizzle.config.ts` | `drizzle-kit` config for migrations | rarely |
| `.generated/migrations/` | `drizzle-kit` SQL migrations + journal | generated |
| `generated/node`, `generated/web` | Generated TS runtime (committed) | generated |
| `dist/` | Compiled JS + `.d.ts` (gitignored) | build output |

## Workflow

| Step | Do this | You get |
| --- | --- | --- |
| 1. Define a table | edit `src/schema/*.ts` | a Drizzle table |
| 2. Define statements | edit `src/statements/*.ts` | named, typed queries |
| 3. Generate + build | `npm run migration:generate -w @usebruno/sqlite` | migrations, `generated/{node,web}`, compiled `dist/` |
| 4. Use in main | `require('@usebruno/sqlite/node')` | `migrate`, `createStore`, `registerHandlers` |
| 5. Use in renderer | `import … from '@usebruno/sqlite/web'` | `SqliteProvider`, `useSqlQuery`, `useSqlMutation` |

## Authoring

```ts
// src/schema/log.ts
import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";

export const logsTable = sqliteTable("logs", {
  id: int().primaryKey({ autoIncrement: true }),
  timestamp: int({ mode: "timestamp" }).notNull(),
  level: text({ enum: ["trace", "debug", "info", "warn", "error", "fatal"] }).notNull(),
  message: text(),
});
```

```ts
// src/statements/log.ts
import { db } from "@usebruno/sql-gen";
import { eq, sql } from "drizzle-orm";
import { logsTable } from "../schema/log";

export const insertLog = db.insert(logsTable).values({
  timestamp: sql.placeholder("timestamp"),
  level: sql.placeholder("level"),
  message: sql.placeholder("message"),
});

export const logsByLevel = db.select().from(logsTable).where(eq(logsTable.level, sql.placeholder("level")));
```

## Consuming

```js
// Electron main
const sqlite = require("@usebruno/sqlite/node");
const db = new DatabaseSync(path.join(app.getPath("userData"), "bruno.db"));
sqlite.migrate(db, sqlite.migrations);
sqlite.registerHandlers(db, ipcMain); // one "db:exec" channel
```

```jsx
// Renderer
import { SqliteProvider, useSqlQuery, useSqlMutation } from "@usebruno/sqlite/web";

<SqliteProvider invoke={(channel, payload) => window.ipcRenderer.invoke(channel, payload)}>
  <App />
</SqliteProvider>;

const { data, loading, refetch } = useSqlQuery((db) => db.logsByLevel({ level: "info" }), []);
const [insertLog, { loading: inserting }] = useSqlMutation((db) => db.insertLog);
await insertLog({ timestamp: new Date(), level: "info", message: "hi" });
```

## Validation

Every query and mutation is validated with **zod in the main process** before it touches the database. Types — including enums, nullability, and `Date`/JSON storage transforms — are derived from the schema column each placeholder maps to (resolved from the Drizzle query AST, not by name), so `level` only accepts its enum values and a `timestamp` placeholder accepts `Date | number | ISO string` and is stored as epoch ms.
