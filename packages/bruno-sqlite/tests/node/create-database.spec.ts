import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const brokenMigrations = {
  migrations: [
    {
      sequence: 1,
      name: 'broken',
      up: 'NOT VALID SQL',
      down: 'DROP TABLE broken'
    }
  ]
};

describe('createDatabase', () => {
  let dir: string;
  let dbPath: string;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'bruno-sqlite-'));
    dbPath = join(dir, 'bruno.db');
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  it('opens the database file when it is accessible', () => {
    const { createDatabase } = require('../../src/node/index');
    const { db, statements } = createDatabase(dbPath);

    expect(db).toBeDefined();
    expect(statements).toBeDefined();
    db.close();
  });

  it('falls back to an in-memory database when the file cannot be opened', () => {
    const { createDatabase } = require('../../src/node/index');

    const { db, statements } = createDatabase(join(dir, 'missing-dir', 'bruno.db'));

    expect(db).toBeDefined();
    expect(statements).toBeDefined();
    expect(warn).toHaveBeenCalled();
    db.close();
  });

  it('backs up an unusable database file and rebuilds it', () => {
    writeFileSync(dbPath, 'this is not a sqlite database');
    const { createDatabase } = require('../../src/node/index');

    const { db, statements } = createDatabase(dbPath);

    expect(db).toBeDefined();
    expect(statements).toBeDefined();
    expect(existsSync(dbPath)).toBe(true);
    expect(db._db.prepare('SELECT name FROM _migrations').all()).toEqual([]);
    db.close();
  });

  it('opens the file database even when a statement cannot be prepared', () => {
    jest.doMock('../../src/generated/node/statements', () => ({
      statements: [{ name: 'broken', sql: 'NOT VALID SQL', type: 'one', tables: [] }]
    }));
    const { createDatabase } = require('../../src/node/index');

    const { db, statements } = createDatabase(dbPath);

    expect(db).toBeDefined();
    expect(statements).toBeDefined();
    db.close();
  });

  it('backs up only once when the migrations themselves are broken', () => {
    jest.doMock('../../src/generated/node/migrations', () => brokenMigrations);
    const { createDatabase } = require('../../src/node/index');

    const { db, statements } = createDatabase(dbPath);

    expect(db).toBeUndefined();
    expect(statements).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
