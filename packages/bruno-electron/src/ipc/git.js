const { ipcMain } = require('electron');
const { cloneGitRepository } = require('../utils/git');
const { createDirectory, removeDirectory } = require('../utils/filesystem');

const registerGitIpc = (mainWindow) => {
  ipcMain.handle('renderer:clone-git-repository', async (event, { url, path, processUid }) => {
    let directoryCreated = false;
    try {
      await createDirectory(path);
      directoryCreated = true;
      await cloneGitRepository(mainWindow, { url, path, processUid });
      return 'Repository cloned successfully';
    } catch (error) {
      if (directoryCreated) {
        await removeDirectory(path);
      }
      return Promise.reject(error);
    }
  });
};

module.exports = registerGitIpc;
