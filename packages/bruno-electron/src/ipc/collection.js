const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { ipcMain, shell, dialog, app } = require('electron');
const { envJsonToBru, bruToJson, jsonToBru, jsonToCollectionBru } = require('../bru');

const {
  isValidPathname,
  writeFile,
  hasBruExtension,
  isDirectory,
  browseDirectory,
  browseFiles,
  browseFile,
  createDirectory,
  searchForBruFiles,
  sanitizeDirectoryName,
  isWSLPath,
  normalizeWslPath,
  normalizeAndResolvePath,
  safeToRename
} = require('../utils/filesystem');
const { openCollectionDialog } = require('../app/collections');
const { generateUidBasedOnHash, stringifyJson, safeParseJSON, safeStringifyJSON } = require('../utils/common');
const { moveRequestUid, deleteRequestUid } = require('../cache/requestUids');
const { deleteCookiesForDomain, getDomainsWithCookies } = require('../utils/cookies');
const EnvironmentSecretsStore = require('../store/env-secrets');
const CollectionSecurityStore = require('../store/collection-security');
const UiStateSnapshotStore = require('../store/ui-state-snapshot');

const environmentSecretsStore = new EnvironmentSecretsStore();
const collectionSecurityStore = new CollectionSecurityStore();
const uiStateSnapshotStore = new UiStateSnapshotStore();

const envHasSecrets = (environment = {}) => {
  const secrets = _.filter(environment.variables, (v) => v.secret);

  return secrets && secrets.length > 0;
};

const registerRendererEventHandlers = (mainWindow, watcher, lastOpenedCollections) => {
  // browse directory
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      return await browseDirectory(mainWindow);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // browse directory for file
  ipcMain.handle('renderer:browse-files', async (event, pathname, request, filters) => {
    try {
      const filePaths = await browseFiles(mainWindow, filters);

      return filePaths;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // browse directory for one file
  ipcMain.handle('renderer:browse-file', async (event, pathname, request, filters) => {
    try {
      const filePath = await browseFile(mainWindow, filters);

      return filePath;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // create collection
  ipcMain.handle(
    'renderer:create-collection',
    async (event, collectionName, collectionFolderName, collectionLocation) => {
      try {
        const dirPath = path.join(collectionLocation, collectionFolderName);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);

          if (files.length > 0) {
            throw new Error(`collection: ${dirPath} already exists and is not empty`);
          }
        }

        if (!isValidPathname(dirPath)) {
          throw new Error(`collection: invalid pathname - ${dir}`);
        }

        if (!fs.existsSync(dirPath)) {
          await createDirectory(dirPath);
        }

        const uid = generateUidBasedOnHash(dirPath);
        const brunoConfig = {
          version: '1',
          name: collectionName,
          type: 'collection',
          ignore: ['node_modules', '.git']
        };
        const content = await stringifyJson(brunoConfig);
        await writeFile(path.join(dirPath, 'bruno.json'), content);

        mainWindow.webContents.send('main:collection-opened', dirPath, uid, brunoConfig);
        ipcMain.emit('main:collection-opened', mainWindow, dirPath, uid, brunoConfig);
      } catch (error) {
        return Promise.reject(error);
      }
    }
  );
  // clone collection
  ipcMain.handle(
    'renderer:clone-collection',
    async (event, collectionName, collectionFolderName, collectionLocation, previousPath) => {
      const dirPath = path.join(collectionLocation, collectionFolderName);
      if (fs.existsSync(dirPath)) {
        throw new Error(`collection: ${dirPath} already exists`);
      }

      if (!isValidPathname(dirPath)) {
        throw new Error(`collection: invalid pathname - ${dir}`);
      }

      // create dir
      await createDirectory(dirPath);
      const uid = generateUidBasedOnHash(dirPath);

      // open the bruno.json of previousPath
      const brunoJsonFilePath = path.join(previousPath, 'bruno.json');
      const content = fs.readFileSync(brunoJsonFilePath, 'utf8');

      //Change new name of collection
      let json = JSON.parse(content);
      json.name = collectionName;
      const cont = await stringifyJson(json);

      // write the bruno.json to new dir
      await writeFile(path.join(dirPath, 'bruno.json'), cont);

      // Now copy all the files with extension name .bru along with there dir
      const files = searchForBruFiles(previousPath);

      for (const sourceFilePath of files) {
        const relativePath = path.relative(previousPath, sourceFilePath);
        const newFilePath = path.join(dirPath, relativePath);

        // handle dir of files
        fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
        // copy each files
        fs.copyFileSync(sourceFilePath, newFilePath);
      }

      mainWindow.webContents.send('main:collection-opened', dirPath, uid, json);
      ipcMain.emit('main:collection-opened', mainWindow, dirPath, uid);
    }
  );
  // rename collection
  ipcMain.handle('renderer:rename-collection', async (event, newName, collectionPathname) => {
    try {
      const brunoJsonFilePath = path.join(collectionPathname, 'bruno.json');
      const content = fs.readFileSync(brunoJsonFilePath, 'utf8');
      const json = JSON.parse(content);

      json.name = newName;

      const newContent = await stringifyJson(json);
      await writeFile(brunoJsonFilePath, newContent);

      // todo: listen for bruno.json changes and handle it in watcher
      // the app will change the name of the collection after parsing the bruno.json file contents
      mainWindow.webContents.send('main:collection-renamed', {
        collectionPathname,
        newName
      });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-folder-root', async (event, folder) => {
    try {
      const { name: folderName, root: folderRoot, pathname: folderPathname } = folder;
      const folderBruFilePath = path.join(folderPathname, 'folder.bru');

      folderRoot.meta = {
        name: folderName
      };

      const content = jsonToCollectionBru(
        folderRoot,
        true // isFolder
      );
      await writeFile(folderBruFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });
  ipcMain.handle('renderer:save-collection-root', async (event, collectionPathname, collectionRoot) => {
    try {
      const collectionBruFilePath = path.join(collectionPathname, 'collection.bru');

      const content = jsonToCollectionBru(collectionRoot);
      await writeFile(collectionBruFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // new request
  ipcMain.handle('renderer:new-request', async (event, pathname, request) => {
    try {
      if (fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} already exists`);
      }

      const content = jsonToBru(request);
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save request
  ipcMain.handle('renderer:save-request', async (event, pathname, request) => {
    try {
      if (!fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} does not exist`);
      }

      const content = jsonToBru(request);
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save multiple requests
  ipcMain.handle('renderer:save-multiple-requests', async (event, requestsToSave) => {
    try {
      for (let r of requestsToSave) {
        const request = r.item;
        const pathname = r.pathname;

        if (!fs.existsSync(pathname)) {
          throw new Error(`path: ${pathname} does not exist`);
        }

        const content = jsonToBru(request);
        await writeFile(pathname, content);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // create environment
  ipcMain.handle('renderer:create-environment', async (event, collectionPathname, name, variables) => {
    try {
      const envDirPath = path.join(collectionPathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const envFilePath = path.join(envDirPath, `${name}.bru`);
      if (fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} already exists`);
      }

      const environment = {
        name: name,
        variables: variables || []
      };

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = envJsonToBru(environment);

      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save environment
  ipcMain.handle('renderer:save-environment', async (event, collectionPathname, environment) => {
    try {
      const envDirPath = path.join(collectionPathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const envFilePath = path.join(envDirPath, `${environment.name}.bru`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = envJsonToBru(environment);
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename environment
  ipcMain.handle('renderer:rename-environment', async (event, collectionPathname, environmentName, newName) => {
    try {
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.bru`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      const newEnvFilePath = path.join(envDirPath, `${newName}.bru`);
      if (!safeToRename(envFilePath, newEnvFilePath)) {
        throw new Error(`environment: ${newEnvFilePath} already exists`);
      }

      fs.renameSync(envFilePath, newEnvFilePath);

      environmentSecretsStore.renameEnvironment(collectionPathname, environmentName, newName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete environment
  ipcMain.handle('renderer:delete-environment', async (event, collectionPathname, environmentName) => {
    try {
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.bru`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      fs.unlinkSync(envFilePath);

      environmentSecretsStore.deleteEnvironment(collectionPathname, environmentName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item', async (event, oldPath, newPath, newName) => {
    try {
      // Normalize paths if they are WSL paths
      oldPath = isWSLPath(oldPath) ? normalizeWslPath(oldPath) : normalizeAndResolvePath(oldPath);
      newPath = isWSLPath(newPath) ? normalizeWslPath(newPath) : normalizeAndResolvePath(newPath);

      // Check if the old path exists
      if (!fs.existsSync(oldPath)) {
        throw new Error(`path: ${oldPath} does not exist`);
      }

      if (!safeToRename(oldPath, newPath)) {
        throw new Error(`path: ${newPath} already exists`);
      }

      if (isDirectory(oldPath)) {
        const bruFilesAtSource = await searchForBruFiles(oldPath);

        for (let bruFile of bruFilesAtSource) {
          const newBruFilePath = bruFile.replace(oldPath, newPath);
          moveRequestUid(bruFile, newBruFilePath);
        }
        return fs.renameSync(oldPath, newPath);
      }

      const isBru = hasBruExtension(oldPath);
      if (!isBru) {
        throw new Error(`path: ${oldPath} is not a bru file`);
      }

      // update name in file and save new copy, then delete old copy
      const data = fs.readFileSync(oldPath, 'utf8');
      const jsonData = bruToJson(data);

      jsonData.name = newName;
      moveRequestUid(oldPath, newPath);

      const content = jsonToBru(jsonData);
      await fs.unlinkSync(oldPath);
      await writeFile(newPath, content);

      return newPath;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // new folder
  ipcMain.handle('renderer:new-folder', async (event, pathname) => {
    try {
      if (!fs.existsSync(pathname)) {
        fs.mkdirSync(pathname);
      } else {
        return Promise.reject(new Error('The directory already exists'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete file/folder
  ipcMain.handle('renderer:delete-item', async (event, pathname, type) => {
    try {
      if (type === 'folder') {
        if (!fs.existsSync(pathname)) {
          return Promise.reject(new Error('The directory does not exist'));
        }

        // delete the request uid mappings
        const bruFilesAtSource = await searchForBruFiles(pathname);
        for (let bruFile of bruFilesAtSource) {
          deleteRequestUid(bruFile);
        }

        fs.rmSync(pathname, { recursive: true, force: true });
      } else if (['http-request', 'graphql-request'].includes(type)) {
        if (!fs.existsSync(pathname)) {
          return Promise.reject(new Error('The file does not exist'));
        }

        deleteRequestUid(pathname);

        fs.unlinkSync(pathname);
      } else {
        return Promise.reject();
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:open-collection', () => {
    if (watcher && mainWindow) {
      openCollectionDialog(mainWindow, watcher);
    }
  });

  ipcMain.handle('renderer:remove-collection', async (event, collectionPath) => {
    if (watcher && mainWindow) {
      console.log(`watcher stopWatching: ${collectionPath}`);
      watcher.removeWatcher(collectionPath, mainWindow);
      lastOpenedCollections.remove(collectionPath);
    }
  });

  ipcMain.handle('renderer:import-collection', async (event, collection, collectionLocation) => {
    try {
      let collectionName = sanitizeDirectoryName(collection.name);
      let collectionPath = path.join(collectionLocation, collectionName);

      if (fs.existsSync(collectionPath)) {
        throw new Error(`collection: ${collectionPath} already exists`);
      }

      // Recursive function to parse the collection items and create files/folders
      const parseCollectionItems = (items = [], currentPath) => {
        items.forEach((item) => {
          if (['http-request', 'graphql-request'].includes(item.type)) {
            const content = jsonToBru(item);
            const filePath = path.join(currentPath, `${item.name}.bru`);
            fs.writeFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            const folderPath = path.join(currentPath, item.name);
            fs.mkdirSync(folderPath);

            if (item?.root?.meta?.name) {
              const folderBruFilePath = path.join(folderPath, 'folder.bru');
              const folderContent = jsonToCollectionBru(
                item.root,
                true // isFolder
              );
              fs.writeFileSync(folderBruFilePath, folderContent);
            }

            if (item.items && item.items.length) {
              parseCollectionItems(item.items, folderPath);
            }
          }
          // Handle items of type 'js'
          if (item.type === 'js') {
            const filePath = path.join(currentPath, `${item.name}.js`);
            fs.writeFileSync(filePath, item.fileContent);
          }
        });
      };

      const parseEnvironments = (environments = [], collectionPath) => {
        const envDirPath = path.join(collectionPath, 'environments');
        if (!fs.existsSync(envDirPath)) {
          fs.mkdirSync(envDirPath);
        }

        environments.forEach((env) => {
          const content = envJsonToBru(env);
          const filePath = path.join(envDirPath, `${env.name}.bru`);
          fs.writeFileSync(filePath, content);
        });
      };

      const getBrunoJsonConfig = (collection) => {
        let brunoConfig = collection.brunoConfig;

        if (!brunoConfig) {
          brunoConfig = {
            version: '1',
            name: collection.name,
            type: 'collection',
            ignore: ['node_modules', '.git']
          };
        }

        return brunoConfig;
      };

      await createDirectory(collectionPath);

      const uid = generateUidBasedOnHash(collectionPath);
      const brunoConfig = getBrunoJsonConfig(collection);
      const stringifiedBrunoConfig = await stringifyJson(brunoConfig);

      // Write the Bruno configuration to a file
      await writeFile(path.join(collectionPath, 'bruno.json'), stringifiedBrunoConfig);

      const collectionContent = jsonToCollectionBru(collection.root);
      await writeFile(path.join(collectionPath, 'collection.bru'), collectionContent);

      mainWindow.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid, brunoConfig);

      lastOpenedCollections.add(collectionPath);

      // create folder and files based on collection
      await parseCollectionItems(collection.items, collectionPath);
      await parseEnvironments(collection.environments, collectionPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:clone-folder', async (event, itemFolder, collectionPath) => {
    try {
      if (fs.existsSync(collectionPath)) {
        throw new Error(`folder: ${collectionPath} already exists`);
      }

      // Recursive function to parse the folder and create files/folders
      const parseCollectionItems = (items = [], currentPath) => {
        items.forEach((item) => {
          if (['http-request', 'graphql-request'].includes(item.type)) {
            const content = jsonToBru(item);
            const filePath = path.join(currentPath, `${item.name}.bru`);
            fs.writeFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            const folderPath = path.join(currentPath, item.name);
            fs.mkdirSync(folderPath);

            // If folder has a root element, then I should write its folder.bru file
            if (item.root) {
              const folderContent = jsonToCollectionBru(item.root, true);
              if (folderContent) {
                const bruFolderPath = path.join(folderPath, `folder.bru`);
                fs.writeFileSync(bruFolderPath, folderContent);
              }
            }

            if (item.items && item.items.length) {
              parseCollectionItems(item.items, folderPath);
            }
          }
        });
      };

      await createDirectory(collectionPath);

      // If initial folder has a root element, then I should write its folder.bru file
      if (itemFolder.root) {
        const folderContent = jsonToCollectionBru(itemFolder.root, true);
        if (folderContent) {
          const bruFolderPath = path.join(collectionPath, `folder.bru`);
          fs.writeFileSync(bruFolderPath, folderContent);
        }
      }

      // create folder and files based on another folder
      await parseCollectionItems(itemFolder.items, collectionPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:resequence-items', async (event, itemsToResequence) => {
    try {
      for (let item of itemsToResequence) {
        const bru = fs.readFileSync(item.pathname, 'utf8');
        const jsonData = bruToJson(bru);

        if (jsonData.seq !== item.seq) {
          jsonData.seq = item.seq;
          const content = jsonToBru(jsonData);
          await writeFile(item.pathname, content);
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-file-item', async (event, itemPath, destinationPath) => {
    try {
      const itemContent = fs.readFileSync(itemPath, 'utf8');
      const newItemPath = path.join(destinationPath, path.basename(itemPath));

      moveRequestUid(itemPath, newItemPath);

      fs.unlinkSync(itemPath);
      fs.writeFileSync(newItemPath, itemContent);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-folder-item', async (event, folderPath, destinationPath) => {
    try {
      const folderName = path.basename(folderPath);
      const newFolderPath = path.join(destinationPath, folderName);

      if (!fs.existsSync(folderPath)) {
        throw new Error(`folder: ${folderPath} does not exist`);
      }

      if (fs.existsSync(newFolderPath)) {
        throw new Error(`folder: ${newFolderPath} already exists`);
      }

      const bruFilesAtSource = await searchForBruFiles(folderPath);

      for (let bruFile of bruFilesAtSource) {
        const newBruFilePath = bruFile.replace(folderPath, newFolderPath);
        moveRequestUid(bruFile, newBruFilePath);
      }

      fs.renameSync(folderPath, newFolderPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-bruno-config', async (event, brunoConfig, collectionPath, collectionUid) => {
    try {
      const brunoConfigPath = path.join(collectionPath, 'bruno.json');
      const content = await stringifyJson(brunoConfig);
      await writeFile(brunoConfigPath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:open-devtools', async () => {
    mainWindow.webContents.openDevTools();
  });

  ipcMain.handle('renderer:load-gql-schema-file', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile']
      });
      if (filePaths.length === 0) {
        return;
      }

      const jsonData = fs.readFileSync(filePaths[0], 'utf8');
      return safeParseJSON(jsonData);
    } catch (err) {
      return Promise.reject(new Error('Failed to load GraphQL schema file'));
    }
  });

  ipcMain.handle('renderer:delete-cookies-for-domain', async (event, domain) => {
    try {
      await deleteCookiesForDomain(domain);

      const domainsWithCookies = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:save-collection-security-config', async (event, collectionPath, securityConfig) => {
    try {
      collectionSecurityStore.setSecurityConfigForCollection(collectionPath, {
        jsSandboxMode: securityConfig.jsSandboxMode
      });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-collection-security-config', async (event, collectionPath) => {
    try {
      return collectionSecurityStore.getSecurityConfigForCollection(collectionPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-ui-state-snapshot', (event, { type, data }) => {
    try {
      uiStateSnapshotStore.update({ type, data });
    } catch (error) {
      throw new Error(error.message);
    }
  });
};

const registerMainEventHandlers = (mainWindow, watcher, lastOpenedCollections) => {
  ipcMain.on('main:open-collection', () => {
    if (watcher && mainWindow) {
      openCollectionDialog(mainWindow, watcher);
    }
  });

  ipcMain.on('main:open-docs', () => {
    const docsURL = 'https://docs.usebruno.com';
    shell.openExternal(docsURL);
  });

  ipcMain.on('main:collection-opened', (win, pathname, uid, brunoConfig) => {
    watcher.addWatcher(win, pathname, uid, brunoConfig);
    lastOpenedCollections.add(pathname);
    app.addRecentDocument(pathname);
  });

  // The app listen for this event and allows the user to save unsaved requests before closing the app
  ipcMain.on('main:start-quit-flow', () => {
    mainWindow.webContents.send('main:start-quit-flow');
  });

  ipcMain.handle('main:complete-quit-flow', () => {
    mainWindow.destroy();
  });

  ipcMain.handle('main:force-quit', () => {
    process.exit();
  });
};

const registerCollectionsIpc = (mainWindow, watcher, lastOpenedCollections) => {
  registerRendererEventHandlers(mainWindow, watcher, lastOpenedCollections);
  registerMainEventHandlers(mainWindow, watcher, lastOpenedCollections);
};

module.exports = registerCollectionsIpc;
