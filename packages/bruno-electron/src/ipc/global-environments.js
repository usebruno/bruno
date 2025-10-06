require('dotenv').config();
const { ipcMain, dialog } = require('electron');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { chooseFileToSave } = require('../utils/filesystem');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const registerGlobalEnvironmentsIpc = (mainWindow) => {

  // GLOBAL ENVIRONMENTS

  ipcMain.handle('renderer:create-global-environment', async (event, { uid, name, variables }) => {
    try {
      globalEnvironmentsStore.addGlobalEnvironment({ uid, name, variables });
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

  // Export single global environment
  ipcMain.handle('renderer:export-global-environment', async (event, { environment, format = 'json', filePath }) => {
    try {
      // Ensure the directory exists
      if (!fsSync.existsSync(filePath)) {
        fsSync.mkdirSync(filePath, { recursive: true });
      }

      const cleanEnvironment = {
        name: environment.name,
        variables: environment.variables.map((variable) => ({
          name: variable.name,
          value: variable.secret ? '' : (variable.value || ''), // Remove secret values
          type: variable.type || 'text',
          enabled: variable.enabled !== false,
          secret: variable.secret || false
        }))
      };

      if (format === 'json') {
        const jsonContent = JSON.stringify(cleanEnvironment, null, 2);
        const fileName = `${cleanEnvironment.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
        const fullPath = path.join(filePath, fileName);
        await fs.writeFile(fullPath, jsonContent, 'utf8');
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerGlobalEnvironmentsIpc;