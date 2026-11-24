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
