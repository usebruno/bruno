import type { SqliteDb } from "./types";
import { statements } from "./statements.generated";

type Prepared = ReturnType<SqliteDb["prepare"]>;
type StatementName = keyof typeof statements;

export interface Store {
  run(name: StatementName, input?: unknown): unknown;
}

export function createStore(db: SqliteDb): Store {
  const prepared = new Map<string, Prepared>();
  for (const [name, statement] of Object.entries(statements)) {
    prepared.set(name, db.prepare(statement.sql));
  }

  return {
    run(name, input) {
      const statement = statements[name];
      const stmt = prepared.get(name as string);
      if (!statement || !stmt) throw new Error(`unknown statement: ${String(name)}`);
      const parsed = statement.input.parse(input ?? {}) as Record<string, unknown>;
      const values = statement.params.map((param) => parsed[param]);
      return statement.kind === "read" ? stmt.all(...values) : stmt.run(...values);
    }
  };
}
