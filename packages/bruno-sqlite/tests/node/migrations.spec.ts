import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Migration } from '../../src/shared/types';

const { DB } = require('../../src/node/db');

const m1: Migration = {
  sequence: 1,
  name: 'create-alpha',
  up: 'CREATE TABLE alpha (id INTEGER PRIMARY KEY)',
  down: 'DROP TABLE alpha'
};

const m2: Migration = {
  sequence: 2,
  name: 'create-beta',
  up: 'CREATE TABLE beta (id INTEGER PRIMARY KEY)',
  down: 'DROP TABLE beta'
};

const tableExists = (db: any, name: string): boolean =>
  db._db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) !== undefined;

const appliedSequences = (db: any): number[] =>
  db._db
    .prepare('SELECT sequence FROM _migrations ORDER BY sequence')
    .all()
    .map((row: { sequence: number }) => row.sequence);

describe('DB migrations', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bruno-sqlite-'));
    dbPath = join(dir, 'test.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('applies pending migrations in order and records them', () => {
    const db = new DB(dbPath, [m2, m1]);

    expect(tableExists(db, 'alpha')).toBe(true);
    expect(tableExists(db, 'beta')).toBe(true);
    expect(appliedSequences(db)).toEqual([1, 2]);

    db.close();
  });

  it('is idempotent when re-run with the same migrations', () => {
    const first = new DB(dbPath, [m1]);
    first._db.prepare('INSERT INTO alpha (id) VALUES (1)').run();
    first.close();

    const second = new DB(dbPath, [m1]);

    expect(tableExists(second, 'alpha')).toBe(true);
    expect(second._db.prepare('SELECT COUNT(*) AS n FROM alpha').get().n).toBe(1);
    expect(appliedSequences(second)).toEqual([1]);

    second.close();
  });

  it('throws when an already-applied migration was modified', () => {
    const first = new DB(dbPath, [m1]);
    first.close();

    const modified: Migration = { ...m1, up: 'CREATE TABLE alpha (id INTEGER PRIMARY KEY, extra TEXT)' };

    expect(() => new DB(dbPath, [modified])).toThrow(/does not match the migration already applied/);
  });

  it('rolls back applied migrations no longer present in code', () => {
    const first = new DB(dbPath, [m1, m2]);
    first.close();

    const second = new DB(dbPath, [m1]);

    expect(tableExists(second, 'alpha')).toBe(true);
    expect(tableExists(second, 'beta')).toBe(false);
    expect(appliedSequences(second)).toEqual([1]);

    second.close();
  });
});
