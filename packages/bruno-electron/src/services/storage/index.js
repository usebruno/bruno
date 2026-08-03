const { DatabaseSync } = require('node:sqlite');

// Lazy SQLite connection. The db is opened on first use, pragmas are applied,
// pending migrations are run (tracked via PRAGMA user_version), and prepared
// statements are cached by their SQL text.
class Database {
  #db = null;
  #path;
  #migrations;
  #pragmas;
  #readBigInts;
  #statements = new Map();

  constructor({ path, migrations = [], pragmas, readBigInts = false }) {
    this.#path = path;
    this.#migrations = migrations;
    this.#pragmas = pragmas;
    this.#readBigInts = readBigInts;
    this.#validateMigrations();
  }

  get path() {
    return typeof this.#path === 'function' ? this.#path() : this.#path;
  }

  get schemaVersion() {
    const row = this.#connect().prepare('PRAGMA user_version').get();
    return row.user_version;
  }

  setPath(p) {
    this.close();
    this.#path = p;
  }

  prepare(sql) {
    const db = this.#connect();
    let stmt = this.#statements.get(sql);
    if (!stmt) {
      stmt = db.prepare(sql);
      if (this.#readBigInts) stmt.setReadBigInts(true);
      this.#statements.set(sql, stmt);
    }
    return stmt;
  }

  run(sql, ...params) {
    return this.prepare(sql).run(...params);
  }

  get(sql, ...params) {
    return this.prepare(sql).get(...params);
  }

  all(sql, ...params) {
    return this.prepare(sql).all(...params);
  }

  exec(sql) {
    this.#connect().exec(sql);
  }

  transaction(fn) {
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

  close() {
    if (!this.#db) return;
    this.#statements.clear();
    this.#db.close();
    this.#db = null;
  }

  #connect() {
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

  #migrate(db) {
    if (!this.#migrations.length) return;
    const sorted = [...this.#migrations].sort((a, b) => a.version - b.version);
    let current = db.prepare('PRAGMA user_version').get().user_version;
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

  #validateMigrations() {
    const seen = new Set();
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

module.exports = { Database };
