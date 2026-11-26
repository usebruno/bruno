import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { appliedSequences, createTestDatabase, tableNames, type TestDatabase } from '../utils';
import { migrations } from '../../src/generated/node/migrations';

const { DB } = require('../../src/node/db');

const GH_TABLES = ['gh_account', 'gh_collections', 'gh_names', 'gh_queries', 'gh_query_items', 'gh_repos'];
const GH_MIGRATION = 7;
const EARLIER_MIGRATIONS = migrations.filter((migration) => migration.sequence < GH_MIGRATION);
const UP_TO_GH_MIGRATION = migrations.filter((migration) => migration.sequence <= GH_MIGRATION);
const TOKEN_HASH = 'a'.repeat(64);

const queryPlan = (db: any, sql: string): string =>
  db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all('Acme/API')
    .map((row: { detail: string }) => row.detail)
    .join(' ');

describe('github discovery tables migration', () => {
  let database: TestDatabase;
  let db: any;

  beforeEach(() => {
    database = createTestDatabase();
    db = (database.db as any)._db;
  });

  afterEach(() => {
    database.cleanup();
  });

  it('creates the gh_ tables empty', () => {
    expect(tableNames(database.db)).toEqual(expect.arrayContaining(GH_TABLES));
    GH_TABLES.forEach((table) => {
      expect(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count).toBe(0);
    });
  });

  it('applies 0000007 along with the earlier migrations', () => {
    const applied = appliedSequences(database.db);

    expect(applied).toContain(GH_MIGRATION);
    EARLIER_MIGRATIONS.forEach((migration) => expect(applied).toContain(migration.sequence));
  });

  describe('when a build without 0000007 opens the database', () => {
    const openWithoutGhMigration = (seed: (raw: any) => void = () => {}) => {
      const dbPath = join(database.directory, 'rollback.db');
      const full = new DB(dbPath, UP_TO_GH_MIGRATION);
      seed(full._db);
      const otherTables = tableNames(full).filter((table) => !GH_TABLES.includes(table));
      full.close();

      return { dbPath, otherTables, older: new DB(dbPath, EARLIER_MIGRATIONS) };
    };

    it('drops only the gh_ tables', () => {
      const { otherTables, older } = openWithoutGhMigration();

      expect(tableNames(older)).toEqual(otherTables);
      expect(appliedSequences(older)).toEqual(EARLIER_MIGRATIONS.map((migration) => migration.sequence).sort((a, b) => a - b));
      older.close();
    });

    it('leaves no dropped repo names readable in the file', () => {
      const { dbPath, older } = openWithoutGhMigration((raw) => {
        const insert = raw.prepare(
          `INSERT INTO gh_repos (repo_id, full_name, owner, name, is_private, last_seen) VALUES (?, ?, 'acme', 'secret', 1, 1)`
        );
        for (let i = 0; i < 200; i++) insert.run(i, `acme/secret-repo-${i}`);
      });
      older.close();

      expect(readFileSync(dbPath).toString('latin1')).not.toContain('acme/secret-repo-');
    });
  });

  it('stores gh_queries, gh_query_items and gh_names without a rowid', () => {
    const withoutRowid = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'gh\\_%' ESCAPE '\\' AND sql LIKE '%WITHOUT ROWID%' ORDER BY name`)
      .all()
      .map((row: { name: string }) => row.name);

    expect(withoutRowid).toEqual(['gh_names', 'gh_queries', 'gh_query_items']);
  });

  it('allows an unknown repo visibility, a repo without a description and a manifest without a name', () => {
    const notNull = (table: string, column: string): number =>
      db.prepare(`SELECT "notnull" FROM pragma_table_info(?) WHERE name = ?`).get(table, column).notnull;

    expect(notNull('gh_repos', 'visibility')).toBe(0);
    expect(notNull('gh_repos', 'description')).toBe(0);
    expect(notNull('gh_names', 'name')).toBe(0);
  });

  it('requires a 0 or 1 private flag on every repo', () => {
    const insert = db.prepare(
      `INSERT INTO gh_repos (repo_id, full_name, owner, name, is_private, last_seen) VALUES (?, 'acme/api', 'acme', 'api', ?, 1)`
    );

    insert.run(1, 0);
    insert.run(2, 1);
    expect(() => insert.run(3, null)).toThrow(/NOT NULL constraint failed/);
    expect(() => insert.run(4, 2)).toThrow(/CHECK constraint failed/);
  });

  it('never reuses the id of a deleted gh_collections row', () => {
    const insert = db.prepare(
      `INSERT INTO gh_collections (repo_id, folder_path, manifest_path, kind, last_seen) VALUES (1, ?, 'bruno.json', 'bruno', 1)`
    );

    insert.run('a');
    const { lastInsertRowid: deletedId } = insert.run('b');
    db.prepare('DELETE FROM gh_collections WHERE id = ?').run(deletedId);
    const { lastInsertRowid: nextId } = insert.run('c');

    expect(Number(nextId)).toBeGreaterThan(Number(deletedId));
  });

  it('allows one gh_collections row per repo and folder', () => {
    const insert = db.prepare(
      `INSERT INTO gh_collections (repo_id, folder_path, manifest_path, kind, last_seen) VALUES (?, ?, 'bruno.json', 'bruno', 1)`
    );

    insert.run(1, 'api');
    insert.run(1, 'web');
    insert.run(2, 'api');
    expect(() => insert.run(1, 'api')).toThrow(/UNIQUE constraint failed/);
  });

  it('finds gh_repos.full_name in any case through its index', () => {
    db.prepare(
      `INSERT INTO gh_repos (repo_id, full_name, owner, name, is_private, last_seen) VALUES (1, 'acme/api', 'acme', 'api', 0, 1)`
    ).run();

    expect(db.prepare('SELECT repo_id AS repoId FROM gh_repos WHERE full_name = ?').get('Acme/API')).toEqual({ repoId: 1 });
    [
      'SELECT repo_id FROM gh_repos WHERE full_name = ?',
      'SELECT repo_id FROM gh_repos WHERE full_name = ? COLLATE NOCASE'
    ].forEach((sql) => {
      expect(queryPlan(db, sql)).toMatch(/SEARCH .*idx_gh_repos_full_name \(full_name=\?\)/);
    });
  });

  it('indexes last_seen on gh_queries, gh_repos and gh_collections', () => {
    const index = (name: string) => ({
      table: db.prepare('SELECT tbl_name FROM sqlite_master WHERE type = ? AND name = ?').get('index', name)?.tbl_name,
      columns: db
        .prepare('SELECT name FROM pragma_index_info(?)')
        .all(name)
        .map((row: { name: string }) => row.name)
    });

    expect(index('idx_gh_queries_last_seen')).toEqual({ table: 'gh_queries', columns: ['last_seen'] });
    expect(index('idx_gh_repos_last_seen')).toEqual({ table: 'gh_repos', columns: ['last_seen'] });
    expect(index('idx_gh_collections_last_seen')).toEqual({ table: 'gh_collections', columns: ['last_seen'] });
  });

  it('allows only one gh_account row', () => {
    const insert = db.prepare(
      `INSERT INTO gh_account (id, host, user_id, login, token_hash, updated_at) VALUES (?, 'github.com', 1, 'ada', ?, 1)`
    );

    insert.run(1, TOKEN_HASH);
    expect(() => insert.run(2, TOKEN_HASH)).toThrow(/CHECK constraint failed/);
  });

  it('accepts a sha256 hex token hash and refuses a raw GitHub token', () => {
    const insert = db.prepare(
      `INSERT OR REPLACE INTO gh_account (id, host, user_id, login, token_hash, updated_at) VALUES (1, 'github.com', 1, 'ada', ?, 1)`
    );

    insert.run(TOKEN_HASH);
    expect(() => insert.run(`ghp_${'x'.repeat(36)}`)).toThrow(/CHECK constraint failed/);
    expect(() => insert.run(`github_pat_${'x'.repeat(82)}`)).toThrow(/CHECK constraint failed/);
  });

  it('requires each gh_query_items row to point at exactly one of a repo or a collection', () => {
    const insert = db.prepare(
      `INSERT INTO gh_query_items (query_key, position, repo_id, collection_id) VALUES ('q', ?, ?, ?)`
    );

    insert.run(0, 1, null);
    insert.run(1, null, 1);
    expect(() => insert.run(2, 1, 1)).toThrow(/CHECK constraint failed/);
    expect(() => insert.run(3, null, null)).toThrow(/CHECK constraint failed/);
  });
});
