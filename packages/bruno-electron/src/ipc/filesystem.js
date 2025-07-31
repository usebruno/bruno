const { ipcMain } = require('electron');
const fs = require('fs');
const fsPromises = require('fs/promises');

const {
  browseDirectory,
  browseFiles
} = require('../utils/filesystem');

const registerFilesystemIpc = (mainWindow) => {
  // Browse directory
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      return await browseDirectory(mainWindow);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Browse files
  ipcMain.handle('renderer:browse-files', async (_, filters, properties) => {
    try {
      return await browseFiles(mainWindow, filters, properties);
    } catch (error) {
      throw error;
    }
  });
};

module.exports = registerFilesystemIpc; 