const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { ipcMain, shell } = require('electron');
const { envJsonToBru, bruToJson, jsonToBru } = require('../bru');

const {
  isValidPathname,
  writeFile,
  hasBruExtension,
  isDirectory,
  browseDirectory,
  createDirectory,
  searchForBruFiles,
  sanitizeDirectoryName
} = require('../utils/filesystem');
const { stringifyJson } = require('../utils/common');
const { openCollectionDialog, openCollection } = require('../app/collections');
const { generateUidBasedOnHash } = require('../utils/common');
const { moveRequestUid, deleteRequestUid } = require('../cache/requestUids');
const { setPreferences } = require('../store/preferences');
const EnvironmentSecretsStore = require('../store/env-secrets');
const { getLangFromBrunoConfig } = require('../store/bruno-config');

const environmentSecretsStore = new EnvironmentSecretsStore();

const envHasSecrets = (environment = {}) => {
  const secrets = _.filter(environment.variables, (v) => v.secret);

  return secrets && secrets.length > 0;
};

const registerRendererEventHandlers = (mainWindow, watcher, lastOpenedCollections) => {
  // browse directory
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      const dirPath = await browseDirectory(mainWindow);

      return dirPath;
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
          throw new Error(`collection: ${dirPath} already exists`);
        }

        if (!isValidPathname(dirPath)) {
          throw new Error(`collection: invalid pathname - ${dir}`);
        }

        await createDirectory(dirPath);

        const uid = generateUidBasedOnHash(dirPath);
        const brunoConfig = {
          version: '1',
          name: collectionName,
          type: 'collection'
        };
        const content = await stringifyJson(brunoConfig);
        await writeFile(path.join(dirPath, 'bruno.json'), content);

        mainWindow.webContents.send('main:collection-opened', dirPath, uid, brunoConfig);
        ipcMain.emit('main:collection-opened', mainWindow, dirPath, uid);

        return;
      } catch (error) {
        return Promise.reject(error);
      }
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

      return;
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

  // create environment
  ipcMain.handle('renderer:create-environment', async (event, collection, name) => {
    try {
      const envDirPath = path.join(collection.pathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const lang = getLangFromBrunoConfig(collection.uid);
      const envFilePath = path.format({
        dir: envDirPath,
        name,
        ext: `.${lang}`
      });
      if (fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} already exists`);
      }

      const environment = {
        variables: []
      };
      const content = lang === 'json' ? JSON.stringify(environment, null, 2) : envJsonToBru(environment);
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // copy environment
  ipcMain.handle('renderer:copy-environment', async (event, collection, name, baseVariables) => {
    try {
      const envDirPath = path.join(collection.pathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const lang = getLangFromBrunoConfig(collection.uid);
      const envFilePath = path.format({
        dir: envDirPath,
        name,
        ext: `.${getLangFromBrunoConfig}`
      });
      if (fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} already exists`);
      }

      const environment = {
        variables: baseVariables
      };
      const content = lang === 'json' ? JSON.stringify(environment, null, 2) : envJsonToBru(environment);
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save environment
  ipcMain.handle('renderer:save-environment', async (event, collection, environment) => {
    try {
      const envDirPath = path.join(collection.pathname, 'environments');
      if (!fs.existsSync(envDirPath)) {
        await createDirectory(envDirPath);
      }

      const lang = getLangFromBrunoConfig(collection.uid);
      const envFilePath = path.format({
        dir: envDirPath,
        name: environment.name,
        ext: `.${lang}`
      });
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collection.pathname, environment);
      }

      const content = lang === 'json' ? JSON.stringify(environment, null, 2) : envJsonToBru(environment);
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename environment
  ipcMain.handle('renderer:rename-environment', async (event, collection, environmentName, newName) => {
    try {
      const envDirPath = path.join(collection.pathname, 'environments');
      const lang = getLangFromBrunoConfig(collection.uid);
      const envFilePath = path.format({
        dir: envDirPath,
        name: environmentName,
        ext: `.${lang}`
      });
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      const newEnvFilePath = path.format({
        dir: envDirPath,
        name: newName,
        ext: `.${lang}`
      });
      if (fs.existsSync(newEnvFilePath)) {
        throw new Error(`environment: ${newEnvFilePath} already exists`);
      }

      fs.renameSync(envFilePath, newEnvFilePath);

      environmentSecretsStore.renameEnvironment(collection.pathname, environmentName, newName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete environment
  ipcMain.handle('renderer:delete-environment', async (event, collection, environmentName) => {
    try {
      const envDirPath = path.join(collection.pathname, 'environments');
      const envFilePath = path.format({
        dir: envDirPath,
        name: environmentName,
        ext: `.${getLangFromBrunoConfig(collection.uid)}`
      });
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      fs.unlinkSync(envFilePath);

      environmentSecretsStore.deleteEnvironment(collection.pathname, environmentName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item', async (event, oldPath, newPath, newName) => {
    try {
      if (!fs.existsSync(oldPath)) {
        throw new Error(`path: ${oldPath} does not exist`);
      }
      if (fs.existsSync(newPath)) {
        throw new Error(`path: ${oldPath} already exists`);
      }

      // if its directory, rename and return
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
      await writeFile(newPath, content);
      await fs.unlinkSync(oldPath);
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
        return Promise.reject(error);
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

            if (item.items && item.items.length) {
              parseCollectionItems(item.items, folderPath);
            }
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

      await createDirectory(collectionPath);

      const uid = generateUidBasedOnHash(collectionPath);
      const brunoConfig = {
        version: '1',
        name: collectionName,
        type: 'collection'
      };
      const content = await stringifyJson(brunoConfig);
      await writeFile(path.join(collectionPath, 'bruno.json'), content);

      mainWindow.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid);

      lastOpenedCollections.add(collectionPath);

      // create folder and files based on collection
      await parseCollectionItems(collection.items, collectionPath);
      await parseEnvironments(collection.environments, collectionPath);
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

  ipcMain.handle('renderer:ready', async (event) => {
    // reload last opened collections
    const lastOpened = lastOpenedCollections.getAll();

    if (lastOpened && lastOpened.length) {
      for (let collectionPath of lastOpened) {
        if (isDirectory(collectionPath)) {
          openCollection(mainWindow, watcher, collectionPath, {
            dontSendDisplayErrors: true
          });
        }
      }
    }
  });

  ipcMain.handle('renderer:set-preferences', async (event, preferences) => {
    setPreferences(preferences);
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

  ipcMain.on('main:collection-opened', (win, pathname, uid) => {
    watcher.addWatcher(win, pathname, uid);
    lastOpenedCollections.add(pathname);
  });
};

const registerCollectionsIpc = (mainWindow, watcher, lastOpenedCollections) => {
  registerRendererEventHandlers(mainWindow, watcher, lastOpenedCollections);
  registerMainEventHandlers(mainWindow, watcher, lastOpenedCollections);
};

module.exports = registerCollectionsIpc;
