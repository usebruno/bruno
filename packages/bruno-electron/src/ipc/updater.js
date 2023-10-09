const _ = require('lodash');
const path = require('path');
const { ipcMain, shell, app } = require('electron');

const registerUpdaterIpc = () => {
  ipcMain.handle('renderer:current-version', (event) => {
    return app.getVersion();
  });
};

module.exports = registerUpdaterIpc;
