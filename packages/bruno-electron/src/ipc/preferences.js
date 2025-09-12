const { ipcMain } = require('electron');
const { getPreferences, savePreferences, preferencesUtil } = require('../store/preferences');
const { isDirectory } = require('../utils/filesystem');
const { openCollection } = require('../app/collections');
const { globalEnvironmentsStore } = require('../store/global-environments');
``;
const registerPreferencesIpc = (mainWindow, watcher, lastOpenedCollections) => {
  ipcMain.handle('renderer:ready', async (event) => {
    // load preferences
    const preferences = getPreferences();
    mainWindow.webContents.send('main:load-preferences', preferences);

    // load system proxy vars
    const systemProxyVars = preferencesUtil.getSystemProxyEnvVariables();
    const { http_proxy, https_proxy, no_proxy } = systemProxyVars || {};
    mainWindow.webContents.send('main:load-system-proxy-env', { http_proxy, https_proxy, no_proxy });

    try {
      // load global environments
      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      let activeGlobalEnvironmentUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();
      activeGlobalEnvironmentUid = globalEnvironments?.find(env => env?.uid == activeGlobalEnvironmentUid) ? activeGlobalEnvironmentUid : null;
      mainWindow.webContents.send('main:load-global-environments', { globalEnvironments, activeGlobalEnvironmentUid });
    }
    catch(error) {
      console.error("Error occured while fetching global environements!");
      console.error(error);
    }

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
      // Check if hardware acceleration setting changed
      const currentPreferences = getPreferences();
      const currentHardwareAcceleration = currentPreferences.app?.hardwareAcceleration;
      const newHardwareAcceleration = preferences.app?.hardwareAcceleration;
      
      await savePreferences(preferences);
      
      // If hardware acceleration setting changed, notify user that restart is required
      if (currentHardwareAcceleration !== newHardwareAcceleration) {
        mainWindow.webContents.send('main:hardware-acceleration-changed', {
          requiresRestart: true,
          newValue: newHardwareAcceleration
        });
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerPreferencesIpc;
