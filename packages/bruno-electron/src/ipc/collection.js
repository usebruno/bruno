const _ = require('lodash');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fsExtra = require('fs-extra');
const os = require('os');
const path = require('path');
const { ipcMain, shell, dialog, app } = require('electron');
const { envJsonToBru, bruToJson, jsonToBru, jsonToBruViaWorker, collectionBruToJson, jsonToCollectionBru, bruToJsonViaWorker } = require('../bru');
const brunoConverters = require('@usebruno/converters');
const { postmanToBruno } = brunoConverters;

const {
  writeFile,
  hasBruExtension,
  isDirectory,
  browseDirectory,
  browseFiles,
  createDirectory,
  searchForBruFiles,
  sanitizeName,
  isWSLPath,
  safeToRename,
  isWindowsOS,
  validateName,
  hasSubDirectories,
  getCollectionStats,
  sizeInMB,
  safeWriteFileSync,
  copyPath,
  removePath,
  getPaths
} = require('../utils/filesystem');
const { openCollectionDialog } = require('../app/collections');
const { generateUidBasedOnHash, stringifyJson, safeParseJSON, safeStringifyJSON } = require('../utils/common');
const { moveRequestUid, deleteRequestUid } = require('../cache/requestUids');
const { deleteCookiesForDomain, getDomainsWithCookies, addCookieForDomain, modifyCookieForDomain, parseCookieString, createCookieString, deleteCookie } = require('../utils/cookies');
const EnvironmentSecretsStore = require('../store/env-secrets');
const CollectionSecurityStore = require('../store/collection-security');
const UiStateSnapshotStore = require('../store/ui-state-snapshot');
const interpolateVars = require('./network/interpolate-vars');
const { getEnvVars, getTreePathFromCollectionToItem, mergeVars, parseBruFileMeta, hydrateRequestWithUuid, transformRequestToSaveToFilesystem } = require('../utils/collection');
const { getProcessEnvVars } = require('../store/process-env');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingImplicitGrant, refreshOauth2Token } = require('../utils/oauth2');
const { getCertsAndProxyConfig } = require('./network');

const environmentSecretsStore = new EnvironmentSecretsStore();
const collectionSecurityStore = new CollectionSecurityStore();
const uiStateSnapshotStore = new UiStateSnapshotStore();

// size and file count limits to determine whether the bru files in the collection should be loaded asynchronously or not.
const MAX_COLLECTION_SIZE_IN_MB = 20;
const MAX_SINGLE_FILE_SIZE_IN_COLLECTION_IN_MB = 5;
const MAX_COLLECTION_FILES_COUNT = 2000;

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
  ipcMain.handle('renderer:browse-files', async (_, filters, properties) => {
    try {
      return await browseFiles(mainWindow, filters, properties); 
    } catch (error) {
      throw error;
    }
  });

  // create collection
  ipcMain.handle(
    'renderer:create-collection',
    async (event, collectionName, collectionFolderName, collectionLocation) => {
      try {
        collectionFolderName = sanitizeName(collectionFolderName);
        const dirPath = path.join(collectionLocation, collectionFolderName);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);

          if (files.length > 0) {
            throw new Error(`collection: ${dirPath} already exists and is not empty`);
          }
        }

        if (!validateName(path.basename(dirPath))) {
          throw new Error(`collection: invalid pathname - ${dirPath}`);
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

        const { size, filesCount } = await getCollectionStats(dirPath);
        brunoConfig.size = size;
        brunoConfig.filesCount = filesCount;

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
      collectionFolderName = sanitizeName(collectionFolderName);
      const dirPath = path.join(collectionLocation, collectionFolderName);
      if (fs.existsSync(dirPath)) {
        throw new Error(`collection: ${dirPath} already exists`);
      }

      if (!validateName(path.basename(dirPath))) {
        throw new Error(`collection: invalid pathname - ${dirPath}`);
      }

      // create dir
      await createDirectory(dirPath);
      const uid = generateUidBasedOnHash(dirPath);

      // open the bruno.json of previousPath
      const brunoJsonFilePath = path.join(previousPath, 'bruno.json');
      const content = fs.readFileSync(brunoJsonFilePath, 'utf8');

      // Change new name of collection
      let brunoConfig = JSON.parse(content);
      brunoConfig.name = collectionName;
      const cont = await stringifyJson(brunoConfig);

      // write the bruno.json to new dir
      await writeFile(path.join(dirPath, 'bruno.json'), cont);

      // Now copy all the files with extension name .bru along with the dir
      const files = searchForBruFiles(previousPath);

      for (const sourceFilePath of files) {
        const relativePath = path.relative(previousPath, sourceFilePath);
        const newFilePath = path.join(dirPath, relativePath);

        // handle dir of files
        fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
        // copy each files
        fs.copyFileSync(sourceFilePath, newFilePath);
      }

      const { size, filesCount } = await getCollectionStats(dirPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

      mainWindow.webContents.send('main:collection-opened', dirPath, uid, brunoConfig);
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
      const { name: folderName, root: folderRoot = {}, pathname: folderPathname } = folder;
      const folderBruFilePath = path.join(folderPathname, 'folder.bru');

      if (!folderRoot.meta) {
        folderRoot.meta = {
          name: folderName,
          seq: 1
        };
      }

      const content = await jsonToCollectionBru(
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

      const content = await jsonToCollectionBru(collectionRoot);
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
      // For the actual filename part, we want to be strict
      if (!validateName(request?.filename)) {
        throw new Error(`${request.filename}.bru is not a valid filename`);
      }
      const content = await jsonToBruViaWorker(request);
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

      const content = await jsonToBruViaWorker(request);
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

        const content = await jsonToBruViaWorker(request);
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

      const content = await envJsonToBru(environment);

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

      const content = await envJsonToBru(environment);
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
  ipcMain.handle('renderer:rename-item-name', async (event, { itemPath, newName }) => {
    try {

      if (!fs.existsSync(itemPath)) {
        throw new Error(`path: ${itemPath} does not exist`);
      }

      if (isDirectory(itemPath)) {
        const folderBruFilePath = path.join(itemPath, 'folder.bru');
        let folderBruFileJsonContent;
        if (fs.existsSync(folderBruFilePath)) {
          const oldFolderBruFileContent = await fs.promises.readFile(folderBruFilePath, 'utf8');
          folderBruFileJsonContent = await collectionBruToJson(oldFolderBruFileContent);
          folderBruFileJsonContent.meta.name = newName;
        } else {
          folderBruFileJsonContent = {
            meta: {
              name: newName,
              seq: 1
            }
          };
        }
        
        const folderBruFileContent = await jsonToCollectionBru(folderBruFileJsonContent, true);
        await writeFile(folderBruFilePath, folderBruFileContent);

        return;
      }

      const isBru = hasBruExtension(itemPath);
      if (!isBru) {
        throw new Error(`path: ${itemPath} is not a bru file`);
      }

      const data = fs.readFileSync(itemPath, 'utf8');
      const jsonData = await bruToJson(data);
      jsonData.name = newName;
      const content = await jsonToBru(jsonData);
      await writeFile(itemPath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item-filename', async (event, { oldPath, newPath, newName, newFilename }) => {
    const tempDir = path.join(os.tmpdir(), `temp-folder-${Date.now()}`);
    const isWindowsOSAndNotWSLPathAndItemHasSubDirectories = isDirectory(oldPath) && isWindowsOS() && !isWSLPath(oldPath) && hasSubDirectories(oldPath);
    try {
      // Check if the old path exists
      if (!fs.existsSync(oldPath)) {
        throw new Error(`path: ${oldPath} does not exist`);
      }

      if (!safeToRename(oldPath, newPath)) {
        throw new Error(`path: ${newPath} already exists`);
      }

      if (isDirectory(oldPath)) {
        const folderBruFilePath = path.join(oldPath, 'folder.bru');
        let folderBruFileJsonContent;
        if (fs.existsSync(folderBruFilePath)) {
          const oldFolderBruFileContent = await fs.promises.readFile(folderBruFilePath, 'utf8');
          folderBruFileJsonContent = await collectionBruToJson(oldFolderBruFileContent);
          folderBruFileJsonContent.meta.name = newName;
        } else {
          folderBruFileJsonContent = {
            meta: {
              name: newName,
              seq: 1
            }
          };
        }

        const folderBruFileContent = await jsonToCollectionBru(folderBruFileJsonContent, true);
        await writeFile(folderBruFilePath, folderBruFileContent);
        
        const bruFilesAtSource = await searchForBruFiles(oldPath);

        for (let bruFile of bruFilesAtSource) {
          const newBruFilePath = bruFile.replace(oldPath, newPath);
          moveRequestUid(bruFile, newBruFilePath);
        }

        /**
         * If it is windows OS
         * And it is not a WSL path (meaning it is not running in WSL (linux pathtype))
         * And it has sub directories
         * Only then we need to use the temp dir approach to rename the folder
         *
         * Windows OS would sometimes throw error when renaming a folder with sub directories
         * This is an alternative approach to avoid that error
         */
        if (isWindowsOSAndNotWSLPathAndItemHasSubDirectories) {
          await fsExtra.copy(oldPath, tempDir);
          await fsExtra.remove(oldPath);
          await fsExtra.move(tempDir, newPath, { overwrite: true });
          await fsExtra.remove(tempDir);
        } else {
          await fs.renameSync(oldPath, newPath);
        }

        return newPath;
      }

      if (!hasBruExtension(oldPath)) {
        throw new Error(`path: ${oldPath} is not a bru file`);
      }

      if (!validateName(newFilename)) {
        throw new Error(`path: ${newFilename} is not a valid filename`);
      }

      // update name in file and save new copy, then delete old copy
      const data = await fs.promises.readFile(oldPath, 'utf8'); // Use async read
      const jsonData = await bruToJsonViaWorker(data);
      jsonData.name = newName;
      moveRequestUid(oldPath, newPath);

      const content = await jsonToBruViaWorker(jsonData);
      await fs.promises.unlink(oldPath);
      await writeFile(newPath, content);

      return newPath;
    } catch (error) {
      // in case the rename file operations fails, and we see that the temp dir exists
      // and the old path does not exist, we need to restore the data from the temp dir to the old path
      if (isWindowsOSAndNotWSLPathAndItemHasSubDirectories) {
        if (fsExtra.pathExistsSync(tempDir) && !fsExtra.pathExistsSync(oldPath)) {
          try {
            await fsExtra.copy(tempDir, oldPath);
            await fsExtra.remove(tempDir);
          } catch (err) {
            console.error("Failed to restore data to the old path:", err);
          }
        }
      }

      return Promise.reject(error);
    }
  });

  // new folder
  ipcMain.handle('renderer:new-folder', async (event, pathname, folderName) => {
    const resolvedFolderName = sanitizeName(path.basename(pathname));
    pathname = path.join(path.dirname(pathname), resolvedFolderName);
    try {
      if (!fs.existsSync(pathname)) {
        fs.mkdirSync(pathname);
        const folderBruFilePath = path.join(pathname, 'folder.bru');
        let data = {
          meta: {
            name: folderName,
            seq: 1
          }
        };
        const content = await jsonToCollectionBru(data, true); // isFolder flag
        await writeFile(folderBruFilePath, content);
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

  ipcMain.handle('renderer:update-collection-paths', async (_, collectionPaths) => {
    lastOpenedCollections.update(collectionPaths);
  })

  ipcMain.handle('renderer:import-collection', async (event, collection, collectionLocation) => {
    try {
      let collectionName = sanitizeName(collection.name);
      let collectionPath = path.join(collectionLocation, collectionName);

      if (fs.existsSync(collectionPath)) {
        throw new Error(`collection: ${collectionPath} already exists`);
      }

      // Recursive function to parse the collection items and create files/folders
      const parseCollectionItems = (items = [], currentPath) => {
        items.forEach(async (item) => {
          if (['http-request', 'graphql-request'].includes(item.type)) {
            let sanitizedFilename = sanitizeName(item?.filename || `${item.name}.bru`);
            const content = await jsonToBruViaWorker(item);
            const filePath = path.join(currentPath, sanitizedFilename);
            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
            const folderPath = path.join(currentPath, sanitizedFolderName);
            fs.mkdirSync(folderPath);

            if (item?.root?.meta?.name) {
              const folderBruFilePath = path.join(folderPath, 'folder.bru');
              item.root.meta.seq = item.seq;
              const folderContent = await jsonToCollectionBru(
                item.root,
                true // isFolder
              );
              safeWriteFileSync(folderBruFilePath, folderContent);
            }

            if (item.items && item.items.length) {
              parseCollectionItems(item.items, folderPath);
            }
          }
          // Handle items of type 'js'
          if (item.type === 'js') {
            let sanitizedFilename = sanitizeName(item?.filename || `${item.name}.js`);
            const filePath = path.join(currentPath, sanitizedFilename);
            safeWriteFileSync(filePath, item.fileContent);
          }
        });
      };

      const parseEnvironments = (environments = [], collectionPath) => {
        const envDirPath = path.join(collectionPath, 'environments');
        if (!fs.existsSync(envDirPath)) {
          fs.mkdirSync(envDirPath);
        }

        environments.forEach(async (env) => {
          const content = await envJsonToBru(env);
          let sanitizedEnvFilename = sanitizeName(`${env.name}.bru`);
          const filePath = path.join(envDirPath, sanitizedEnvFilename);
          safeWriteFileSync(filePath, content);
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
      let brunoConfig = getBrunoJsonConfig(collection);
      const stringifiedBrunoConfig = await stringifyJson(brunoConfig);

      // Write the Bruno configuration to a file
      await writeFile(path.join(collectionPath, 'bruno.json'), stringifiedBrunoConfig);

      const collectionContent = await jsonToCollectionBru(collection.root);
      await writeFile(path.join(collectionPath, 'collection.bru'), collectionContent);

      const { size, filesCount } = await getCollectionStats(collectionPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

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
        items.forEach(async (item) => {
          if (['http-request', 'graphql-request'].includes(item.type)) {
            const content = await jsonToBruViaWorker(item);            
            const filePath = path.join(currentPath, item.filename);
            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            const folderPath = path.join(currentPath, item.filename);
            fs.mkdirSync(folderPath);

            // If folder has a root element, then I should write its folder.bru file
            if (item.root) {
              const folderContent = await jsonToCollectionBru(item.root, true);
              folderContent.name = item.name;
              if (folderContent) {
                const bruFolderPath = path.join(folderPath, `folder.bru`);
                safeWriteFileSync(bruFolderPath, folderContent);
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
        const folderContent = await jsonToCollectionBru(itemFolder.root, true);
        if (folderContent) {
          const bruFolderPath = path.join(collectionPath, `folder.bru`);
          safeWriteFileSync(bruFolderPath, folderContent);
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
        if (item?.type === 'folder') {
          const folderRootPath = path.join(item.pathname, 'folder.bru');
          let folderBruJsonData = {
            meta: {
              name: path.basename(item?.pathname),
              seq: item?.seq || 1
            }
          };
          if (fs.existsSync(folderRootPath)) {
            const bru = fs.readFileSync(folderRootPath, 'utf8');
            folderBruJsonData = await collectionBruToJson(bru);
            if (!folderBruJsonData?.meta) {
              folderBruJsonData.meta = {
                name: path.basename(item?.pathname),
                seq: item?.seq || 1
              };
            }
            if (folderBruJsonData?.meta?.seq === item.seq) {
              continue;
            }
            folderBruJsonData.meta.seq = item.seq;
          }
          const content = await jsonToCollectionBru(folderBruJsonData);
          await writeFile(folderRootPath, content);
        } else {
          if (fs.existsSync(item.pathname)) {
            const itemToSave = transformRequestToSaveToFilesystem(item);
            const content = await jsonToBruViaWorker(itemToSave);
            await writeFile(item.pathname, content);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error in resequence-items:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-file-item', async (event, itemPath, destinationPath) => {
    try {
      const itemContent = fs.readFileSync(itemPath, 'utf8');
      const newItemPath = path.join(destinationPath, path.basename(itemPath));

      moveRequestUid(itemPath, newItemPath);

      fs.unlinkSync(itemPath);
      safeWriteFileSync(newItemPath, itemContent);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:move-item', async (event, { targetDirname, sourcePathname }) => {
    try {
      if (fs.existsSync(targetDirname)) {
        const sourceDirname = path.dirname(sourcePathname);
        const pathnamesBefore = await getPaths(sourcePathname);
        const pathnamesAfter = pathnamesBefore?.map(p => p?.replace(sourceDirname, targetDirname));
        await copyPath(sourcePathname, targetDirname);
        await removePath(sourcePathname);
        // move the request uids of the previous file/folders to the new file/folder items
        pathnamesAfter?.forEach((_, index) => {
          moveRequestUid(pathnamesBefore[index], pathnamesAfter[index]);
        });
      }
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

  ipcMain.handle('renderer:delete-cookie', async (event, domain, path, cookieKey) => {
    try {
      await deleteCookie(domain, path, cookieKey);
      const domainsWithCookies = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // add cookie
  ipcMain.handle('renderer:add-cookie', async (event, domain, cookie) => {
    try {
      await addCookieForDomain(domain, cookie);
      const domainsWithCookies = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // modify cookie
  ipcMain.handle('renderer:modify-cookie', async (event, domain, oldCookie, cookie) => {
    try {
      await modifyCookieForDomain(domain, oldCookie, cookie);
      const domainsWithCookies = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));
    } catch (error) {
      return Promise.reject(error);
    }
  });

    ipcMain.handle('renderer:get-parsed-cookie', async (event, cookieStr) => {
    try {
      return parseCookieString(cookieStr);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:create-cookie-string', async (event, cookie) => {
    try {
      return createCookieString(cookie);
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

  ipcMain.handle('renderer:fetch-oauth2-credentials', async (event, { itemUid, request, collection }) => {
    try {
        if (request.oauth2) {
          let requestCopy = _.cloneDeep(request);
          const { uid: collectionUid, pathname: collectionPath, runtimeVariables, environments = [], activeEnvironmentUid } = collection;
          const environment = _.find(environments, (e) => e.uid === activeEnvironmentUid);
          const envVars = getEnvVars(environment);
          const processEnvVars = getProcessEnvVars(collectionUid);
          const partialItem = { uid: itemUid };
          const requestTreePath = getTreePathFromCollectionToItem(collection, partialItem);
          if (requestTreePath && requestTreePath.length > 0) {
            mergeVars(collection, requestCopy, requestTreePath);
          }

          interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
          const certsAndProxyConfig = await getCertsAndProxyConfig({
            collectionUid,
            request: requestCopy,
            envVars,
            runtimeVariables,
            processEnvVars,
            collectionPath
          });
          const { oauth2: { grantType }} = requestCopy || {};
          
          // Common function to check for errors and missing tokens
          const validateResponse = (response) => {
            if (response.error) {
              throw new Error(response.error);
            }
            
            if (!response.credentials || !response.credentials.access_token) {
              throw new Error('No access token received. Authentication may have been canceled or failed.');
            }
            
            return response;
          };
          
          let response;
          switch (grantType) {
            case 'authorization_code':
              interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
              return getOAuth2TokenUsingAuthorizationCode({ 
                request: requestCopy, 
                collectionUid, 
                forceFetch: true, 
                certsAndProxyConfig 
              }).then(validateResponse);
              
            case 'client_credentials':
              interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
              return getOAuth2TokenUsingClientCredentials({ 
                request: requestCopy, 
                collectionUid, 
                forceFetch: true, 
                certsAndProxyConfig 
              }).then(validateResponse);
              
            case 'password':
              interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
              return getOAuth2TokenUsingPasswordCredentials({ 
                request: requestCopy, 
                collectionUid, 
                forceFetch: true, 
                certsAndProxyConfig 
              }).then(validateResponse);
              
            case 'implicit':
              interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
              return getOAuth2TokenUsingImplicitGrant({ 
                request: requestCopy, 
                collectionUid, 
                forceFetch: true 
              }).then(validateResponse);
              
            default:
              return {
                error: `Unsupported grant type: ${grantType}`,
                credentials: null,
                url: null,
                collectionUid,
                credentialsId: null
              };
          }
        }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:load-request-via-worker', async (event, { collectionUid, pathname }) => {
    let fileStats;
    try {
      fileStats = fs.statSync(pathname);
      if (hasBruExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = await bruToJson(parseBruFileMeta(bruContent), true);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        file.data = await bruToJsonViaWorker(bruContent);
        file.partial = false;
        file.loading = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
      if (hasBruExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = await bruToJson(parseBruFileMeta(bruContent), true);
        file.data = metaJson;
        file.partial = true;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:refresh-oauth2-credentials', async (event, { request, collection }) => {
    try {
        if (request.oauth2) {
          let requestCopy = _.cloneDeep(request);
          const { uid: collectionUid, pathname: collectionPath, runtimeVariables, environments = [], activeEnvironmentUid } = collection;
          const environment = _.find(environments, (e) => e.uid === activeEnvironmentUid);
          const envVars = getEnvVars(environment);
          const processEnvVars = getProcessEnvVars(collectionUid);
          interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
          const certsAndProxyConfig = await getCertsAndProxyConfig({
            collectionUid,
            request: requestCopy,
            envVars,
            runtimeVariables,
            processEnvVars,
            collectionPath
          });
          
          let response = await refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig });
          
          // Check for errors or missing token
          if (response.error) {
            throw new Error(response.error);
          }
          
          if (!response.credentials || !response.credentials.access_token) {
            throw new Error('Failed to refresh token. No access token received.');
          }
          
          return response;
        }
    } catch (error) {
      return Promise.reject(error);
    }
  });
  
  ipcMain.handle('renderer:load-request', async (event, { collectionUid, pathname }) => {
    let fileStats;
    try {
      fileStats = fs.statSync(pathname);
      if (hasBruExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = await bruToJson(parseBruFileMeta(bruContent), true);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        file.data = bruToJson(bruContent);
        file.partial = false;
        file.loading = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
      if (hasBruExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = await bruToJson(parseBruFileMeta(bruContent), true);
        file.data = metaJson;
        file.partial = true;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:mount-collection', async (event, { collectionUid, collectionPathname, brunoConfig }) => {
    const {
      size,
      filesCount,
      maxFileSize
    } = await getCollectionStats(collectionPathname);

    const shouldLoadCollectionAsync =
      (size > MAX_COLLECTION_SIZE_IN_MB) ||
      (filesCount > MAX_COLLECTION_FILES_COUNT) ||
      (maxFileSize > MAX_SINGLE_FILE_SIZE_IN_COLLECTION_IN_MB);

    watcher.addWatcher(mainWindow, collectionPathname, collectionUid, brunoConfig, false, shouldLoadCollectionAsync);
  });

  ipcMain.handle('renderer:show-in-folder', async (event, filePath) => {
    try {
      if (!filePath) {
        throw new Error('File path is required');
      }
      shell.showItemInFolder(filePath);
    } catch (error) {
      console.error('Error in show-in-folder: ', error);
      throw error;
    }
  });

  // Implement the Postman to Bruno conversion handler
  ipcMain.handle('renderer:convert-postman-to-bruno', async (event, postmanCollection) => {
    try {
      // Convert Postman collection to Bruno format
      const brunoCollection = await postmanToBruno(postmanCollection, { useWorkers: true});
      
      return brunoCollection;
    } catch (error) {
      console.error('Error converting Postman to Bruno:', error);
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

  ipcMain.on('main:collection-opened', async (win, pathname, uid, brunoConfig) => {
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
