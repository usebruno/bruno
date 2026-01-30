require('dotenv').config();
const { ipcMain } = require('electron');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { generateUniqueName, sanitizeName } = require('../utils/filesystem');

const registerGlobalEnvironmentsIpc = (mainWindow, workspaceEnvironmentsManager) => {
  ipcMain.handle('renderer:create-global-environment', async (event, { uid, name, variables, workspaceUid, workspacePath }) => {
    try {
      // If workspace path provided, use workspace environments manager
      if (workspacePath && workspaceEnvironmentsManager) {
        const { globalEnvironments } = await workspaceEnvironmentsManager.getGlobalEnvironmentsByPath(workspacePath);
        const existingNames = globalEnvironments?.map((env) => env.name) || [];

        const sanitizedName = sanitizeName(name);
        const uniqueName = generateUniqueName(sanitizedName, (name) => existingNames.includes(name));

        return await workspaceEnvironmentsManager.addGlobalEnvironmentByPath(workspacePath, { uid, name: uniqueName, variables });
      }

      const existingGlobalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const existingNames = existingGlobalEnvironments?.map((env) => env.name) || [];

      const sanitizedName = sanitizeName(name);
      const uniqueName = generateUniqueName(sanitizedName, (name) => existingNames.includes(name));

      globalEnvironmentsStore.addGlobalEnvironment({ uid, name: uniqueName, variables });

      return { name: uniqueName };
    } catch (error) {
      console.error('Error in renderer:create-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-global-environment', async (event, { environmentUid, variables, workspaceUid, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.saveGlobalEnvironmentByPath(workspacePath, { environmentUid, variables });
      }

      globalEnvironmentsStore.saveGlobalEnvironment({ environmentUid, variables });
    } catch (error) {
      console.error('Error in renderer:save-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:rename-global-environment', async (event, { environmentUid, name, workspaceUid, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.renameGlobalEnvironmentByPath(workspacePath, { environmentUid, name });
      }

      globalEnvironmentsStore.renameGlobalEnvironment({ environmentUid, name });
    } catch (error) {
      console.error('Error in renderer:rename-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:delete-global-environment', async (event, { environmentUid, workspaceUid, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.deleteGlobalEnvironmentByPath(workspacePath, { environmentUid });
      }

      globalEnvironmentsStore.deleteGlobalEnvironment({ environmentUid });
    } catch (error) {
      console.error('Error in renderer:delete-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:select-global-environment', async (event, { environmentUid, workspaceUid, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.selectGlobalEnvironmentByPath(workspacePath, { environmentUid });
      }

      globalEnvironmentsStore.selectGlobalEnvironment({ environmentUid });
    } catch (error) {
      console.error('Error in renderer:select-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-global-environments', async (event, { workspaceUid, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.getGlobalEnvironmentsByPath(workspacePath);
      }

      return {
        globalEnvironments: globalEnvironmentsStore.getGlobalEnvironments() || [],
        activeGlobalEnvironmentUid: globalEnvironmentsStore.getActiveGlobalEnvironmentUid()
      };
    } catch (error) {
      console.error('Error in renderer:get-global-environments:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-global-environment-color', async (event, { environmentUid, color, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.updateGlobalEnvironmentColorByPath(workspacePath, { environmentUid, color });
      }

      globalEnvironmentsStore.updateGlobalEnvironmentColor({ environmentUid, color });
    } catch (error) {
      console.error('Error in renderer:update-global-environment-color:', error);
      return Promise.reject(error);
    }
  });
};

module.exports = registerGlobalEnvironmentsIpc;
