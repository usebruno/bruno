# @usebruno/sql-gen

Dev-time SQL codegen tool. It reads a package's Drizzle schema + statements and emits a typed `node`/`web` data layer (migrations, prepared statements, IPC handler, React hooks). It is built with `tsc` and exposed as the `bruno-sql-gen` bin; it is **not** a runtime dependency of the app. See [`@usebruno/sqlite`](../bruno-sqlite) for the package that uses it.

## How it works

| Stage | Mechanism |
| --- | --- |
| Migrations | `drizzle-kit generate` produces SQL + a journal; the generator inlines them |
| Statements | each query's `.toSQL()` gives raw parameterised SQL; the AST gives each placeholder's column → type, nullability, enum |
| Validation | per-statement **zod** input schema (with `Date → epoch` / object `→ JSON` transforms) |
| Emit | per target — `node` (migrate / createStore / registerHandlers / statements) and `web` (typed client / SqliteProvider / useSqlQuery / useSqlMutation) |
| Build | the consuming package's own `tsc` compiles the generated TS → JS + `.d.ts` |

## Usage

A consuming package provides a `gen.config.ts` and runs the bin (typically chained in its `migration:generate` script):

```ts
// gen.config.ts
export default {
  statements: "./src/statements",
  migrations: "./.generated/migrations",
  out: [
    { dir: "./generated/node", target: "node" as const },
    { dir: "./generated/web", target: "web" as const },
  ],
};
```

```jsonc
// package.json
"scripts": {
  "migration:generate": "drizzle-kit generate && bruno-sql-gen && npm run build"
}
```

Statements are authored against the builder this package exports:

```ts
import { db } from "@usebruno/sql-gen";
```
