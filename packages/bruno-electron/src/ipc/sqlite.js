const path = require('path');
const { app, ipcMain } = require('electron');
const { createDatabase, registerSQLiteIpc, SQLITE_MUTATION_CHANNEL } = require('@usebruno/sqlite');

let ipc = null;

class SqliteEventModel {
  _db = null;
  _statements = null;
  _window = null;
  constructor(window) {
    this._window = window;
    const { db, statements } = createDatabase(path.join(app.getPath('userData'), 'bruno.db'), {
      onMutation: (event) => {
        this._window?.webContents?.send(SQLITE_MUTATION_CHANNEL, event);
      }
    });
    this._db = db;
    this._statements = statements;
    registerSQLiteIpc(ipcMain, statements);
  }

  get statements() {
    return this._statements;
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
  ipc = new SqliteEventModel(window);
};

const shutdown = () => {
  if (ipc) {
    ipc.shutdown();
    ipc = null;
  }
};

module.exports = { registerSqliteIpc, shutdown };
