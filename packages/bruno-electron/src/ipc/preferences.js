const { ipcMain } = require('electron');
const { getPreferences, savePreferences, preferencesUtil } = require('../store/preferences');
const { isDirectory } = require('../utils/filesystem');
const { openCollection } = require('../app/collections');
const { globalEnvironmentsStore } = require('../store/global-environments');

const registerPreferencesIpc = (mainWindow, watcher, lastOpenedCollections) => {
  ipcMain.handle('renderer:ready', async () => {
    // load preferences
    const preferences = getPreferences();
    mainWindow.webContents.send('main:load-preferences', preferences);

    // load system proxy vars
    const { http_proxy, https_proxy, no_proxy } = preferencesUtil.getSystemProxyEnvVariables() || {};
    mainWindow.webContents.send('main:load-system-proxy-env', { http_proxy, https_proxy, no_proxy });

    // load global environments
    const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
    let activeGlobalEnvironmentUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();
    activeGlobalEnvironmentUid = globalEnvironments?.find(env => env?.uid == activeGlobalEnvironmentUid) ? activeGlobalEnvironmentUid : null;
    mainWindow.webContents.send('main:load-global-environments', { globalEnvironments, activeGlobalEnvironmentUid });

    // reload last opened collections
    const lastOpened = lastOpenedCollections.getAll();
    const invalidDirectories = [];

    if (lastOpened && lastOpened.length) {
      for (const collectionPath of lastOpened) {
        if (isDirectory(collectionPath)) {
          await openCollection(mainWindow, watcher, collectionPath, { dontSendDisplayErrors: true });
        } else {
          invalidDirectories.push(collectionPath);
        }
      }
    }

    const updatedLastOpenedCollections = lastOpened.filter(coll => !invalidDirectories.includes(coll));
    lastOpenedCollections.update(updatedLastOpenedCollections);
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