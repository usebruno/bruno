import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DB, DatabaseOptions, isDatabaseMigrationError } from './db';
import { Statements, OnMutation } from './statements';
import { migrations } from '../generated/node/migrations';

export { DB, DatabaseMigrationError, isDatabaseMigrationError } from './db';
export type { DatabaseOptions } from './db';
export { Statements } from './statements';
export type { OnMutation } from './statements';
export { registerSQLiteIpc } from './ipc';
export type { IpcMainLike } from './ipc';
export * from '../shared';

export const version = '0.1.0';

export type CreateDatabaseOptions = DatabaseOptions & {
  onMutation?: OnMutation;
};

const IN_MEMORY_PATH = ':memory:';

const BACKUP_DIRECTORY = 'sqlite-backup';

const DATABASE_FILE_SUFFIXES = ['', '-journal', '-wal', '-shm'];

// TODO (chirag): This has to do a proper backup and create a new one. This requires a thorough
// refinement to handle permission errors and such. Right now, just falling back to deleting the old DB and creating a new one
const deleteDbFiles = (path: string): void => {
  for (const suffix of DATABASE_FILE_SUFFIXES) {
    rmSync(path + suffix, { force: true, maxRetries: 3 });
  }
};

const open = (target: string, options: CreateDatabaseOptions) => {
  const { onMutation, ...dbOptions } = options;
  const db = new DB(target, migrations, dbOptions);
  try {
    return { db, statements: new Statements(db._db!, onMutation) };
  } catch (err) {
    db.close();
    throw err;
  }
};

const openInMemory = (options: CreateDatabaseOptions) => {
  try {
    return open(IN_MEMORY_PATH, options);
  } catch (err) {
    console.error('failed to open in-memory database: ', err);
    return { db: undefined, statements: undefined };
  }
};

const rebuildFromBackup = (cause: unknown, path: string, options: CreateDatabaseOptions) => {
  try {
    deleteDbFiles(path);
    console.warn(`failed to migrate the database, writing a new one: `, cause);
    return open(path, options);
  } catch (err) {
    console.error('failed to rebuild the database after a failed migration: ', err);
    return openInMemory(options);
  }
};

export const createDatabase = (path: string, options: CreateDatabaseOptions = {}): {
  db: DB | undefined;
  statements: Statements | undefined;
} => {
  try {
    return open(path, options);
  } catch (err) {
    if (isDatabaseMigrationError(err) && path !== IN_MEMORY_PATH) return rebuildFromBackup(err, path, options);
    console.warn('failed to open the database file, falling back to an in-memory database: ', err);
    return openInMemory(options);
  }
};
