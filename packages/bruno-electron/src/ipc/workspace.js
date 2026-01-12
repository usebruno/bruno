const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const { ipcMain, dialog } = require('electron');
const isDev = require('electron-is-dev');
const { createDirectory, sanitizeName, writeFile, DEFAULT_GITIGNORE } = require('../utils/filesystem');
const yaml = require('js-yaml');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const { globalEnvironmentsManager } = require('../store/workspace-environments');

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
  validateWorkspaceDirectory,
  getWorkspaceUid
} = require('../utils/workspace-config');

const { isValidCollectionDirectory } = require('../utils/filesystem');

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

const prepareWorkspaceConfigForClient = (workspaceConfig, workspacePath, isDefault) => {
  const collections = workspaceConfig.collections || [];
  const filteredCollections = collections
    .map((collection) => {
      if (collection.path && !path.isAbsolute(collection.path)) {
        return { ...collection, path: path.resolve(workspacePath, collection.path) };
      }
      return collection;
    })
    .filter((collection) => collection.path && isValidCollectionDirectory(collection.path));

  const config = {
    ...workspaceConfig,
    collections: filteredCollections
  };

  if (isDefault) {
    return {
      ...config,
      name: DEFAULT_WORKSPACE_NAME,
      type: 'default'
    };
  }
  return config;
};

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

        const workspaceUid = getWorkspaceUid(dirPath);
        const isDefault = workspaceUid === 'default';
        const workspaceConfig = createWorkspaceConfig(workspaceName);

        await writeWorkspaceConfig(dirPath, workspaceConfig);
        await writeFile(path.join(dirPath, '.gitignore'), DEFAULT_GITIGNORE);

        lastOpenedWorkspaces.add(dirPath);

        const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, dirPath, isDefault);

        mainWindow.webContents.send('main:workspace-opened', dirPath, workspaceUid, configForClient);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(mainWindow, dirPath);
        }

        return {
          workspaceConfig: configForClient,
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

      const workspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = workspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);

      lastOpenedWorkspaces.add(workspacePath);

      mainWindow.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }

      return {
        workspaceConfig: configForClient,
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

      const workspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = workspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);

      lastOpenedWorkspaces.add(workspacePath);

      mainWindow.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

      if (workspaceWatcher) {
        workspaceWatcher.addWatcher(mainWindow, workspacePath);
      }

      return {
        workspaceConfig: configForClient,
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

      const specs = workspaceConfig.specs || [];

      const resolvedSpecs = specs.map((spec) => {
        if (spec.path && !path.isAbsolute(spec.path)) {
          return {
            ...spec,
            path: path.join(workspacePath, spec.path)
          };
        }
        return spec;
      });

      return resolvedSpecs;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:get-last-opened-workspaces', async () => {
    try {
      const workspacePaths = lastOpenedWorkspaces.getAll();
      const validWorkspaces = [];
      const invalidPaths = [];

      for (const workspacePath of workspacePaths) {
        const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');

        if (fs.existsSync(workspaceYmlPath)) {
          validWorkspaces.push(workspacePath);
        } else {
          invalidPaths.push(workspacePath);
        }
      }

      for (const invalidPath of invalidPaths) {
        lastOpenedWorkspaces.remove(invalidPath);
      }

      return validWorkspaces;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:rename-workspace', async (event, workspacePath, newName) => {
    try {
      await updateWorkspaceName(workspacePath, newName);
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:close-workspace', async (event, workspacePath) => {
    try {
      lastOpenedWorkspaces.remove(workspacePath);

      if (workspaceWatcher) {
        workspaceWatcher.removeWatcher(workspacePath);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:export-workspace', async (event, workspacePath, workspaceName) => {
    try {
      if (!workspacePath || !fs.existsSync(workspacePath)) {
        throw new Error('Workspace path does not exist');
      }

      const defaultFileName = `${sanitizeName(workspaceName)}.zip`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Workspace',
        defaultPath: defaultFileName,
        filters: [{ name: 'Zip Files', extensions: ['zip'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const ignoredDirectories = ['node_modules', '.git'];

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          resolve();
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        const addDirectoryToArchive = (dirPath, archivePath) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const entryArchivePath = archivePath ? path.join(archivePath, entry.name) : entry.name;

            if (entry.isDirectory()) {
              if (!ignoredDirectories.includes(entry.name)) {
                addDirectoryToArchive(fullPath, entryArchivePath);
              }
            } else {
              archive.file(fullPath, { name: entryArchivePath });
            }
          }
        };

        addDirectoryToArchive(workspacePath, '');
        archive.finalize();
      });

      return { success: true, filePath };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:import-workspace', async (event, zipFilePath, extractLocation) => {
    try {
      if (!zipFilePath || !fs.existsSync(zipFilePath)) {
        throw new Error('Zip file does not exist');
      }

      if (!extractLocation || !fs.existsSync(extractLocation)) {
        throw new Error('Extract location does not exist');
      }

      const tempDir = path.join(extractLocation, `_bruno_temp_${Date.now()}`);
      await fsExtra.ensureDir(tempDir);

      try {
        await extractZip(zipFilePath, { dir: tempDir });

        const extractedItems = fs.readdirSync(tempDir);
        let workspaceDir = tempDir;

        if (extractedItems.length === 1) {
          const singleItem = path.join(tempDir, extractedItems[0]);
          if (fs.statSync(singleItem).isDirectory()) {
            workspaceDir = singleItem;
          }
        }

        const workspaceYmlPath = path.join(workspaceDir, 'workspace.yml');
        if (!fs.existsSync(workspaceYmlPath)) {
          throw new Error('Invalid workspace: workspace.yml not found in the zip file');
        }

        const workspaceConfig = yaml.load(fs.readFileSync(workspaceYmlPath, 'utf8'));
        const workspaceName = workspaceConfig.info.name || 'Imported Workspace';
        const sanitizedName = sanitizeName(workspaceName);

        let finalWorkspacePath = path.join(extractLocation, sanitizedName);
        let counter = 1;
        while (fs.existsSync(finalWorkspacePath)) {
          finalWorkspacePath = path.join(extractLocation, `${sanitizedName} (${counter})`);
          counter++;
        }

        if (workspaceDir !== tempDir) {
          await fsExtra.move(workspaceDir, finalWorkspacePath);
          await fsExtra.remove(tempDir);
        } else {
          await fsExtra.move(tempDir, finalWorkspacePath);
        }

        validateWorkspacePath(finalWorkspacePath);

        const finalConfig = readWorkspaceConfig(finalWorkspacePath);
        validateWorkspaceConfig(finalConfig);

        const workspaceUid = getWorkspaceUid(finalWorkspacePath);
        const isDefault = workspaceUid === 'default';
        const configForClient = prepareWorkspaceConfigForClient(finalConfig, finalWorkspacePath, isDefault);

        lastOpenedWorkspaces.add(finalWorkspacePath);

        mainWindow.webContents.send('main:workspace-opened', finalWorkspacePath, workspaceUid, configForClient);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(mainWindow, finalWorkspacePath);
        }

        return {
          success: true,
          workspaceConfig: configForClient,
          workspaceUid,
          workspacePath: finalWorkspacePath
        };
      } catch (error) {
        await fsExtra.remove(tempDir).catch(() => {});
        throw error;
      }
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
      const workspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = workspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);
      mainWindow.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, configForClient);

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

  ipcMain.handle('renderer:remove-collection-from-workspace', async (event, workspaceUid, workspacePath, collectionPath, options = {}) => {
    try {
      const { deleteFiles = false } = options;
      const result = await removeCollectionFromWorkspace(workspacePath, collectionPath);

      if (deleteFiles && result.removedCollection && fs.existsSync(collectionPath)) {
        await fsExtra.remove(collectionPath);
      }

      const correctWorkspaceUid = getWorkspaceUid(workspacePath);
      const isDefault = correctWorkspaceUid === 'default';
      const configForClient = prepareWorkspaceConfigForClient(result.updatedConfig, workspacePath, isDefault);
      mainWindow.webContents.send('main:workspace-config-updated', workspacePath, correctWorkspaceUid, configForClient);

      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:get-collection-workspaces', async (event, collectionPath) => {
    try {
      const workspacePaths = lastOpenedWorkspaces.getAll();
      const workspacesWithCollection = [];

      for (const workspacePath of workspacePaths) {
        try {
          const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
          if (fs.existsSync(workspaceYmlPath)) {
            const workspaceConfig = yaml.load(fs.readFileSync(workspaceYmlPath, 'utf8')) || {};
            const collections = workspaceConfig.collections || [];

            const hasCollection = collections.some((c) => {
              const resolvedPath = path.isAbsolute(c.path)
                ? c.path
                : path.resolve(workspacePath, c.path);
              return resolvedPath === collectionPath;
            });

            if (hasCollection) {
              workspacesWithCollection.push(workspacePath);
            }
          }
        } catch (error) {
          console.warn('Failed to check workspace collection:', error.message);
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
      const workspaceConfig = readWorkspaceConfig(workspacePath);
      const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, true);

      return {
        workspaceConfig: configForClient,
        workspaceUid,
        workspacePath
      };
    } catch (error) {
      console.error('Error getting default workspace:', error);
      return null;
    }
  });

  // Guard to prevent main:renderer-ready from running multiple times (only needed in dev mode due to strict mode)
  let rendererReadyProcessed = false;

  ipcMain.on('main:renderer-ready', async (win) => {
    if (isDev && rendererReadyProcessed) {
      return;
    }
    rendererReadyProcessed = true;

    try {
      let defaultWorkspacePath = null;

      const defaultResult = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();
      if (defaultResult) {
        const { workspacePath, workspaceUid } = defaultResult;
        defaultWorkspacePath = workspacePath;
        const workspaceConfig = readWorkspaceConfig(workspacePath);
        const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, true);

        win.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

        if (workspaceWatcher) {
          workspaceWatcher.addWatcher(win, workspacePath);
        }
      }

      const workspacePaths = lastOpenedWorkspaces.getAll();
      const invalidPaths = [];

      for (const workspacePath of workspacePaths) {
        if (defaultWorkspacePath && workspacePath === defaultWorkspacePath) {
          continue;
        }

        const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');

        if (fs.existsSync(workspaceYmlPath)) {
          try {
            const workspaceConfig = readWorkspaceConfig(workspacePath);
            validateWorkspaceConfig(workspaceConfig);
            const workspaceUid = getWorkspaceUid(workspacePath);
            const isDefault = workspaceUid === 'default';
            const configForClient = prepareWorkspaceConfigForClient(workspaceConfig, workspacePath, isDefault);

            win.webContents.send('main:workspace-opened', workspacePath, workspaceUid, configForClient);

            if (workspaceWatcher) {
              workspaceWatcher.addWatcher(win, workspacePath);
            }
          } catch (error) {
            console.error(`Error loading workspace ${workspacePath}:`, error);
            invalidPaths.push(workspacePath);
          }
        } else {
          invalidPaths.push(workspacePath);
        }
      }

      for (const invalidPath of invalidPaths) {
        lastOpenedWorkspaces.remove(invalidPath);
      }
    } catch (error) {
      console.error('Error initializing workspaces:', error);
    }
  });
};

module.exports = registerWorkspaceIpc;
