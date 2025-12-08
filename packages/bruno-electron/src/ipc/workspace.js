const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const { ipcMain, dialog } = require('electron');
const { createDirectory, sanitizeName } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');
const yaml = require('js-yaml');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const { globalEnvironmentsManager } = require('../store/workspace-environments');

// Workspace configuration module (includes path and validation utilities)
const {
  createWorkspaceConfig,
  readWorkspaceConfig,
  writeWorkspaceConfig,
  validateWorkspaceConfig,
  updateWorkspaceName,
  updateWorkspaceDocs,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace,
  getWorkspaceCollections,
  normalizeCollectionEntry,
  validateWorkspacePath,
  validateWorkspaceDirectory
} = require('../utils/workspace-config');

const registerWorkspaceIpc = (mainWindow, workspaceWatcher) => {
  const lastOpenedWorkspaces = new LastOpenedWorkspaces();

  ipcMain.handle('renderer:create-workspace',
    async (event, workspaceName, workspaceFolderName, workspaceLocation) => {
      try {
        workspaceFolderName = sanitizeName(workspaceFolderName);
        const dirPath = path.join(workspaceLocation, workspaceFolderName);

        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          if (files.length > 0) {
            throw new Error(`workspace: ${dirPath} already exists and is not empty`);
          }
        }

        validateWorkspaceDirectory(dirPath);

        if (!fs.existsSync(dirPath)) {
          await createDirectory(dirPath);
        }

        await createDirectory(path.join(dirPath, 'collections'));

        const workspaceUid = generateUidBasedOnHash(dirPath);
        const workspaceConfig = createWorkspaceConfig(workspaceName);

        await writeWorkspaceConfig(dirPath, workspaceConfig);

        lastOpenedWorkspaces.add(dirPath, workspaceConfig);

        mainWindow.webContents.send('main:workspace-opened', dirPath, workspaceUid, workspaceConfig);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(mainWindow, dirPath);
        }

        return {
          workspaceConfig,
          workspaceUid,
          workspacePath: dirPath
        };
      } catch (error) {
        throw error;
      }
    });

  ipcMain.handle('renderer:open-workspace', async (event, workspacePath) => {
    try {
      validateWorkspacePath(workspacePath);

      const workspaceConfig = readWorkspaceConfig(workspacePath);
      validateWorkspaceConfig(workspaceConfig);

      const workspaceUid = generateUidBasedOnHash(workspacePath);

      lastOpenedWorkspaces.add(workspacePath, workspaceConfig);

      mainWindow.webContents.send('main:workspace-opened', workspacePath, workspaceUid, workspaceConfig);

      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }

      return {
        workspaceConfig,
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:open-workspace-dialog', async (event) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Open Workspace',
        buttonLabel: 'Open Workspace'
      });

      if (canceled || filePaths.length === 0) {
        return null;
      }

      const workspacePath = filePaths[0];
      validateWorkspacePath(workspacePath);

      const workspaceConfig = readWorkspaceConfig(workspacePath);
      validateWorkspaceConfig(workspaceConfig);

      const workspaceUid = generateUidBasedOnHash(workspacePath);

      lastOpenedWorkspaces.add(workspacePath, workspaceConfig);

      mainWindow.webContents.send('main:workspace-opened', workspacePath, workspaceUid, workspaceConfig);

      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }

      return {
        workspaceConfig,
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:load-workspace-collections', async (event, workspacePath) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is undefined');
      }

      validateWorkspacePath(workspacePath);
      return getWorkspaceCollections(workspacePath);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:load-workspace-apispecs', async (event, workspacePath) => {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is undefined');
      }

      const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

      if (!fs.existsSync(workspaceFilePath)) {
        throw new Error('Invalid workspace: workspace.yml not found');
      }

      const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
      const workspaceConfig = yaml.load(yamlContent);

      if (!workspaceConfig || typeof workspaceConfig !== 'object') {
        return [];
      }

      const apiSpecs = workspaceConfig.apiSpecs || [];

      const resolvedApiSpecs = apiSpecs.map((apiSpec) => {
        if (apiSpec.path && !path.isAbsolute(apiSpec.path)) {
          return {
            ...apiSpec,
            path: path.join(workspacePath, apiSpec.path)
          };
        }
        return apiSpec;
      });

      return resolvedApiSpecs;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:get-last-opened-workspaces', async () => {
    try {
      const workspaces = lastOpenedWorkspaces.getAll();
      const validWorkspaces = [];
      const invalidWorkspaceUids = [];

      // Check each workspace to see if workspace.yml still exists
      for (const workspace of workspaces) {
        if (workspace.pathname) {
          const workspaceYmlPath = path.join(workspace.pathname, 'workspace.yml');

          if (fs.existsSync(workspaceYmlPath)) {
            validWorkspaces.push(workspace);
          } else {
            invalidWorkspaceUids.push(workspace.uid);
          }
        } else {
          invalidWorkspaceUids.push(workspace.uid);
        }
      }

      // Remove invalid workspaces from preferences
      if (invalidWorkspaceUids.length > 0) {
        for (const uid of invalidWorkspaceUids) {
          lastOpenedWorkspaces.remove(uid);
        }
      }

      return validWorkspaces;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:rename-workspace', async (event, workspacePath, newName) => {
    try {
      await updateWorkspaceName(workspacePath, newName);

      // Update in last opened workspaces
      const workspaces = lastOpenedWorkspaces.getAll();
      const workspaceIndex = workspaces.findIndex((w) => w.pathname === workspacePath);
      if (workspaceIndex !== -1) {
        workspaces[workspaceIndex].name = newName;
        lastOpenedWorkspaces.store.set('workspaces.lastOpenedWorkspaces', workspaces);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:close-workspace', async (event, workspacePath) => {
    try {
      const workspaces = lastOpenedWorkspaces.getAll();
      const filteredWorkspaces = workspaces.filter((w) => w.pathname !== workspacePath);

      lastOpenedWorkspaces.store.set('workspaces.lastOpenedWorkspaces', filteredWorkspaces);

      if (workspaceWatcher) {
        workspaceWatcher.removeWatcher(workspacePath);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:save-workspace-docs', async (event, workspacePath, docs) => {
    try {
      return await updateWorkspaceDocs(workspacePath, docs);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:load-workspace-environments', async (event, workspacePath) => {
    try {
      const result = await globalEnvironmentsManager.getGlobalEnvironments(workspacePath);
      return result.globalEnvironments;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:create-workspace-environment', async (event, workspacePath, environmentName) => {
    try {
      return await globalEnvironmentsManager.createGlobalEnvironment(workspacePath, {
        name: environmentName,
        variables: []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:delete-workspace-environment', async (event, workspacePath, environmentUid) => {
    try {
      return await globalEnvironmentsManager.deleteGlobalEnvironment(workspacePath, { environmentUid });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:select-workspace-environment', async (event, workspacePath, environmentUid) => {
    try {
      return await globalEnvironmentsManager.selectGlobalEnvironment(workspacePath, { environmentUid });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:import-workspace-environment', async (event, workspacePath, environmentData) => {
    try {
      return await globalEnvironmentsManager.createGlobalEnvironment(workspacePath, {
        name: environmentData.name || 'Imported Environment',
        variables: environmentData.variables || []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:update-workspace-environment', async (event, workspacePath, environmentUid, environmentData) => {
    try {
      return await globalEnvironmentsManager.saveGlobalEnvironment(workspacePath, {
        environmentUid,
        variables: environmentData.variables || []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:rename-workspace-environment', async (event, workspacePath, environmentUid, newName) => {
    try {
      return await globalEnvironmentsManager.renameGlobalEnvironment(workspacePath, {
        environmentUid,
        name: newName
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:copy-workspace-environment', async (event, workspacePath, environmentUid, newName) => {
    try {
      const result = await globalEnvironmentsManager.getGlobalEnvironments(workspacePath);
      const sourceEnv = result.globalEnvironments.find((env) => env.uid === environmentUid);

      if (!sourceEnv) {
        throw new Error('Source environment not found');
      }

      // Create new environment with copied variables
      return await globalEnvironmentsManager.createGlobalEnvironment(workspacePath, {
        name: newName,
        variables: sourceEnv.variables || []
      });
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:add-collection-to-workspace', async (event, workspacePath, collection) => {
    try {
      const normalizedCollection = normalizeCollectionEntry(workspacePath, collection);
      const updatedCollections = await addCollectionToWorkspace(workspacePath, normalizedCollection);

      const workspaceConfig = readWorkspaceConfig(workspacePath);
      const workspaceUid = generateUidBasedOnHash(workspacePath);
      mainWindow.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, workspaceConfig);

      return updatedCollections;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:ensure-collections-folder', async (event, workspacePath) => {
    try {
      const collectionsPath = path.join(workspacePath, 'collections');
      if (!fs.existsSync(collectionsPath)) {
        await createDirectory(collectionsPath);
      }
      return collectionsPath;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:start-workspace-watcher', async (event, workspacePath) => {
    try {
      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }
      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:remove-collection-from-workspace', async (event, workspaceUid, workspacePath, collectionPath) => {
    try {
      const result = await removeCollectionFromWorkspace(workspacePath, collectionPath);

      // Delete collection files if it's a workspace collection
      if (result.shouldDeleteFiles && result.removedCollection && fs.existsSync(collectionPath)) {
        await fsExtra.remove(collectionPath);
      }

      const correctWorkspaceUid = generateUidBasedOnHash(workspacePath);
      mainWindow.webContents.send('main:workspace-config-updated', workspacePath, correctWorkspaceUid, result.updatedConfig);

      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:get-collection-workspaces', async (event, collectionPath) => {
    try {
      const workspaces = lastOpenedWorkspaces.getAll();
      const workspacesWithCollection = [];

      for (const workspace of workspaces) {
        if (workspace.pathname) {
          try {
            const workspaceYmlPath = path.join(workspace.pathname, 'workspace.yml');
            if (fs.existsSync(workspaceYmlPath)) {
              const workspaceConfig = yaml.load(fs.readFileSync(workspaceYmlPath, 'utf8')) || {};
              const collections = workspaceConfig.collections || [];

              const hasCollection = collections.some((c) => {
                const resolvedPath = path.isAbsolute(c.path)
                  ? c.path
                  : path.resolve(workspace.pathname, c.path);
                return resolvedPath === collectionPath;
              });

              if (hasCollection) {
                workspacesWithCollection.push(workspace);
              }
            }
          } catch (error) {
            console.warn('Failed to check workspace collection:', error.message);
          }
        }
      }

      return workspacesWithCollection;
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('renderer:get-default-workspace', async (event) => {
    try {
      const result = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();

      if (!result) {
        return null;
      }

      const { workspacePath, workspaceUid } = result;

      const workspaceFilePath = path.join(workspacePath, 'workspace.yml');
      if (!fs.existsSync(workspaceFilePath)) {
        return null;
      }

      const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
      const workspaceConfig = yaml.load(yamlContent);

      return {
        workspaceConfig: {
          ...workspaceConfig,
          type: 'default'
        },
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      return null;
    }
  });

  ipcMain.on('main:renderer-ready', async (win) => {
    try {
      const defaultResult = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();
      if (defaultResult) {
        const { workspacePath, workspaceUid } = defaultResult;
        const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

        if (fs.existsSync(workspaceFilePath)) {
          const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
          const workspaceConfig = yaml.load(yamlContent);

          win.webContents.send('main:workspace-opened', workspacePath, workspaceUid, {
            ...workspaceConfig,
            type: 'default'
          });

          if (workspaceWatcher) {
            workspaceWatcher.addWatcher(win, workspacePath);
          }
        }
      }

      const workspaces = lastOpenedWorkspaces.getAll();
      const invalidWorkspaceUids = [];

      for (const workspace of workspaces) {
        if (workspace.pathname) {
          const workspaceYmlPath = path.join(workspace.pathname, 'workspace.yml');

          if (fs.existsSync(workspaceYmlPath)) {
            try {
              const workspaceConfig = readWorkspaceConfig(workspace.pathname);
              validateWorkspaceConfig(workspaceConfig);
              const workspaceUid = generateUidBasedOnHash(workspace.pathname);

              win.webContents.send('main:workspace-opened', workspace.pathname, workspaceUid, workspaceConfig);

              if (workspaceWatcher) {
                workspaceWatcher.addWatcher(win, workspace.pathname);
              }
            } catch (error) {
              console.error(`Error loading workspace ${workspace.pathname}:`, error);
              invalidWorkspaceUids.push(workspace.uid);
            }
          } else {
            invalidWorkspaceUids.push(workspace.uid);
          }
        } else {
          invalidWorkspaceUids.push(workspace.uid);
        }
      }

      for (const uid of invalidWorkspaceUids) {
        lastOpenedWorkspaces.remove(uid);
      }
    } catch (error) {
      console.error('Error initializing workspaces:', error);
    }
  });
};

module.exports = registerWorkspaceIpc;
