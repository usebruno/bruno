require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const { utils: { jsonToDotenv } } = require('@usebruno/common');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { generateUniqueName, sanitizeName, writeFile, isValidDotEnvFilename } = require('../utils/filesystem');
const { readWorkspaceConfig, writeWorkspaceConfig } = require('../utils/workspace-config');

/**
 * Migrates activeEnvironmentUid from workspace.yml to the electron store (per-workspace).
 * This handles users upgrading from versions that stored the active global env in workspace.yml.
 *
 * Fallback chain:
 * 1. Per-workspace electron store (already migrated) - use it
 * 2. workspace.yml activeEnvironmentUid - migrate to electron store, remove from file
 * 3. Legacy electron store activeGlobalEnvironmentUid - migrate to per-workspace store
 * 4. null (new workspace)
 */
const migrateActiveGlobalEnvironmentUid = async (workspacePath) => {
  // Already in per-workspace store (null means explicitly "No Environment", undefined means not set)
  const perWorkspaceUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUidForWorkspace(workspacePath);
  if (perWorkspaceUid !== undefined) {
    return perWorkspaceUid;
  }

  // Try workspace.yml
  try {
    const config = readWorkspaceConfig(workspacePath);
    if (config.activeEnvironmentUid) {
      const uid = config.activeEnvironmentUid;
      // Migrate to electron store
      globalEnvironmentsStore.setActiveGlobalEnvironmentUidForWorkspace(workspacePath, uid);
      // Rewrite workspace.yml without activeEnvironmentUid (generateYamlContent drops unknown fields)
      await writeWorkspaceConfig(workspacePath, config);
      return uid;
    }
  } catch (error) {
    // workspace.yml may not exist or be unreadable, continue to next fallback
  }

  // Fallback to legacy single active uid
  const legacyUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();
  if (legacyUid) {
    globalEnvironmentsStore.setActiveGlobalEnvironmentUidForWorkspace(workspacePath, legacyUid);
    return legacyUid;
  }

  return null;
};

const registerGlobalEnvironmentsIpc = (mainWindow, workspaceEnvironmentsManager) => {
  ipcMain.handle('renderer:create-global-environment', async (event, { uid, name, variables, color, workspaceUid, workspacePath }) => {
    try {
      // If workspace path provided, use workspace environments manager
      if (workspacePath && workspaceEnvironmentsManager) {
        const { globalEnvironments } = await workspaceEnvironmentsManager.getGlobalEnvironmentsByPath(workspacePath);
        const existingNames = globalEnvironments?.map((env) => env.name) || [];

        const sanitizedName = sanitizeName(name);
        const uniqueName = generateUniqueName(sanitizedName, (name) => existingNames.includes(name));

        return await workspaceEnvironmentsManager.addGlobalEnvironmentByPath(workspacePath, { uid, name: uniqueName, variables, color });
      }

      const existingGlobalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const existingNames = existingGlobalEnvironments?.map((env) => env.name) || [];

      const sanitizedName = sanitizeName(name);
      const uniqueName = generateUniqueName(sanitizedName, (name) => existingNames.includes(name));

      globalEnvironmentsStore.addGlobalEnvironment({ uid, name: uniqueName, variables, color });

      return { name: uniqueName, color };
    } catch (error) {
      console.error('Error in renderer:create-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-global-environment', async (event, { environmentUid, variables, color, workspaceUid, workspacePath }) => {
    try {
      if (workspacePath && workspaceEnvironmentsManager) {
        return await workspaceEnvironmentsManager.saveGlobalEnvironmentByPath(workspacePath, { environmentUid, variables, color });
      }

      globalEnvironmentsStore.saveGlobalEnvironment({ environmentUid, variables, color });
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
        await workspaceEnvironmentsManager.deleteGlobalEnvironmentByPath(workspacePath, { environmentUid });
        // Clear active environment for this workspace if the deleted one was active
        const activeUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUidForWorkspace(workspacePath);
        if (activeUid === environmentUid) {
          globalEnvironmentsStore.setActiveGlobalEnvironmentUidForWorkspace(workspacePath, null);
        }
      } else {
        globalEnvironmentsStore.deleteGlobalEnvironment({ environmentUid });
      }
    } catch (error) {
      console.error('Error in renderer:delete-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:select-global-environment', async (event, { environmentUid, workspacePath }) => {
    try {
      if (workspacePath) {
        globalEnvironmentsStore.setActiveGlobalEnvironmentUidForWorkspace(workspacePath, environmentUid || null);
      } else {
        globalEnvironmentsStore.setActiveGlobalEnvironmentUid(environmentUid || null);
      }
    } catch (error) {
      console.error('Error in renderer:select-global-environment:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-global-environments', async (event, { workspaceUid, workspacePath }) => {
    try {
      let globalEnvironments = [];

      if (workspacePath && workspaceEnvironmentsManager) {
        const result = await workspaceEnvironmentsManager.getGlobalEnvironmentsByPath(workspacePath);
        globalEnvironments = result?.globalEnvironments || [];
      } else {
        globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments() || [];
      }

      const activeGlobalEnvironmentUid = workspacePath
        ? await migrateActiveGlobalEnvironmentUid(workspacePath)
        : globalEnvironmentsStore.getActiveGlobalEnvironmentUid();

      return {
        globalEnvironments,
        activeGlobalEnvironmentUid
      };
    } catch (error) {
      console.error('Error in renderer:get-global-environments:', error);
      return Promise.reject(error);
    }
  });

  // Save workspace .env file variables
  ipcMain.handle('renderer:save-workspace-dotenv-variables', async (event, { workspacePath, variables, filename = '.env' }) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(workspacePath, filename);
      const content = jsonToDotenv(variables);
      await writeFile(dotEnvPath, content);

      return { success: true };
    } catch (error) {
      console.error('Error saving workspace .env file:', error);
      return Promise.reject(error);
    }
  });

  // Save workspace .env file raw content
  ipcMain.handle('renderer:save-workspace-dotenv-raw', async (event, { workspacePath, content, filename = '.env' }) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(workspacePath, filename);
      await writeFile(dotEnvPath, content);

      return { success: true };
    } catch (error) {
      console.error('Error saving workspace .env file:', error);
      return Promise.reject(error);
    }
  });

  // Create workspace .env file
  ipcMain.handle('renderer:create-workspace-dotenv-file', async (event, { workspacePath, filename = '.env' }) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(workspacePath, filename);

      if (fs.existsSync(dotEnvPath)) {
        throw new Error(`${filename} file already exists`);
      }

      await writeFile(dotEnvPath, '');

      return { success: true };
    } catch (error) {
      console.error('Error creating workspace .env file:', error);
      return Promise.reject(error);
    }
  });

  // Delete workspace .env file
  ipcMain.handle('renderer:delete-workspace-dotenv-file', async (event, { workspacePath, filename = '.env' }) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      if (!isValidDotEnvFilename(filename)) {
        throw new Error('Invalid .env filename');
      }

      const dotEnvPath = path.join(workspacePath, filename);

      if (!fs.existsSync(dotEnvPath)) {
        throw new Error(`${filename} file does not exist`);
      }

      fs.unlinkSync(dotEnvPath);

      return { success: true };
    } catch (error) {
      console.error('Error deleting workspace .env file:', error);
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
