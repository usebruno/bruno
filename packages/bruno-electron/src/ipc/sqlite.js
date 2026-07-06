const path = require('path');
const { app, ipcMain } = require('electron');
const { createDatabase, registerSQLiteIpc } = require('@usebruno/sqlite');

let dbHandle = null;

const registerSqliteIpc = () => {
  const { db, statements } = createDatabase(path.join(app.getPath('userData'), 'bruno.db'));
  dbHandle = db;
  registerSQLiteIpc(ipcMain, statements);
};

const shutdown = () => {
  if (dbHandle) {
    dbHandle.close();
    dbHandle = null;
  }
};

module.exports = { registerSqliteIpc, shutdown };
