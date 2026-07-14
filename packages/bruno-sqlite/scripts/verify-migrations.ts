import { DB } from "../src/node/db"
import type { Migration } from "../src/shared/types"
import { loadMigrations } from "./lib/sources"
import { DatabaseSync } from 'node:sqlite'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'


const main = () => {
  const dbPath = process.env.DB_PATH;
  if (dbPath === undefined || dbPath.trim().length === 0) throw new Error('undefined environment variable DB_PATH. create a .env file.')
  if (!path.isAbsolute(dbPath)) throw new Error('non absolute DB_PATH. provide an absolute path')

  let migrations: Migration[]
  try {
    migrations = loadMigrations()
  } catch (err) {
    console.error(`Failed to load migrations: ${(err as Error).message}`)
    process.exit(1)
  }

  if (migrations.length === 0) {
    console.log("No migrations to verify.")
    return
  }
  let dbHandle, backupHandle, tempDir;
  try {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-sqlite-backup-'))
    const backupPath = path.join(tempDir, 'bruno_backup.db')
    dbHandle = new DatabaseSync(dbPath)
    dbHandle.exec(`VACUUM INTO '${backupPath}'`)
    backupHandle = new DB(backupPath, migrations)
  } catch (err) {
    console.error(`Migration verification failed: ${(err as Error).stack}`)
    process.exitCode = 1
    return
  } finally {
    dbHandle?.close()
    backupHandle?.close();
    if (tempDir) fs.rmSync(tempDir, {recursive: true, force: true})
  }

  console.log(`Verified ${migrations.length} migration(s): all statements applied cleanly.`)
}

main()
