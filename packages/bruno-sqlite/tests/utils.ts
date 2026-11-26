import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, type CreateDatabaseOptions, type OpenDatabase } from '../src/node/index';

export type TestDatabase = OpenDatabase & {
  directory: string;
  cleanup: () => void;
};

export const createTempDirectory = (prefix = 'bruno-sqlite-'): string => mkdtempSync(join(tmpdir(), prefix));

export const removeDirectory = (directory: string): void => rmSync(directory, { recursive: true, force: true });

export const createTestDatabase = (options: CreateDatabaseOptions = {}): TestDatabase => {
  const directory = createTempDirectory();
  const opened = createDatabase(join(directory, 'bruno.db'), {
    filesDir: join(directory, 'files'),
    ...options
  });

  return {
    ...opened,
    directory,
    cleanup: () => {
      opened.db?.close();
      removeDirectory(directory);
    }
  };
};

export const tableNames = (db: any): string[] =>
  db._db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
    .all()
    .map((row: { name: string }) => row.name);

export const appliedSequences = (db: any): number[] =>
  db._db
    .prepare('SELECT sequence FROM _migrations ORDER BY sequence')
    .all()
    .map((row: { sequence: number }) => row.sequence);
