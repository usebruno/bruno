const { ipcMain, app } = require('electron');
const { userDataUtil } = require('../store/user-data');
const fs = require('fs/promises');
const fsExtra = require('fs-extra');
const path = require('path');
const { isEmptyDir } = require('../utils/filesystem');

const registerUserDataIpc = (mainWindow) => {
  ipcMain.handle('renderer:load-user-data', async (event) => {
    // load stored user data path and send to renderer
    const userDataPath = userDataUtil.getUserDataPath();
    mainWindow.webContents.send('main:load-user-data', userDataPath);
  });

  ipcMain.on('main:open-preferences', () => {
    mainWindow.webContents.send('main:open-preferences');
  });

  ipcMain.handle('renderer:save-user-data', async (event, userData) => {
    try {
      await saveUserData(userData);
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

const updateUserData = async (oldUserData, newUserData) => {
  try {
    // Check if newUserData exists
    await fsExtra.ensureDir(newUserData);

    if (path.resolve(oldUserData) === path.resolve(newUserData)) {
      // Paths are the same, no need to copy
      return;
    }
    if (!(await isEmptyDir(newUserData))) {
      throw new Error('The new user data directory is not empty.');
    }
    // Check permissions (read/write)
    await fs.access(newUserData, fs.constants.R_OK | fs.constants.W_OK);
    // Copy all contents from oldUserData to newUserData
    await fs.cp(oldUserData, newUserData, { recursive: true });

    app.setPath('userData', newUserData);
  } catch (error) {
    throw new Error(`Failed to update user data: ${error.message}`);
  }
};

const saveUserData = async (newPath) => {
  const oldPath = userDataUtil.getUserDataPath();
  if (oldPath && oldPath !== newPath) {
    await updateUserData(oldPath, newPath);
    userDataUtil.setUserDataPath(newPath);
  }
};

module.exports = registerUserDataIpc;
