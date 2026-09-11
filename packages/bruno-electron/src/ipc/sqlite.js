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
      pragmas: { journal_mode: 'WAL' },
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

module.exports = { registerSqliteIpc, shutdown, getStatements, getDatabase };
