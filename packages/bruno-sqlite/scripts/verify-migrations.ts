import { DB } from '../src/node/db';
import type { Migration, StatementDef } from '../src/shared/types';
import { loadMigrations, loadStatements } from './lib/sources';
import { vacuumIntoStatement } from './lib/sql';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const main = () => {
  const dbPath = process.env.DB_PATH;
  if (dbPath === undefined || dbPath.trim().length === 0) throw new Error('undefined environment variable DB_PATH.');
  if (!path.isAbsolute(dbPath)) throw new Error('non absolute DB_PATH. provide an absolute path');

  let migrations: Migration[];
  let statements: StatementDef[];
  try {
    migrations = loadMigrations();
    statements = loadStatements();
  } catch (err) {
    console.error(`Failed to load migrations and statements: ${(err as Error).message}`);
    process.exitCode = 1;
    return;
  }

  if (migrations.length === 0 && statements.length === 0) {
    console.log('No migrations or statements to verify.');
    return;
  }

  const unpreparable: { name: string; message: string }[] = [];
  let dbHandle, backupHandle, tempDir;
  try {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sqlite-backup-'));
    const backupPath = path.join(tempDir, 'bruno_backup.db');
    dbHandle = new DatabaseSync(dbPath);
    dbHandle.exec(vacuumIntoStatement(backupPath));
    backupHandle = new DB(backupPath, migrations);

    const migratedDb = backupHandle._db;
    if (migratedDb === undefined) throw new Error('the migrated database is not open.');

    for (const statement of statements) {
      try {
        migratedDb.prepare(statement.sql);
      } catch (err) {
        unpreparable.push({ name: statement.name, message: (err as Error).message });
      }
    }
  } catch (err) {
    console.error(`Migration verification failed: ${(err as Error).stack}`);
    process.exitCode = 1;
    return;
  } finally {
    dbHandle?.close();
    backupHandle?.close();
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (unpreparable.length > 0) {
    console.error(
      `Statement verification failed: ${unpreparable.length} of ${statements.length} statement(s) cannot be prepared against the migrated schema.`
    );
    for (const failure of unpreparable) console.error(`  ${failure.name}: ${failure.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Verified ${migrations.length} migration(s) and ${statements.length} statement(s): all applied cleanly.`
  );
};

main();
