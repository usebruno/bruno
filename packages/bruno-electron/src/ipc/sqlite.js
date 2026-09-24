const fs = require('node:fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const { createDatabase, registerSQLiteIpc, SQLITE_MUTATION_CHANNEL } = require('@usebruno/sqlite');

let ipc = null;

const LEGACY_FILE_INDEX_DB = 'mount-snapshots.db';
const LEGACY_FILE_INDEX_SUFFIXES = ['', '-journal', '-wal', '-shm'];

const removeLegacyFileIndex = () => {
  const legacyPath = path.join(app.getPath('userData'), LEGACY_FILE_INDEX_DB);
  if (!fs.existsSync(legacyPath)) return;

  for (const suffix of LEGACY_FILE_INDEX_SUFFIXES) {
    try {
      fs.rmSync(legacyPath + suffix, { force: true, maxRetries: 3 });
    } catch (err) {
      console.warn(`failed to remove ${LEGACY_FILE_INDEX_DB}${suffix}: `, err);
    }
  }
};

class SqliteEventModel {
  _db = null;
  _statements = null;
  _window = null;
  constructor(window) {
    this._window = window;
    const { db, statements } = createDatabase(path.join(app.getPath('userData'), 'bruno.db'), {
      pragmas: { auto_vacuum: 'INCREMENTAL', journal_mode: 'WAL' },
      onMutation: (event) => {
        this._window?.webContents?.send(SQLITE_MUTATION_CHANNEL, event);
      }
    });
    this._db = db;
    this._statements = statements;
    removeLegacyFileIndex();
    registerSQLiteIpc(ipcMain, statements);
  }

  get statements() {
    return this._statements;
  }

  get db() {
    return this._db;
  }

  shutdown() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._statements = null;
      this._window = null;
    }
  }

  async reclaimDiskSpace({
    pagesBatchSize = 500,
    pagesBatchDelayMs = 30,
    maxReclaimDurationMs = 4000,
    busyTimeoutMs = 500
  } = {}) {
    const raw = this._db?._db;
    if (!raw) return;

    try {
      raw.exec(`PRAGMA busy_timeout = ${busyTimeoutMs}`);

      if (raw.prepare('PRAGMA auto_vacuum').get().auto_vacuum !== 2) {
        raw.exec('VACUUM');
      }

      const start = Date.now();
      while (Date.now() - start < maxReclaimDurationMs) {
        if (raw.prepare('PRAGMA freelist_count').get().freelist_count === 0) break;
        try {
          raw.exec(`PRAGMA incremental_vacuum(${pagesBatchSize})`);
        } catch (err) { }
        await new Promise((resolve) => setTimeout(resolve, pagesBatchDelayMs));
      }
    } catch (err) {
      console.warn('failed to reclaim disk space: ', err);
    }
  }
}

const registerSqliteIpc = (window) => {
  if (ipc) return;
  ipc = new SqliteEventModel(window);
};

const shutdown = () => {
  if (ipc) {
    ipc.shutdown();
    ipc = null;
  }
};

const getStatements = () => (ipc ? ipc.statements : null);

const getDatabase = () => (ipc ? ipc.db : null);

const reclaimDiskSpace = (options) => (ipc ? ipc.reclaimDiskSpace(options) : Promise.resolve());

module.exports = { registerSqliteIpc, shutdown, getStatements, getDatabase, reclaimDiskSpace };
