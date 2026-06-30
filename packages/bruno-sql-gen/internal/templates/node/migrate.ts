import type { Migration, SqliteDb } from "./types";

const TABLE = "_migrations";

export function migrate(db: SqliteDb, migrations: Migration[]): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (idx INTEGER PRIMARY KEY, tag TEXT NOT NULL, hash TEXT NOT NULL)`);

  const applied = new Map(
    (db.prepare(`SELECT idx, hash FROM ${TABLE}`).all() as Array<{ idx: number; hash: string }>).map((row) => [
      row.idx,
      row.hash
    ])
  );
  const insert = db.prepare(`INSERT INTO ${TABLE} (idx, tag, hash) VALUES (?, ?, ?)`);
  const done: string[] = [];

  for (const migration of [...migrations].sort((a, b) => a.idx - b.idx)) {
    const previousHash = applied.get(migration.idx);
    if (previousHash !== undefined) {
      if (previousHash !== migration.hash) {
        throw new Error(`migration ${migration.tag} (idx ${migration.idx}) changed since it was applied`);
      }
      continue;
    }

    db.exec("BEGIN");
    try {
      for (const statement of migration.statements) db.exec(statement);
      insert.run(migration.idx, migration.tag, migration.hash);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    done.push(migration.tag);
  }

  return done;
}
