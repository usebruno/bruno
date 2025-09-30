require('dotenv').config();
const { ipcMain, dialog } = require('electron');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { chooseFileToSave } = require('../utils/filesystem');
const { envJsonToBruV2 } = require('@usebruno/lang');
const fs = require('fs').promises;
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
      const cleanEnvironment = {
        name: environment.name,
        variables: environment.variables.map(variable => ({
          name: variable.name,
          value: variable.secret ? '' : (variable.value || ''), // Remove secret values
          type: variable.type || 'text',
          enabled: variable.enabled !== false,
          secret: variable.secret || false,
        })),
      };

      if (format === 'bru') {
        const bruContent = envJsonToBruV2(cleanEnvironment);
        const fileName = `${cleanEnvironment.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.bru`;
        const fullPath = path.join(filePath, fileName);
        await fs.writeFile(fullPath, bruContent, 'utf8');
      } else if (format === 'json') {
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

  // Export global environments
  ipcMain.handle('renderer:export-global-environments', async (event, { format = 'json' }) => {
    try {
      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();

      if (!globalEnvironments || globalEnvironments.length === 0) {
        throw new Error('No global environments to export');
      }

      if (format === 'json') {
        // Prepare environments for export (remove UIDs, no metadata)
        const exportData = globalEnvironments.map(env => ({
          name: env.name,
          variables: env.variables.map(variable => ({
            name: variable.name,
            value: variable.value,
            type: variable.type || 'text',
            enabled: variable.enabled !== false,
            secret: variable.secret || false,
          })),
        }));

        const fileName = 'global-environments.json';
        const filePath = await chooseFileToSave(mainWindow, fileName);

        if (filePath && filePath.trim() !== '') {
          await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
          // Don't return anything - just complete successfully
        } else {
          throw new Error('Export cancelled by user');
        }
      } else if (format === 'bru') {
        // For BRU format, let user select a directory to save individual .bru files
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          title: 'Select folder to save .bru files',
        });

        if (!filePaths || filePaths.length === 0) {
          throw new Error('Export cancelled by user');
        }

        const exportDir = filePaths[0];

        // Create individual .bru files for each environment
        for (const env of globalEnvironments) {
          const bruContent = envJsonToBruV2(env);
          const sanitizedName = env.name.replace(/[^a-zA-Z0-9-_]/g, '_');
          const fileName = `${sanitizedName}.bru`;
          const filePath = path.join(exportDir, fileName);

          await fs.writeFile(filePath, bruContent, 'utf8');
        }

        // Don't return anything - just complete successfully
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerGlobalEnvironmentsIpc;