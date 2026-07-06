const path = require('path');
const { app, ipcMain } = require('electron');
const { createDatabase, registerSQLiteIpc, SQLITE_MUTATION_CHANNEL } = require('@usebruno/sqlite');

let dbHandle = null;
let statementsHandle = null;
let mainWindowRef = null;

const registerSqliteIpc = (mainWindow) => {
  mainWindowRef = mainWindow;
  const { db, statements } = createDatabase(path.join(app.getPath('userData'), 'bruno.db'), {
    onMutation: (event) => {
      mainWindowRef?.webContents?.send(SQLITE_MUTATION_CHANNEL, event);
    }
  });
  dbHandle = db;
  statementsHandle = statements;
  registerSQLiteIpc(ipcMain, statements);
};

const getStatements = () => statementsHandle;

const shutdown = () => {
  if (dbHandle) {
    dbHandle.close();
    dbHandle = null;
    statementsHandle = null;
  }
};

module.exports = { registerSqliteIpc, shutdown, getStatements };
