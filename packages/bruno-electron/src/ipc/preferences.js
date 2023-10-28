const { ipcMain } = require('electron');
const { getPreferences, savePreferences } = require('../store/preferences');
const { isDirectory } = require('../utils/filesystem');
const { openCollection } = require('../app/collections');
``;
const registerPreferencesIpc = (mainWindow, watcher, lastOpenedCollections) => {
  ipcMain.handle('renderer:ready', async (event) => {
    // load preferences
    const preferences = getPreferences();
    mainWindow.webContents.send('main:load-preferences', preferences);

    // reload last opened collections
    const lastOpened = lastOpenedCollections.getAll();

    if (lastOpened && lastOpened.length) {
      for (let collectionPath of lastOpened) {
        if (isDirectory(collectionPath)) {
          await openCollection(mainWindow, watcher, collectionPath, {
            dontSendDisplayErrors: true
          });
        }
      }
    }
  });

  ipcMain.on('main:open-preferences', () => {
    mainWindow.webContents.send('main:open-preferences');
  });

  ipcMain.handle('renderer:save-preferences', async (event, preferences) => {
    try {
      await savePreferences(preferences);
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerPreferencesIpc;
