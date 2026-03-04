const { ipcMain } = require('electron');
const { fileCache } = require('../cache/fileCache');

const registerFileCacheIpc = () => {
  ipcMain.handle('renderer:get-file-cache-stats', async () => {
    return fileCache.getStats();
  });

  ipcMain.handle('renderer:clear-file-cache', async () => {
    fileCache.clearAll();
    return { success: true };
  });
};

module.exports = registerFileCacheIpc;
