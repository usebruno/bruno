const _ = require('lodash');
const fs = require('fs');
const fsExtra = require('fs-extra');
const os = require('os');
const path = require('path');
const { ipcMain, shell, dialog, app } = require('electron');
const { 
  parseRequest,
  stringifyRequest,
  parseRequestViaWorker,
  stringifyRequestViaWorker,
  parseCollection,
  stringifyCollection,
  parseFolder,
  stringifyFolder,
  parseEnvironment,
  stringifyEnvironment
} = require('@usebruno/filestore');
const brunoConverters = require('@usebruno/converters');
const { postmanToBruno } = brunoConverters;
const { cookiesStore } = require('../store/cookies');
const { parseLargeRequestWithRedaction } = require('../utils/parse');
const { wsClient } = require('../ipc/network/ws-event-handlers');

const {
  writeFile,
  hasBruExtension,
  isDirectory,
  createDirectory,
  searchForBruFiles,
  sanitizeName,
  isWSLPath,
  safeToRename,
  safeParseJson,
  safeStringifyJSON,
  getSubDirectories,
  isWindowsOS,
  readDir,
  hasRequestExtension,
  searchForRequestFiles,
  detectFileFormat,
  getCollectionFiletypeSync,
  getFileExtensionFromFiletype,
  searchForCollectionRequestFiles,
  normalizeAndResolvePath,
  validateName,
  chooseFileToSave,
  exists,
  isFile,
  getCollectionStats,
  sizeInMB,
  safeWriteFileSync,
  copyPath,
  removePath,
  getPaths,
  generateUniqueName
} = require('../utils/filesystem');
const { openCollectionDialog } = require('../app/collections');
const { stringifyJson, safeParseJSON, generateUidBasedOnHash } = require('../utils/common');
const { moveRequestUid, deleteRequestUid } = require('../cache/requestUids');
const { deleteCookiesForDomain, getDomainsWithCookies, addCookieForDomain, modifyCookieForDomain, parseCookieString, createCookieString, deleteCookie } = require('../utils/cookies');
const EnvironmentSecretsStore = require('../store/env-secrets');
const CollectionSecurityStore = require('../store/collection-security');
const UiStateSnapshotStore = require('../store/ui-state-snapshot');
const interpolateVars = require('./network/interpolate-vars');
const { getEnvVars, getTreePathFromCollectionToItem, mergeVars, parseBruFileMeta, hydrateRequestWithUuid, transformRequestToSaveToFilesystem } = require('../utils/collection');
const { getProcessEnvVars } = require('../store/process-env');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingImplicitGrant, refreshOauth2Token } = require('../utils/oauth2');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const collectionWatcher = require('../app/collection-watcher');
const { transformBrunoConfigBeforeSave } = require('../utils/transfomBrunoConfig');

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

const validatePathIsInsideCollection = (filePath, lastOpenedCollections) => {
  const openCollectionPaths = collectionWatcher.getAllWatcherPaths();
  const lastOpenedPaths = lastOpenedCollections ? lastOpenedCollections.getAll() : [];

  // Combine both currently watched collections and last opened collections
  // todo: remove the lastOpenedPaths from the list
  // todo: have a proper way to validate the path without the active watcher logic
  const allCollectionPaths = [...new Set([...openCollectionPaths, ...lastOpenedPaths])];

  const isValid = allCollectionPaths.some((collectionPath) => {
    return filePath.startsWith(collectionPath + path.sep) || filePath === collectionPath;
  });

  if (!isValid) {
    throw new Error(`Path: ${filePath} should be inside a collection`);
  }
}

const getCollectionFiletype = async (filePath, lastOpenedCollections) => {
  try {
    const openCollectionPaths = collectionWatcher.getAllWatcherPaths();
    const lastOpenedPaths = lastOpenedCollections ? lastOpenedCollections.getAll() : [];
    const allCollectionPaths = [...new Set([...openCollectionPaths, ...lastOpenedPaths])];

    // Find the collection root for this file
    const collectionPath = allCollectionPaths.find((collectionPath) => {
      return filePath.startsWith(collectionPath + path.sep) || filePath === collectionPath;
    });

    if (!collectionPath) {
      return 'bru'; // default to bru if not in any collection
    }

    // Check for opencollection.yml first
    const ocYmlPath = path.join(collectionPath, 'opencollection.yml');
    if (fs.existsSync(ocYmlPath)) {
      return 'yaml';
    }

    // Fall back to bruno.json
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');
    if (fs.existsSync(brunoJsonPath)) {
      const brunoJsonContent = fs.readFileSync(brunoJsonPath, 'utf8');
      const brunoConfig = JSON.parse(brunoJsonContent);
      return brunoConfig.filetype || 'bru';
    }

    return 'bru';
  } catch (error) {
    console.warn('Error determining collection filetype:', error);
    return 'bru'; // default to bru on error
  }
};

const registerRendererEventHandlers = (mainWindow, watcher, lastOpenedCollections) => {
  // create collection
  ipcMain.handle(
    'renderer:create-collection',
    async (event, collectionName, collectionFolderName, collectionLocation, filetype = 'bru') => {
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

        // Add filetype if not default bru
        if (filetype && filetype !== 'bru') {
          brunoConfig.filetype = filetype;
        }

        if (filetype === 'yaml') {
          const { stringifyOpenCollection } = require('@usebruno/filestore');
          const collectionRoot = { name: collectionName };
          const ocContent = stringifyOpenCollection(brunoConfig, collectionRoot);
          await writeFile(path.join(dirPath, 'opencollection.yml'), ocContent);
        } else {
          const content = await stringifyJson(brunoConfig);
          await writeFile(path.join(dirPath, 'bruno.json'), content);
        }

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

      // Now copy all the files matching the collection's filetype along with the dir
      const files = searchForCollectionRequestFiles(previousPath);

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

      const filetype = await getCollectionFiletype(folderPathname, lastOpenedCollections);
      const extension = getFileExtensionFromFiletype(filetype);
      const folderFilePath = path.join(folderPathname, `folder${extension}`);

      if (!folderRoot.meta) {
        folderRoot.meta = {
          name: folderName
        };
      }

      const content = await stringifyFolder(folderRoot, { format: filetype });
      await writeFile(folderFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });
  ipcMain.handle('renderer:save-collection-root', async (event, collectionPathname, collectionRoot) => {
    try {
      const ocYmlPath = path.join(collectionPathname, 'opencollection.yml');

      if (fs.existsSync(ocYmlPath)) {
        const { parseOpenCollection, stringifyOpenCollection } = require('@usebruno/filestore');

        try {
          const existingContent = fs.readFileSync(ocYmlPath, 'utf8');
          const parsed = parseOpenCollection(existingContent);

          const existingBrunoConfig = parsed.brunoConfig || {};
          const existingCollectionRoot = parsed.root || {};

          const mergedCollectionRoot = {
            ...existingCollectionRoot,
            ...collectionRoot,
            request: {
              ...(existingCollectionRoot.request || {}),
              ...(collectionRoot.request || {})
            }
          };

          const content = stringifyOpenCollection(existingBrunoConfig, mergedCollectionRoot);

          await writeFile(ocYmlPath, content);
        } catch (readError) {
          console.error('Error processing opencollection.yml:', readError);
          throw new Error(`Failed to update opencollection.yml: ${readError.message}`);
        }
      } else {
        // For BRU collections, write to collection.bru or collection.yml
        const filetype = await getCollectionFiletype(collectionPathname, lastOpenedCollections);
        const extension = getFileExtensionFromFiletype(filetype);
        const collectionBruFilePath = path.join(collectionPathname, `collection${extension}`);
        const content = await stringifyCollection(collectionRoot, { format: filetype });
        await writeFile(collectionBruFilePath, content);
      }
    } catch (error) {
      console.error('Error in save-collection-root:', error);
      return Promise.reject(error);
    }
  });

  // new request
  ipcMain.handle('renderer:new-request', async (event, pathname, request) => {
    try {
      if (fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} already exists`);
      }
      const baseFilename = request?.filename?.replace(/\.(bru|yml|yaml)$/, '');
      if (!validateName(baseFilename)) {
        throw new Error(`${request.filename} is not a valid filename`);
      }
      validatePathIsInsideCollection(pathname, lastOpenedCollections);

      const filetype = detectFileFormat(pathname);
      const content = await stringifyRequestViaWorker(request, { format: filetype });
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

      const filetype = detectFileFormat(pathname);
      const content = await stringifyRequestViaWorker(request, { format: filetype });
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

        const filetype = detectFileFormat(pathname);
        const content = await stringifyRequestViaWorker(request, { format: filetype });
        await writeFile(pathname, content);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Helper: Parse file content based on scope type
  const parseFileByType = async (fileContent, scopeType) => {
    switch (scopeType) {
      case 'request':
        return await parseRequestViaWorker(fileContent);
      case 'folder':
        return parseFolder(fileContent);
      case 'collection':
        return parseCollection(fileContent);
      default:
        throw new Error(`Invalid scope type: ${scopeType}`);
    }
  };

  const stringifyByType = async (data, scopeType, format = 'bru') => {
    switch (scopeType) {
      case 'request':
        return await stringifyRequestViaWorker(data, { format });
      case 'folder':
        return stringifyFolder(data, { format });
      case 'collection':
        return stringifyCollection(data, { format });
      default:
        throw new Error(`Invalid scope type: ${scopeType}`);
    }
  };

  // Helper: Update or create variable in array
  const updateOrCreateVariable = (variables, variable) => {
    const existingVar = variables.find((v) => v.name === variable.name);

    if (existingVar) {
      // Update existing variable
      return variables.map((v) => (v.name === variable.name ? variable : v));
    }

    // Create new variable
    return [...variables, variable];
  };

  // update variable in request/folder/collection file
  ipcMain.handle('renderer:update-variable-in-file', async (event, pathname, variable, scopeType) => {
    try {
      if (!fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} does not exist`);
      }

      const format = detectFileFormat(pathname);

      // Read and parse the file
      const fileContent = fs.readFileSync(pathname, 'utf8');
      const parsedData = await parseFileByType(fileContent, scopeType);

      // Update the specific variable or create it if it doesn't exist
      const varsPath = 'request.vars.req';
      const variables = _.get(parsedData, varsPath, []);
      const updatedVariables = updateOrCreateVariable(variables, variable);

      _.set(parsedData, varsPath, updatedVariables);

      const content = await stringifyByType(parsedData, scopeType, format);
      await writeFile(pathname, content);
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

      const filetype = await getCollectionFiletype(collectionPathname, lastOpenedCollections);
      const extension = getFileExtensionFromFiletype(filetype);

      // Get existing environment files to generate unique name
      const existingFiles = fs.existsSync(envDirPath) ? fs.readdirSync(envDirPath) : [];
      const existingEnvNames = existingFiles
        .filter((file) => file.endsWith(extension))
        .map((file) => path.basename(file, extension));

      // Generate unique name based on existing environment files
      const sanitizedName = sanitizeName(name);
      const uniqueName = generateUniqueName(sanitizedName, (name) => existingEnvNames.includes(name));

      const envFilePath = path.join(envDirPath, `${uniqueName}${extension}`);

      const environment = {
        name: uniqueName,
        variables: variables || []
      };

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = await stringifyEnvironment(environment, { format: filetype });

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

      // Determine filetype from collection
      const filetype = await getCollectionFiletype(collectionPathname, lastOpenedCollections);
      const extension = getFileExtensionFromFiletype(filetype);
      const envFilePath = path.join(envDirPath, `${environment.name}${extension}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = await stringifyEnvironment(environment, { format: filetype });
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename environment
  ipcMain.handle('renderer:rename-environment', async (event, collectionPathname, environmentName, newName) => {
    try {
      const collectionFiletype = getCollectionFiletypeSync(collectionPathname);
      const extension = getFileExtensionFromFiletype(collectionFiletype);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}${extension}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      const newEnvFilePath = path.join(envDirPath, `${newName}${extension}`);
      if (!safeToRename(envFilePath, newEnvFilePath)) {
        throw new Error(`environment: ${newEnvFilePath} already exists`);
      }

      // Read, update name field, and write to new file
      const envContent = await fs.promises.readFile(envFilePath, 'utf8');
      const envData = parseEnvironment(envContent, { format: collectionFiletype });
      envData.name = newName;
      const updatedContent = stringifyEnvironment(envData, { format: collectionFiletype });

      // Rename secrets FIRST, before file system changes
      // This prevents race condition where watcher tries to load secrets before they're renamed
      environmentSecretsStore.renameEnvironment(collectionPathname, environmentName, newName);

      // Preserve the UID mapping
      moveRequestUid(envFilePath, newEnvFilePath);

      await writeFile(newEnvFilePath, updatedContent);
      await fs.promises.unlink(envFilePath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete environment
  ipcMain.handle('renderer:delete-environment', async (event, collectionPathname, environmentName) => {
    try {
      const collectionFiletype = getCollectionFiletypeSync(collectionPathname);
      const extension = getFileExtensionFromFiletype(collectionFiletype);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}${extension}`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      fs.unlinkSync(envFilePath);

      environmentSecretsStore.deleteEnvironment(collectionPathname, environmentName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Generic environment export handler
  ipcMain.handle('renderer:export-environment', async (event, { environments, environmentType, filePath, exportFormat = 'folder' }) => {
    try {
      const { app } = require('electron');
      const appVersion = app?.getVersion() || '2.0.0';

      // For single environments and folder exports, include info in each environment
      const environmentWithInfo = (environment) => ({
        name: environment.name,
        variables: environment.variables,
        info: {
          type: 'bruno-environment',
          exportedAt: new Date().toISOString(),
          exportedUsing: `Bruno/v${appVersion}`
        }
      });

      if (exportFormat === 'folder') {
        // separate environment json files in folder
        const baseFolderName = `bruno-${environmentType}-environments`;
        const uniqueFolderName = generateUniqueName(baseFolderName, (name) => fs.existsSync(path.join(filePath, name)));
        const exportPath = path.join(filePath, uniqueFolderName);

        fs.mkdirSync(exportPath, { recursive: true });

        for (const environment of environments) {
          const baseFileName = environment.name ? `${environment.name.replace(/[^a-zA-Z0-9-_]/g, '_')}` : 'environment';
          const uniqueFileName = generateUniqueName(baseFileName, (name) => fs.existsSync(path.join(exportPath, `${name}.json`)));
          const fullPath = path.join(exportPath, `${uniqueFileName}.json`);

          const cleanEnv = environmentWithInfo(environment);
          const jsonContent = JSON.stringify(cleanEnv, null, 2);
          await fs.promises.writeFile(fullPath, jsonContent, 'utf8');
        }
      } else if (exportFormat === 'single-file') {
        // all environments in a single file with top-level info and environments array
        const baseFileName = `bruno-${environmentType}-environments`;
        const uniqueFileName = generateUniqueName(baseFileName, (name) => fs.existsSync(path.join(filePath, `${name}.json`)));
        const fullPath = path.join(filePath, `${uniqueFileName}.json`);

        const exportData = {
          info: {
            type: 'bruno-environment',
            exportedAt: new Date().toISOString(),
            exportedUsing: `Bruno/v${appVersion}`
          },
          environments
        };

        const jsonContent = JSON.stringify(exportData, null, 2);
        await fs.promises.writeFile(fullPath, jsonContent, 'utf8');
      } else if (exportFormat === 'single-object') {
        // single environment json file
        if (environments.length !== 1) {
          throw new Error('Single object export requires exactly one environment');
        }

        const environment = environments[0];
        const baseFileName = environment.name ? `${environment.name.replace(/[^a-zA-Z0-9-_]/g, '_')}` : 'environment';
        const uniqueFileName = generateUniqueName(baseFileName, (name) => fs.existsSync(path.join(filePath, `${name}.json`)));
        const fullPath = path.join(filePath, `${uniqueFileName}.json`);
        const jsonContent = JSON.stringify(environmentWithInfo(environment), null, 2);
        await fs.promises.writeFile(fullPath, jsonContent, 'utf8');
      } else {
        throw new Error(`Unsupported export format: ${exportFormat}`);
      }
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
          folderBruFileJsonContent = await parseFolder(oldFolderBruFileContent);
          folderBruFileJsonContent.meta.name = newName;
        } else {
          folderBruFileJsonContent = {
            meta: {
              name: newName
            }
          };
        }
        
        const folderBruFileContent = await stringifyFolder(folderBruFileJsonContent);
        await writeFile(folderBruFilePath, folderBruFileContent);

        return;
      }

      const isBru = hasBruExtension(itemPath);
      if (!isBru) {
        throw new Error(`path: ${itemPath} is not a bru file`);
      }

      const data = fs.readFileSync(itemPath, 'utf8');
      const jsonData = parseRequest(data);
      jsonData.name = newName;
      const content = stringifyRequest(jsonData);
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

      if (!isDirectory(oldPath)) {
        const oldExt = path.extname(oldPath);
        const newExt = path.extname(newPath);

        if (oldExt !== newExt) {
          const newPathWithoutExt = newPath.slice(0, newPath.length - newExt.length);
          newPath = newPathWithoutExt + oldExt;
        }
      }

      if (!safeToRename(oldPath, newPath)) {
        throw new Error(`path: ${newPath} already exists`);
      }

      if (isDirectory(oldPath)) {
        let collectionPath = oldPath;
        while (collectionPath !== path.dirname(collectionPath)) {
          const hasBrunoJson = fs.existsSync(path.join(collectionPath, 'bruno.json'));
          const hasOpenCollectionYml = fs.existsSync(path.join(collectionPath, 'opencollection.yml'));
          if (hasBrunoJson || hasOpenCollectionYml) {
            break;
          }
          collectionPath = path.dirname(collectionPath);
        }

        const collectionFiletype = getCollectionFiletypeSync(collectionPath);
        const folderExtension = getFileExtensionFromFiletype(collectionFiletype);
        const folderFilePath = path.join(oldPath, `folder${folderExtension}`);

        let folderFileJsonContent;
        if (fs.existsSync(folderFilePath)) {
          const oldFolderFileContent = await fs.promises.readFile(folderFilePath, 'utf8');
          folderFileJsonContent = await parseFolder(oldFolderFileContent, { format: collectionFiletype });
          folderFileJsonContent.meta.name = newName;
        } else {
          folderFileJsonContent = {
            meta: {
              name: newName
            }
          };
        }

        const folderFileContent = await stringifyFolder(folderFileJsonContent, { format: collectionFiletype });
        await writeFile(folderFilePath, folderFileContent);

        const bruFilesAtSource = await searchForRequestFiles(oldPath, collectionFiletype);

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

      if (!hasRequestExtension(oldPath)) {
        throw new Error(`path: ${oldPath} is not a valid request file`);
      }

      if (!validateName(newFilename)) {
        throw new Error(`path: ${newFilename} is not a valid filename`);
      }

      const data = await fs.promises.readFile(oldPath, 'utf8');
      const format = detectFileFormat(oldPath);
      const jsonData = parseRequest(data, { format });
      jsonData.name = newName;
      moveRequestUid(oldPath, newPath);

      const content = stringifyRequest(jsonData, { format });
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
  ipcMain.handle('renderer:new-folder', async (event, { pathname, folderBruJsonData }) => {
    const resolvedFolderName = sanitizeName(path.basename(pathname));
    pathname = path.join(path.dirname(pathname), resolvedFolderName);
    try {
      if (!fs.existsSync(pathname)) {
        fs.mkdirSync(pathname);

        let parentCollectionPath = path.dirname(pathname);
        while (parentCollectionPath !== path.dirname(parentCollectionPath)) {
          const hasBrunoJson = fs.existsSync(path.join(parentCollectionPath, 'bruno.json'));
          const hasOpenCollectionYml = fs.existsSync(path.join(parentCollectionPath, 'opencollection.yml'));
          if (hasBrunoJson || hasOpenCollectionYml) {
            break;
          }
          parentCollectionPath = path.dirname(parentCollectionPath);
        }

        const filetype = getCollectionFiletypeSync(parentCollectionPath);
        const extension = getFileExtensionFromFiletype(filetype);
        const folderBruFilePath = path.join(pathname, `folder${extension}`);
        const content = await stringifyFolder(folderBruJsonData, { format: filetype });
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
        // Find the collection root to determine filetype
        let collectionPath = pathname;
        while (collectionPath !== path.dirname(collectionPath)) {
          if (fs.existsSync(path.join(collectionPath, 'bruno.json'))) {
            break;
          }
          collectionPath = path.dirname(collectionPath);
        }

        // Get collection filetype and search for files in pathname only
        let collectionFiletype = 'bru';
        try {
          const brunoJsonPath = path.join(collectionPath, 'bruno.json');
          if (fs.existsSync(brunoJsonPath)) {
            const brunoJsonContent = fs.readFileSync(brunoJsonPath, 'utf8');
            const brunoConfig = JSON.parse(brunoJsonContent);
            collectionFiletype = brunoConfig.filetype || 'bru';
          }
        } catch (error) {
          console.warn('Error reading collection filetype, defaulting to bru:', error);
        }

        const bruFilesAtSource = await searchForRequestFiles(pathname, collectionFiletype);
        for (let bruFile of bruFilesAtSource) {
          deleteRequestUid(bruFile);
        }

        fs.rmSync(pathname, { recursive: true, force: true });
      } else if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(type)) {
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

  ipcMain.handle('renderer:remove-collection', async (event, collectionPath, collectionUid) => {
    if (watcher && mainWindow) {
      console.log(`watcher stopWatching: ${collectionPath}`);
      watcher.removeWatcher(collectionPath, mainWindow, collectionUid);
      lastOpenedCollections.remove(collectionPath);

      // If wsclient was initialised for any collections that are opened
      // then close for the current collection
      if (wsClient) {
        wsClient.closeForCollection(collectionUid);
      }
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
      const parseCollectionItems = (items = [], currentPath, collectionFiletype = 'bru') => {
        const extension = getFileExtensionFromFiletype(collectionFiletype);

        items.forEach(async (item) => {
          if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
            let sanitizedFilename = sanitizeName(item?.filename || `${item.name}${extension}`);
            if (!sanitizedFilename.endsWith(extension)) {
              sanitizedFilename = sanitizedFilename.replace(/\.(bru|yml|yaml)$/, '') + extension;
            }
            const content = await stringifyRequestViaWorker(item, { format: collectionFiletype });
            const filePath = path.join(currentPath, sanitizedFilename);
            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
            const folderPath = path.join(currentPath, sanitizedFolderName);
            fs.mkdirSync(folderPath);

            if (item?.root?.meta?.name) {
              const folderBruFilePath = path.join(folderPath, `folder${extension}`);
              item.root.meta.seq = item.seq;
              const folderContent = await stringifyFolder(item.root, { format: collectionFiletype });
              safeWriteFileSync(folderBruFilePath, folderContent);
            }

            if (item.items && item.items.length) {
              parseCollectionItems(item.items, folderPath, collectionFiletype);
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

      const parseEnvironments = (environments = [], collectionPath, collectionFiletype = 'bru') => {
        const envDirPath = path.join(collectionPath, 'environments');
        if (!fs.existsSync(envDirPath)) {
          fs.mkdirSync(envDirPath);
        }

        const extension = getFileExtensionFromFiletype(collectionFiletype);
        environments.forEach(async (env) => {
          const content = await stringifyEnvironment(env, { format: collectionFiletype });
          let sanitizedEnvFilename = sanitizeName(`${env.name}${extension}`);
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
      const collectionFiletype = brunoConfig.filetype || 'bru';

      if (collectionFiletype === 'yaml') {
        const { stringifyOpenCollection } = require('@usebruno/filestore');
        const collectionRoot = collection.root || {};
        const ocContent = stringifyOpenCollection(brunoConfig, collectionRoot);
        await writeFile(path.join(collectionPath, 'opencollection.yml'), ocContent);
      } else {
        // Write bruno.json
        const stringifiedBrunoConfig = await stringifyJson(brunoConfig);
        await writeFile(path.join(collectionPath, 'bruno.json'), stringifiedBrunoConfig);

        // Write collection.bru
        const extension = getFileExtensionFromFiletype(collectionFiletype);
        const collectionContent = await stringifyCollection(collection.root, { format: collectionFiletype });
        await writeFile(path.join(collectionPath, `collection${extension}`), collectionContent);
      }

      const { size, filesCount } = await getCollectionStats(collectionPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

      mainWindow.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid, brunoConfig);

      lastOpenedCollections.add(collectionPath);

      // create folder and files based on collection
      await parseCollectionItems(collection.items, collectionPath, collectionFiletype);
      await parseEnvironments(collection.environments, collectionPath, collectionFiletype);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:clone-folder', async (event, itemFolder, collectionPath) => {
    try {
      if (fs.existsSync(collectionPath)) {
        throw new Error(`folder: ${collectionPath} already exists`);
      }

      // Get the parent collection path to determine filetype
      const parentCollectionPath = path.dirname(collectionPath);
      const filetype = await getCollectionFiletype(parentCollectionPath, lastOpenedCollections);
      const extension = getFileExtensionFromFiletype(filetype);

      // Recursive function to parse the folder and create files/folders
      const parseCollectionItems = (items = [], currentPath) => {
        items.forEach(async (item) => {
          if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
            const content = await stringifyRequestViaWorker(item, { format: filetype });
            const filePath = path.join(currentPath, item.filename);
            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            const folderPath = path.join(currentPath, item.filename);
            fs.mkdirSync(folderPath);

            // If folder has a root element, then I should write its folder file
            if (item.root) {
              const folderContent = await stringifyFolder(item.root, { format: filetype });
              folderContent.name = item.name;
              if (folderContent) {
                const bruFolderPath = path.join(folderPath, `folder${extension}`);
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

      // If initial folder has a root element, then I should write its folder file
      if (itemFolder.root) {
        const folderContent = await stringifyFolder(itemFolder.root, { format: filetype });
        if (folderContent) {
          const bruFolderPath = path.join(collectionPath, `folder${extension}`);
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
          let collectionPath = path.dirname(item.pathname);
          while (collectionPath !== path.dirname(collectionPath)) {
            const hasBrunoJson = fs.existsSync(path.join(collectionPath, 'bruno.json'));
            const hasOpenCollectionYml = fs.existsSync(path.join(collectionPath, 'opencollection.yml'));
            if (hasBrunoJson || hasOpenCollectionYml) {
              break;
            }
            collectionPath = path.dirname(collectionPath);
          }

          const collectionFiletype = getCollectionFiletypeSync(collectionPath);
          const folderExtension = getFileExtensionFromFiletype(collectionFiletype);
          const folderRootPath = path.join(item.pathname, `folder${folderExtension}`);

          let folderBruJsonData = {
            meta: {
              name: path.basename(item.pathname),
              seq: item.seq
            }
          };

          if (fs.existsSync(folderRootPath)) {
            const fileContent = fs.readFileSync(folderRootPath, 'utf8');
            folderBruJsonData = await parseFolder(fileContent, { format: collectionFiletype });
            if (!folderBruJsonData?.meta) {
              folderBruJsonData.meta = {
                name: path.basename(item.pathname),
                seq: item.seq
              };
            } else {
              folderBruJsonData.meta.seq = item.seq;
            }
          }

          const content = await stringifyFolder(folderBruJsonData, { format: collectionFiletype });
          await writeFile(folderRootPath, content);
        } else {
          if (fs.existsSync(item.pathname)) {
            const fileContent = fs.readFileSync(item.pathname, 'utf8');
            const format = detectFileFormat(item.pathname);

            const existingRequest = await parseRequest(fileContent, { format });

            existingRequest.seq = item.seq;

            const content = await stringifyRequestViaWorker(existingRequest, { format });
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

      // Find the collection root to determine filetype
      let collectionPath = folderPath;
      while (collectionPath !== path.dirname(collectionPath)) {
        if (fs.existsSync(path.join(collectionPath, 'bruno.json'))) {
          break;
        }
        collectionPath = path.dirname(collectionPath);
      }

      // Get collection filetype and search for files in folderPath only
      let collectionFiletype = 'bru';
      try {
        const brunoJsonPath = path.join(collectionPath, 'bruno.json');
        if (fs.existsSync(brunoJsonPath)) {
          const brunoJsonContent = fs.readFileSync(brunoJsonPath, 'utf8');
          const brunoConfig = JSON.parse(brunoJsonContent);
          collectionFiletype = brunoConfig.filetype || 'bru';
        }
      } catch (error) {
        console.warn('Error reading collection filetype, defaulting to bru:', error);
      }

      const bruFilesAtSource = await searchForRequestFiles(folderPath, collectionFiletype);

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
      const transformedBrunoConfig = transformBrunoConfigBeforeSave(brunoConfig);

      const ocYmlPath = path.join(collectionPath, 'opencollection.yml');

      if (fs.existsSync(ocYmlPath)) {
        const { parseOpenCollection, stringifyOpenCollection } = require('@usebruno/filestore');

        try {
          const existingContent = fs.readFileSync(ocYmlPath, 'utf8');
          const parsed = parseOpenCollection(existingContent);

          const existingBrunoConfig = parsed.brunoConfig || {};
          const existingCollectionRoot = parsed.root || {};

          const mergedBrunoConfig = {
            ...existingBrunoConfig,
            ...transformedBrunoConfig
          };

          const updatedContent = stringifyOpenCollection(mergedBrunoConfig, existingCollectionRoot);

          await writeFile(ocYmlPath, updatedContent);
        } catch (parseError) {
          throw new Error(`Failed to update opencollection.yml: ${parseError.message}`);
        }
      } else {
        const brunoConfigPath = path.join(collectionPath, 'bruno.json');
        const content = await stringifyJson(transformedBrunoConfig);
        await writeFile(brunoConfigPath, content);
      }
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

  const updateCookiesAndNotify = async () => {
    const domainsWithCookies = await getDomainsWithCookies();
    mainWindow.webContents.send(
      'main:cookies-update',
      safeParseJSON(safeStringifyJSON(domainsWithCookies))
    );
    cookiesStore.saveCookieJar();
  };

  // Delete all cookies for a domain
  ipcMain.handle('renderer:delete-cookies-for-domain', async (event, domain) => {
    try {
      await deleteCookiesForDomain(domain);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:delete-cookie', async (event, domain, path, cookieKey) => {
    try {
      await deleteCookie(domain, path, cookieKey);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // add cookie
  ipcMain.handle('renderer:add-cookie', async (event, domain, cookie) => {
    try {
      await addCookieForDomain(domain, cookie);
      await updateCookiesAndNotify();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // modify cookie
  ipcMain.handle('renderer:modify-cookie', async (event, domain, oldCookie, cookie) => {
    try {
      await modifyCookieForDomain(domain, oldCookie, cookie);
      await updateCookiesAndNotify();
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
        mergeVars(collection, requestCopy, requestTreePath);
        const globalEnvironmentVariables = collection.globalEnvironmentVariables;

        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        const certsAndProxyConfig = await getCertsAndProxyConfig({
          collectionUid,
          collection,
          request: requestCopy,
          envVars,
          runtimeVariables,
          processEnvVars,
          collectionPath,
          globalEnvironmentVariables
        });
        const { oauth2: { grantType } } = requestCopy || {};

        const handleOAuth2Response = (response) => {
          if (response.error && !response.debugInfo) {
            throw new Error(response.error);
          }
          return response;
        };

        switch (grantType) {
          case 'authorization_code':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingAuthorizationCode({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfig
            }).then(handleOAuth2Response);

          case 'client_credentials':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingClientCredentials({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfig
            }).then(handleOAuth2Response);

          case 'password':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingPasswordCredentials({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfig
            }).then(handleOAuth2Response);

          case 'implicit':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingImplicitGrant({
              request: requestCopy,
              collectionUid,
              forceFetch: true
            }).then(handleOAuth2Response);

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

  // todo: could be removed
  ipcMain.handle('renderer:load-request-via-worker', async (event, { collectionUid, pathname }) => {
    let fileStats;
    try {
      fileStats = fs.statSync(pathname);
      if (hasRequestExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        const filetype = detectFileFormat(pathname);
        file.data = await parseRequestViaWorker(bruContent, {
          format: filetype === 'yaml' ? 'yaml' : 'auto',
          filename: pathname
        });
        file.partial = false;
        file.loading = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
      if (hasRequestExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const filetype = detectFileFormat(pathname);
        const metaJson = parseRequest(parseBruFileMeta(bruContent), { format: filetype });
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

  ipcMain.handle('renderer:refresh-oauth2-credentials', async (event, { itemUid, request, collection }) => {
    try {
      if (request.oauth2) {
        let requestCopy = _.cloneDeep(request);
        const { uid: collectionUid, pathname: collectionPath, runtimeVariables, environments = [], activeEnvironmentUid } = collection;
        const environment = _.find(environments, (e) => e.uid === activeEnvironmentUid);
        const envVars = getEnvVars(environment);
        const processEnvVars = getProcessEnvVars(collectionUid);
        const partialItem = { uid: itemUid };
        const requestTreePath = getTreePathFromCollectionToItem(collection, partialItem);
        mergeVars(collection, requestCopy, requestTreePath);
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        const globalEnvironmentVariables = collection.globalEnvironmentVariables;

        const certsAndProxyConfig = await getCertsAndProxyConfig({
          collectionUid,
          collection,
          request: requestCopy,
          envVars,
          runtimeVariables,
          processEnvVars,
          collectionPath,
          globalEnvironmentVariables
        });

        let { credentials, url, credentialsId, debugInfo } = await refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig });
        return { credentials, url, collectionUid, credentialsId, debugInfo };
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
  
  // todo: could be removed
  ipcMain.handle('renderer:load-request', async (event, { collectionUid, pathname }) => {
    let fileStats;
    try {
      fileStats = fs.statSync(pathname);
      if (hasRequestExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        file.data = parseRequest(bruContent);
        file.partial = false;
        file.loading = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
      if (hasRequestExtension(pathname)) {
        const file = {
          meta: {
            collectionUid,
            pathname,
            name: path.basename(pathname)
          }
        };
        let bruContent = fs.readFileSync(pathname, 'utf8');
        const metaJson = parseBruFileMeta(bruContent);
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

  ipcMain.handle('renderer:load-large-request', async (event, { collectionUid, pathname }) => {
    let fileStats;
    if (!hasBruExtension(pathname)) {
      return;
    }

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };

    try {
      fileStats = fs.statSync(pathname);

      const bruContent = fs.readFileSync(pathname, 'utf8');
      const metaJson = parseBruFileMeta(bruContent);

      file.data = metaJson;
      file.partial = false;
      file.loading = true;
      file.size = sizeInMB(fileStats?.size);
      hydrateRequestWithUuid(file.data, pathname);
      await mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);

      try {
        const parsedData = await parseLargeRequestWithRedaction(bruContent);

        file.data = parsedData;
        file.loading = false;
        file.partial = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        await mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
      } catch (parseError) {
        file.data = metaJson;
        file.partial = true;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        await mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        throw parseError;
      }
    } catch (error) {
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
      const brunoCollection = await postmanToBruno(postmanCollection, { useWorkers: true });

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
