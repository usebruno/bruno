import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { DB, DatabaseOptions, DatabasePragmas, isDatabaseMigrationError } from './db';
import { Statements } from './statements';
import { FileStore } from './files';
import { migrations } from '../generated/node/migrations';

export { DB, DatabaseMigrationError, isDatabaseMigrationError } from './db';
export type { DatabaseOptions, DatabasePragmas } from './db';
export { Statements } from './statements';
export { FileStore, createFileStore, type FileStoreOptions, type FileLocation } from './files';
export * from '../shared';

export const version = '0.1.0';

export type CreateDatabaseOptions = DatabaseOptions & {
  pragmas?: DatabasePragmas;
  filesDir?: string;
  inlineMaxBytes?: number;
};

const IN_MEMORY_PATH = ':memory:';

const BACKUP_DIRECTORY = 'sqlite-backup';

const DATABASE_FILE_SUFFIXES = ['', '-journal', '-wal', '-shm'];

export type OpenDatabase = {
  db: DB | undefined;
  statements: Statements | undefined;
  files: FileStore | undefined;
};

export const filesDirFor = (path: string): string => {
  if (path === IN_MEMORY_PATH) return join(tmpdir(), `bruno-sqlite-files-${process.pid}`);
  const extension = extname(path);
  return join(dirname(path), `${basename(path, extension)}-files`);
};

// TODO (chirag): This has to do a proper backup and create a new one. This requires a thorough
// refinement to handle permission errors and such. Right now, just falling back to deleting the old DB and creating a new one
const deleteDbFiles = (path: string): void => {
  for (const suffix of DATABASE_FILE_SUFFIXES) {
    rmSync(path + suffix, { force: true, maxRetries: 3 });
  }
};

const open = (target: string, options: CreateDatabaseOptions): OpenDatabase => {
  const { pragmas, filesDir, inlineMaxBytes, ...dbOptions } = options;
  const db = new DB(target, migrations, dbOptions, pragmas);
  try {
    const statements = new Statements(db._db!);
    const files = new FileStore(db._db!, statements, {
      directory: filesDir ?? filesDirFor(target),
      inlineMaxBytes
    });
    return { db, statements, files };
  } catch (err) {
    db.close();
    throw err;
  }
};

const openInMemory = (options: CreateDatabaseOptions): OpenDatabase => {
  try {
    return open(IN_MEMORY_PATH, options);
  } catch (err) {
    console.error('failed to open in-memory database: ', err);
    return { db: undefined, statements: undefined, files: undefined };
  }
};

const rebuildFromBackup = (cause: unknown, path: string, options: CreateDatabaseOptions): OpenDatabase => {
  try {
    deleteDbFiles(path);
    console.warn(`failed to migrate the database, writing a new one: `, cause);
    return open(path, options);
  } catch (err) {
    console.error('failed to rebuild the database after a failed migration: ', err);
    return openInMemory(options);
  }
};

export const createDatabase = (path: string, options: CreateDatabaseOptions = {}): OpenDatabase => {
  try {
    return open(path, options);
  } catch (err) {
    if (isDatabaseMigrationError(err) && path !== IN_MEMORY_PATH) return rebuildFromBackup(err, path, options);
    console.warn('failed to open the database file, falling back to an in-memory database: ', err);
    return openInMemory(options);
  }
};
