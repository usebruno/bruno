import { join } from 'node:path';
import { createTestDatabase, type TestDatabase } from '../utils';
import { migrations } from '../../src/generated/node/migrations';

const { DB } = require('../../src/node/db');

const GH_TABLES = ['gh_account', 'gh_collections', 'gh_names', 'gh_queries', 'gh_query_items', 'gh_repos'];
const GH_MIGRATION = 7;
const EARLIER_MIGRATIONS = migrations
  .map((migration) => migration.sequence)
  .filter((sequence) => sequence < GH_MIGRATION)
  .sort((a, b) => a - b);

const tableNames = (db: any): string[] =>
  db._db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
    .all()
    .map((row: { name: string }) => row.name);

const appliedSequences = (db: any): number[] =>
  db._db
    .prepare('SELECT sequence FROM _migrations ORDER BY sequence')
    .all()
    .map((row: { sequence: number }) => row.sequence);

describe('github discovery tables migration', () => {
  let database: TestDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  afterEach(() => {
    database.cleanup();
  });

  it('creates the gh_ tables empty', () => {
    expect(tableNames(database.db)).toEqual(expect.arrayContaining(GH_TABLES));
    GH_TABLES.forEach((table) => {
      expect((database.db as any)._db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count).toBe(0);
    });
  });

  it('keeps the earlier migrations and adds 0000007 after them', () => {
    expect(appliedSequences(database.db)).toEqual([...EARLIER_MIGRATIONS, GH_MIGRATION]);
  });

  it('drops only the gh_ tables when a build without 0000007 opens the database', () => {
    const dbPath = join(database.directory, 'rollback.db');
    const full = new DB(dbPath, migrations);
    const otherTables = tableNames(full).filter((table) => !GH_TABLES.includes(table));
    full.close();

    const older = new DB(dbPath, migrations.filter((migration) => migration.sequence < GH_MIGRATION));

    expect(tableNames(older)).toEqual(otherTables);
    expect(appliedSequences(older)).toEqual(EARLIER_MIGRATIONS);
    older.close();
  });

  it('stores gh_queries, gh_query_items and gh_names without a rowid', () => {
    const withoutRowid = (database.db as any)._db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'gh\\_%' ESCAPE '\\' AND sql LIKE '%WITHOUT ROWID%' ORDER BY name`)
      .all()
      .map((row: { name: string }) => row.name);

    expect(withoutRowid).toEqual(['gh_names', 'gh_queries', 'gh_query_items']);
  });

  it('allows an unknown repo visibility, a repo without a description and a manifest without a name', () => {
    const notNull = (table: string, column: string): number =>
      (database.db as any)._db
        .prepare(`SELECT "notnull" FROM pragma_table_info(?) WHERE name = ?`)
        .get(table, column).notnull;

    expect(notNull('gh_repos', 'visibility')).toBe(0);
    expect(notNull('gh_repos', 'description')).toBe(0);
    expect(notNull('gh_names', 'name')).toBe(0);
  });

  it('requires a 0 or 1 private flag on every repo', () => {
    const insert = (database.db as any)._db.prepare(
      `INSERT INTO gh_repos (repo_id, full_name, owner, name, is_private, last_seen) VALUES (?, 'acme/api', 'acme', 'api', ?, 1)`
    );

    insert.run(1, 0);
    insert.run(2, 1);
    expect(() => insert.run(3, null)).toThrow(/NOT NULL constraint failed/);
    expect(() => insert.run(4, 2)).toThrow(/CHECK constraint failed/);
  });

  it('never reuses the id of a deleted gh_collections row', () => {
    const db = (database.db as any)._db;
    const insert = db.prepare(
      `INSERT INTO gh_collections (repo_id, folder_path, manifest_path, kind, last_seen) VALUES (1, ?, 'bruno.json', 'bruno', 1)`
    );

    insert.run('a');
    const { lastInsertRowid: deletedId } = insert.run('b');
    db.prepare('DELETE FROM gh_collections WHERE id = ?').run(deletedId);
    const { lastInsertRowid: nextId } = insert.run('c');

    expect(Number(nextId)).toBeGreaterThan(Number(deletedId));
  });

  it('indexes gh_repos.full_name without case', () => {
    const plan = (database.db as any)._db
      .prepare(`EXPLAIN QUERY PLAN SELECT repo_id FROM gh_repos WHERE full_name = ? COLLATE NOCASE`)
      .all('Acme/API')
      .map((row: { detail: string }) => row.detail)
      .join(' ');

    expect(plan).toContain('idx_gh_repos_full_name');
  });

  it('allows only one gh_account row', () => {
    const insert = (database.db as any)._db.prepare(
      `INSERT INTO gh_account (id, host, user_id, login, token_hash, updated_at) VALUES (?, 'github.com', 1, 'ada', 'h', 1)`
    );

    insert.run(1);
    expect(() => insert.run(2)).toThrow(/CHECK constraint failed/);
  });

  it('requires each gh_query_items row to point at exactly one of a repo or a collection', () => {
    const insert = (database.db as any)._db.prepare(
      `INSERT INTO gh_query_items (query_key, position, repo_id, collection_id) VALUES ('q', ?, ?, ?)`
    );

    insert.run(0, 1, null);
    insert.run(1, null, 1);
    expect(() => insert.run(2, 1, 1)).toThrow(/CHECK constraint failed/);
    expect(() => insert.run(3, null, null)).toThrow(/CHECK constraint failed/);
  });
});
