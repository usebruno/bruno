import { DatabaseSync, DatabaseSyncOptions } from "node:sqlite"
import { createHash } from "node:crypto"
import type { Migration } from "../shared/types"

export type DatabaseOptions = DatabaseSyncOptions

export class DB {
  _db: DatabaseSync | undefined = undefined
  _migrations_table: string = `CREATE TABLE IF NOT EXISTS _migrations (
    sequence INTEGER NOT NULL UNIQUE,
    name TEXT PRIMARY KEY,
    up TEXT NOT NULL,
    down TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    up_hash TEXT NOT NULL,
    down_hash TEXT NOT NULL
  )`

  constructor(path: string, migrations: Migration[], options: DatabaseOptions = {}) {
    this._db = new DatabaseSync(path, options)
    try {
      this._runMigrations(migrations)
    } catch (err) {
      this._db.close();
      this._db = undefined;
      throw err;
    }
  }

  _runMigrations(migrations: Migration[]) {
    if (this._db === undefined) return

    const db = this._db
    db.exec(this._migrations_table)

    const available = [...migrations].sort((a, b) => a.sequence - b.sequence)
    const maxSequence = available.length ? available[available.length - 1].sequence : 0

    this._rollbackObsolete(db, maxSequence)
    this._applyPending(db, available)
  }

  _rollbackObsolete(db: DatabaseSync, maxSequence: number): void {
    const obsolete = db
      .prepare(`SELECT sequence, down FROM _migrations WHERE sequence > ? ORDER BY sequence DESC`)
      .all(maxSequence) as { sequence: number; down: string }[]

    const deleteStmt = db.prepare(`DELETE FROM _migrations WHERE sequence = ?`)
    for (const row of obsolete) {
      this._transaction(() => {
        db.exec(row.down)
        deleteStmt.run(row.sequence)
      })
    }
  }

  _applyPending(db: DatabaseSync, migrations: Migration[]): void {
    const appliedRows = db
      .prepare(`SELECT sequence, up_hash, down_hash FROM _migrations`)
      .all() as { sequence: number; up_hash: string; down_hash: string }[]
    const applied = new Map(appliedRows.map(row => [row.sequence, row] as const))

    const insertStmt = db.prepare(
      `INSERT INTO _migrations (sequence, name, up, down, up_hash, down_hash) VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (const migration of migrations) {
      const upHash = this._hash(migration.up)
      const downHash = this._hash(migration.down)

      const existing = applied.get(migration.sequence)
      if (existing !== undefined) {
        if (existing.up_hash !== upHash || existing.down_hash !== downHash) {
          throw new Error(
            `Migration "${migration.name}" (sequence ${migration.sequence}) does not match the migration already applied to the database. It may have been modified after being applied.`
          )
        }
        continue
      }

      this._transaction(() => {
        db.exec(migration.up)
        insertStmt.run(
          migration.sequence,
          migration.name,
          migration.up,
          migration.down,
          upHash,
          downHash
        )
      })
    }
  }

  _transaction(fn: () => void): void {
    if (this._db === undefined) return
    const db = this._db
    db.exec('BEGIN')
    try {
      fn()
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }

  _hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  close(): void {
    if (this._db === undefined) return
    this._db.close()
    this._db = undefined
  }
}
