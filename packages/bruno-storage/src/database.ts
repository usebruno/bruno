import { DatabaseSync, StatementSync } from 'node:sqlite';

export type PathLike = string | (() => string);

export interface Migration {
  version: number;
  up: string;
}

export interface DatabaseOptions {
  path: PathLike;
  migrations?: Migration[];
  pragmas?: Record<string, string | number>;
  readBigInts?: boolean;
}

// Lazy SQLite connection. On first use the database is opened, pragmas applied,
// and pending migrations run (tracked by PRAGMA user_version in the db header).
// Prepared statements are cached by SQL text; transaction wraps a callback in
// BEGIN/COMMIT/ROLLBACK.
export class Database {
  #db: DatabaseSync | null = null;
  #path: PathLike;
  #migrations: Migration[];
  #pragmas?: Record<string, string | number>;
  #readBigInts: boolean;
  #statements = new Map<string, StatementSync>();

  constructor(options: DatabaseOptions) {
    this.#path = options.path;
    this.#migrations = options.migrations ?? [];
    this.#pragmas = options.pragmas;
    this.#readBigInts = options.readBigInts ?? false;
    this.#validateMigrations();
  }

  get path(): string {
    return typeof this.#path === 'function' ? this.#path() : this.#path;
  }

  // Current schema version (PRAGMA user_version); 0 before any migration runs.
  get schemaVersion(): number {
    const row = this.#connect().prepare('PRAGMA user_version').get() as { user_version: number };
    return row.user_version;
  }

  setPath(path: PathLike): void {
    this.close();
    this.#path = path;
  }

  prepare(sql: string): StatementSync {
    const db = this.#connect();
    let stmt = this.#statements.get(sql);
    if (!stmt) {
      stmt = db.prepare(sql);
      if (this.#readBigInts) stmt.setReadBigInts(true);
      this.#statements.set(sql, stmt);
    }
    return stmt;
  }

  run(sql: string, ...params: unknown[]) {
    return this.prepare(sql).run(...(params as never[]));
  }

  get(sql: string, ...params: unknown[]) {
    return this.prepare(sql).get(...(params as never[]));
  }

  all(sql: string, ...params: unknown[]) {
    return this.prepare(sql).all(...(params as never[]));
  }

  exec(sql: string): void {
    this.#connect().exec(sql);
  }

  transaction<T>(fn: () => T): T {
    const db = this.#connect();
    db.exec('BEGIN');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    if (!this.#db) return;
    this.#statements.clear();
    this.#db.close();
    this.#db = null;
  }

  #connect(): DatabaseSync {
    if (this.#db) return this.#db;
    const db = new DatabaseSync(this.path);
    if (this.#pragmas) {
      for (const [key, value] of Object.entries(this.#pragmas)) {
        db.exec(`PRAGMA ${key} = ${value};`);
      }
    }
    this.#migrate(db);
    this.#db = db;
    return db;
  }

  #migrate(db: DatabaseSync): void {
    if (!this.#migrations.length) return;
    const sorted = [...this.#migrations].sort((a, b) => a.version - b.version);
    let current = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    for (const migration of sorted) {
      if (migration.version <= current) continue;
      db.exec('BEGIN');
      try {
        db.exec(migration.up);
        db.exec(`PRAGMA user_version = ${migration.version}`);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      current = migration.version;
    }
  }

  #validateMigrations(): void {
    const seen = new Set<number>();
    for (const { version } of this.#migrations) {
      if (!Number.isInteger(version) || version < 1) {
        throw new Error(`Migration version must be a positive integer, got ${version}`);
      }
      if (seen.has(version)) {
        throw new Error(`Duplicate migration version ${version}`);
      }
      seen.add(version);
    }
  }
}
