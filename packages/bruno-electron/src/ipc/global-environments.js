require('dotenv').config();
const { ipcMain } = require('electron');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { generateUniqueName, sanitizeName } = require('../utils/filesystem');

const registerGlobalEnvironmentsIpc = (mainWindow) => {

  // GLOBAL ENVIRONMENTS

  ipcMain.handle('renderer:create-global-environment', async (event, { uid, name, variables }) => {
    try {
      // Get existing global environment names to generate unique name
      const existingGlobalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const existingNames = existingGlobalEnvironments?.map((env) => env.name) || [];

      // Generate unique name based on existing global environment names
      const sanitizedName = sanitizeName(name);
      const uniqueName = generateUniqueName(sanitizedName, (name) => existingNames.includes(name));

      globalEnvironmentsStore.addGlobalEnvironment({ uid, name: uniqueName, variables });

      // Return the unique name that was actually used
      return { name: uniqueName };
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-global-environment', async (event, { environmentUid, variables }) => {
    try {
      globalEnvironmentsStore.saveGlobalEnvironment({ environmentUid, variables })
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:rename-global-environment', async (event, { environmentUid, name }) => {
    try {
      globalEnvironmentsStore.renameGlobalEnvironment({ environmentUid, name });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:delete-global-environment', async (event, { environmentUid }) => {
    try {
      globalEnvironmentsStore.deleteGlobalEnvironment({ environmentUid });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:select-global-environment', async (event, { environmentUid }) => {
    try {
      globalEnvironmentsStore.selectGlobalEnvironment({ environmentUid });
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerGlobalEnvironmentsIpc;