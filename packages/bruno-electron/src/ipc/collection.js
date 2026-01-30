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
  stringifyEnvironment,
  parseEnvironment
} = require('@usebruno/filestore');
const { dotenvToJson } = require('@usebruno/lang');
const brunoConverters = require('@usebruno/converters');
const { postmanToBruno } = brunoConverters;
const { cookiesStore } = require('../store/cookies');
const { parseLargeRequestWithRedaction } = require('../utils/parse');
const { wsClient } = require('../ipc/network/ws-event-handlers');
const { hasSubDirectories } = require('../utils/filesystem');

const {
  DEFAULT_GITIGNORE,
  writeFile,
  hasBruExtension,
  isDirectory,
  createDirectory,
  sanitizeName,
  isWSLPath,
  safeToRename,
  isWindowsOS,
  hasRequestExtension,
  getCollectionFormat,
  searchForRequestFiles,
  validateName,
  getCollectionStats,
  sizeInMB,
  safeWriteFileSync,
  copyPath,
  removePath,
  getPaths,
  generateUniqueName,
  isDotEnvFile,
  isBrunoConfigFile,
  isBruEnvironmentConfig,
  isCollectionRootBruFile
} = require('../utils/filesystem');
const { openCollectionDialog, openCollectionsByPathname } = require('../app/collections');
const { generateUidBasedOnHash, stringifyJson, safeStringifyJSON, safeParseJSON } = require('../utils/common');
const { moveRequestUid, deleteRequestUid, syncExampleUidsCache } = require('../cache/requestUids');
const { deleteCookiesForDomain, getDomainsWithCookies, addCookieForDomain, modifyCookieForDomain, parseCookieString, createCookieString, deleteCookie } = require('../utils/cookies');
const EnvironmentSecretsStore = require('../store/env-secrets');
const CollectionSecurityStore = require('../store/collection-security');
const UiStateSnapshotStore = require('../store/ui-state-snapshot');
const interpolateVars = require('./network/interpolate-vars');
const { interpolateString } = require('./network/interpolate-string');
const { getEnvVars, getTreePathFromCollectionToItem, mergeVars, parseBruFileMeta, hydrateRequestWithUuid, transformRequestToSaveToFilesystem } = require('../utils/collection');
const { getProcessEnvVars } = require('../store/process-env');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingImplicitGrant, refreshOauth2Token } = require('../utils/oauth2');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const collectionWatcher = require('../app/collection-watcher');
const { transformBrunoConfigBeforeSave } = require('../utils/transformBrunoConfig');
const { REQUEST_TYPES } = require('../utils/constants');
const { cancelOAuth2AuthorizationRequest, isOauth2AuthorizationRequestInProgress } = require('../utils/oauth2-protocol-handler');

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

const findCollectionPathByItemPath = (filePath) => {
  const tmpDir = os.tmpdir();
  const parts = filePath.split(path.sep);
  const index = parts.findIndex((part) => part.startsWith('bruno-'));

  if (filePath.startsWith(tmpDir) && index !== -1) {
    const transientDirPath = parts.slice(0, index + 1).join(path.sep);
    const metadataPath = path.join(transientDirPath, 'metadata.json');
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      if (metadata.collectionPath) {
        return metadata.collectionPath;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  const allCollectionPaths = collectionWatcher.getAllWatcherPaths();

  // Find the collection path that contains this file
  // Sort by length descending to find the most specific (deepest) match first
  const sortedPaths = allCollectionPaths.sort((a, b) => b.length - a.length);

  for (const collectionPath of sortedPaths) {
    if (filePath.startsWith(collectionPath + path.sep) || filePath === collectionPath) {
      return collectionPath;
    }
  }

  return null;
};

const validatePathIsInsideCollection = (filePath) => {
  const collectionPath = findCollectionPathByItemPath(filePath);

  if (!collectionPath) {
    throw new Error(`Path: ${filePath} should be inside a collection`);
  }
};

const registerRendererEventHandlers = (mainWindow, watcher) => {
  // create collection
  ipcMain.handle(
    'renderer:create-collection',
    async (event, collectionName, collectionFolderName, collectionLocation, options = {}) => {
      try {
        const format = options.format || 'bru';
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
        let brunoConfig = {
          version: '1',
          name: collectionName,
          type: 'collection',
          ignore: ['node_modules', '.git']
        };

        if (format === 'yml') {
          const collectionRoot = {
            meta: {
              name: collectionName
            }
          };
          // For YAML collections, set opencollection instead of version
          brunoConfig = {
            opencollection: '1.0.0',
            name: collectionName,
            type: 'collection',
            ignore: ['node_modules', '.git']
          };
          const content = stringifyCollection(collectionRoot, brunoConfig, { format });
          await writeFile(path.join(dirPath, 'opencollection.yml'), content);
        } else if (format === 'bru') {
          const content = await stringifyJson(brunoConfig);
          await writeFile(path.join(dirPath, 'bruno.json'), content);
        } else {
          throw new Error(`Invalid format: ${format}`);
        }

        await writeFile(path.join(dirPath, '.gitignore'), DEFAULT_GITIGNORE);

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
      const format = getCollectionFormat(previousPath);
      let brunoConfig;

      if (format === 'yml') {
        const configFilePath = path.join(previousPath, 'opencollection.yml');
        const content = fs.readFileSync(configFilePath, 'utf8');
        const {
          brunoConfig: parsedBrunoConfig,
          collectionRoot
        } = parseCollection(content, { format });

        brunoConfig = parsedBrunoConfig;
        brunoConfig.name = collectionName;

        const newContent = stringifyCollection(collectionRoot, brunoConfig, { format });
        await writeFile(path.join(dirPath, 'opencollection.yml'), newContent);
      } else if (format === 'bru') {
        const configFilePath = path.join(previousPath, 'bruno.json');
        const content = fs.readFileSync(configFilePath, 'utf8');
        brunoConfig = JSON.parse(content);
        brunoConfig.name = collectionName;
        const newContent = await stringifyJson(brunoConfig);
        await writeFile(path.join(dirPath, 'bruno.json'), newContent);
      } else {
        throw new Error(`Invalid collectionformat: ${format}`);
      }

      // Now copy all the files matching the collection's filetype along with the dir
      const files = searchForRequestFiles(previousPath);

      for (const sourceFilePath of files) {
        const relativePath = path.relative(previousPath, sourceFilePath);
        const newFilePath = path.join(dirPath, relativePath);

        // skip if the file is opencollection.yml or bruno.json at the root of the collection
        const isRootConfigFile = (path.basename(sourceFilePath) === 'opencollection.yml' || path.basename(sourceFilePath) === 'bruno.json')
          && path.dirname(sourceFilePath) === previousPath;

        if (isRootConfigFile) {
          continue;
        }

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
      const format = getCollectionFormat(collectionPathname);

      if (format === 'yml') {
        const configFilePath = path.join(collectionPathname, 'opencollection.yml');
        const content = fs.readFileSync(configFilePath, 'utf8');
        const {
          brunoConfig,
          collectionRoot
        } = parseCollection(content, { format: 'yml' });

        brunoConfig.name = newName;

        const newContent = stringifyCollection(collectionRoot, brunoConfig, { format: 'yml' });
        await writeFile(path.join(collectionPathname, 'opencollection.yml'), newContent);
      } else if (format === 'bru') {
        const configFilePath = path.join(collectionPathname, 'bruno.json');
        const content = fs.readFileSync(configFilePath, 'utf8');
        const brunoConfig = JSON.parse(content);
        brunoConfig.name = newName;
        const newContent = await stringifyJson(brunoConfig);
        await writeFile(path.join(collectionPathname, 'bruno.json'), newContent);
      } else {
        throw new Error(`Invalid format: ${format}`);
      }

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
      const { name: folderName, root: folderRoot = {}, folderPathname, collectionPathname } = folder;

      const format = getCollectionFormat(collectionPathname);
      const folderFilePath = path.join(folderPathname, `folder.${format}`);

      if (!folderRoot.meta) {
        folderRoot.meta = {
          name: folderName
        };
      }

      const content = await stringifyFolder(folderRoot, { format });
      await writeFile(folderFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save collection root
  ipcMain.handle('renderer:save-collection-root', async (event, collectionPathname, collectionRoot, brunoConfig) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const filename = format === 'yml' ? 'opencollection.yml' : 'collection.bru';
      const content = await stringifyCollection(collectionRoot, brunoConfig, { format });

      await writeFile(path.join(collectionPathname, filename), content);
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

      const collectionPath = findCollectionPathByItemPath(pathname);
      if (!collectionPath) {
        throw new Error('Collection not found for the given pathname');
      }
      const format = getCollectionFormat(collectionPath);

      // For the actual filename part, we want to be strict
      const baseFilename = request?.filename?.replace(`.${format}`, '');
      if (!validateName(baseFilename)) {
        throw new Error(`${request.filename} is not a valid filename`);
      }
      validatePathIsInsideCollection(pathname);

      const content = await stringifyRequestViaWorker(request, { format });
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save request
  ipcMain.handle('renderer:save-request', async (event, pathname, request, format) => {
    try {
      if (!fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} does not exist`);
      }

      // Sync example UIDs cache to maintain consistency when examples are added/deleted/reordered
      syncExampleUidsCache(pathname, request.examples);

      const content = await stringifyRequestViaWorker(request, { format });
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // save transient request (handles move from temp to permanent location)
  ipcMain.handle('renderer:save-transient-request', async (event, { sourcePathname, targetDirname, targetFilename, request, format }) => {
    try {
      // Validate source exists
      if (!fs.existsSync(sourcePathname)) {
        throw new Error(`Source path: ${sourcePathname} does not exist`);
      }

      // Validate target directory exists
      if (!fs.existsSync(targetDirname)) {
        throw new Error(`Target directory: ${targetDirname} does not exist`);
      }

      // Check if the target directory is inside a collection
      validatePathIsInsideCollection(targetDirname);

      // Use provided target filename or fall back to source filename
      const filename = targetFilename || path.basename(sourcePathname);
      const targetPathname = path.join(targetDirname, filename);

      // Check for filename conflicts and throw error if exists
      if (fs.existsSync(targetPathname)) {
        throw new Error(`A file with the name "${filename}" already exists in the target location`);
      }

      // Step 1: Save the updated content to the transient file
      syncExampleUidsCache(sourcePathname, request.examples);
      const content = await stringifyRequestViaWorker(request, { format });
      await writeFile(sourcePathname, content);

      // Step 2: Read the file content from temp (this is the actual file content)
      const fileContent = await fs.promises.readFile(sourcePathname, 'utf8');

      // Step 3: Create new file at target location with the content
      await writeFile(targetPathname, fileContent);

      // Step 4: Delete the old temp file
      await removePath(sourcePathname);

      // Return the new pathname (file watcher will handle adding to Redux)
      return { newPathname: targetPathname };
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

        const content = await stringifyRequestViaWorker(request, { format: r.format });
        await writeFile(pathname, content);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Helper: Parse file content based on scope type
  const parseFileByType = async (fileContent, scopeType, format) => {
    switch (scopeType) {
      case 'request':
        return await parseRequestViaWorker(fileContent, { format });
      case 'folder':
        return parseFolder(fileContent, { format });
      case 'collection':
        return parseCollection(fileContent, { format });
      default:
        throw new Error(`Invalid scope type: ${scopeType}`);
    }
  };

  const stringifyByType = async (data, scopeType, collectionRoot, format) => {
    switch (scopeType) {
      case 'request':
        return await stringifyRequestViaWorker(data, { format });
      case 'folder':
        return stringifyFolder(data, { format });
      case 'collection':
        return stringifyCollection(collectionRoot, data, { format });
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
  ipcMain.handle('renderer:update-variable-in-file', async (event, pathname, variable, scopeType, collectionRoot, format) => {
    try {
      if (!fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} does not exist`);
      }

      // Read and parse the file
      const fileContent = fs.readFileSync(pathname, 'utf8');
      const parsedData = await parseFileByType(fileContent, scopeType, format);

      // Update the specific variable or create it if it doesn't exist
      const varsPath = 'request.vars.req';
      const variables = _.get(parsedData, varsPath, []);
      const updatedVariables = updateOrCreateVariable(variables, variable);

      _.set(parsedData, varsPath, updatedVariables);

      const content = await stringifyByType(parsedData, scopeType, collectionRoot, format);
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

      const format = getCollectionFormat(collectionPathname);

      // Get existing environment files to generate unique name
      const existingFiles = fs.existsSync(envDirPath) ? fs.readdirSync(envDirPath) : [];
      const existingEnvNames = existingFiles
        .filter((file) => file.endsWith(`.${format}`))
        .map((file) => path.basename(file, `.${format}`));

      // Generate unique name based on existing environment files
      const sanitizedName = sanitizeName(name);
      const uniqueName = generateUniqueName(sanitizedName, (name) => existingEnvNames.includes(name));

      const envFilePath = path.join(envDirPath, `${uniqueName}.${format}`);

      const environment = {
        name: uniqueName,
        variables: variables || []
      };

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = await stringifyEnvironment(environment, { format });

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

      const format = getCollectionFormat(collectionPathname);
      // Determine filetype from collection
      const envFilePath = path.join(envDirPath, `${environment.name}.${format}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      if (envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(collectionPathname, environment);
      }

      const content = await stringifyEnvironment(environment, { format });
      await writeFile(envFilePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename environment
  ipcMain.handle('renderer:rename-environment', async (event, collectionPathname, environmentName, newName) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.${format}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      const newEnvFilePath = path.join(envDirPath, `${newName}.${format}`);
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
      const format = getCollectionFormat(collectionPathname);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.${format}`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      fs.unlinkSync(envFilePath);

      environmentSecretsStore.deleteEnvironment(collectionPathname, environmentName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // update environment color
  ipcMain.handle('renderer:update-environment-color', async (event, collectionPathname, environmentName, color) => {
    try {
      const format = getCollectionFormat(collectionPathname);
      const envDirPath = path.join(collectionPathname, 'environments');
      const envFilePath = path.join(envDirPath, `${environmentName}.${format}`);

      if (!fs.existsSync(envFilePath)) {
        throw new Error(`environment: ${envFilePath} does not exist`);
      }

      // Read, update color, and write back to file
      const fileContent = fs.readFileSync(envFilePath, 'utf8');
      const environment = parseEnvironment(fileContent, { format });
      environment.color = color;
      const updatedContent = stringifyEnvironment(environment, { format });
      fs.writeFileSync(envFilePath, updatedContent, 'utf8');
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
  ipcMain.handle('renderer:rename-item-name', async (event, { itemPath, newName, collectionPathname }) => {
    try {
      if (!fs.existsSync(itemPath)) {
        throw new Error(`path: ${itemPath} does not exist`);
      }

      if (isDirectory(itemPath)) {
        const format = getCollectionFormat(collectionPathname);
        const folderFilePath = path.join(itemPath, `folder.${format}`);
        let folderFileJsonContent;
        if (fs.existsSync(folderFilePath)) {
          const oldFolderFileContent = await fs.promises.readFile(folderFilePath, 'utf8');
          folderFileJsonContent = await parseFolder(oldFolderFileContent, { format });
          folderFileJsonContent.meta.name = newName;
        } else {
          folderFileJsonContent = {
            meta: {
              name: newName
            }
          };
        }

        const folderFileContent = await stringifyFolder(folderFileJsonContent, { format });
        await writeFile(folderFilePath, folderFileContent);

        return;
      }

      const format = getCollectionFormat(collectionPathname);
      if (!hasRequestExtension(itemPath, format)) {
        throw new Error(`path: ${itemPath} is not a valid request file`);
      }

      const data = fs.readFileSync(itemPath, 'utf8');
      const jsonData = parseRequest(data, { format });
      jsonData.name = newName;
      const content = stringifyRequest(jsonData, { format });
      await writeFile(itemPath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // rename item
  ipcMain.handle('renderer:rename-item-filename', async (event, { oldPath, newPath, newName, newFilename, collectionPathname }) => {
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

      const format = getCollectionFormat(collectionPathname);

      if (isDirectory(oldPath)) {
        const folderFilePath = path.join(oldPath, `folder.${format}`);
        let folderFileJsonContent;
        if (fs.existsSync(folderFilePath)) {
          const oldFolderFileContent = await fs.promises.readFile(folderFilePath, 'utf8');
          folderFileJsonContent = await parseFolder(oldFolderFileContent, { format });
          folderFileJsonContent.meta.name = newName;
        } else {
          folderFileJsonContent = {
            meta: {
              name: newName
            }
          };
        }

        const folderFileContent = await stringifyFolder(folderFileJsonContent, { format });
        await writeFile(folderFilePath, folderFileContent);

        const requestFilesAtSource = await searchForRequestFiles(oldPath, collectionPathname);

        for (let requestFile of requestFilesAtSource) {
          const newRequestFilePath = requestFile.replace(oldPath, newPath);
          moveRequestUid(requestFile, newRequestFilePath);
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

      if (!hasRequestExtension(oldPath, format)) {
        throw new Error(`path: ${oldPath} is not a valid request file`);
      }

      if (!validateName(newFilename)) {
        throw new Error(`path: ${newFilename} is not a valid filename`);
      }

      // update name in file and save new copy, then delete old copy
      const data = await fs.promises.readFile(oldPath, 'utf8'); // Use async read
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
            console.error('Failed to restore data to the old path:', err);
          }
        }
      }

      return Promise.reject(error);
    }
  });

  // new folder
  ipcMain.handle('renderer:new-folder', async (event, { pathname, folderData, format }) => {
    const resolvedFolderName = sanitizeName(path.basename(pathname));
    pathname = path.join(path.dirname(pathname), resolvedFolderName);
    try {
      if (!fs.existsSync(pathname)) {
        fs.mkdirSync(pathname);
        const folderFilePath = path.join(pathname, `folder.${format}`);
        const content = await stringifyFolder(folderData, { format });
        await writeFile(folderFilePath, content);
      } else {
        return Promise.reject(new Error('The directory already exists'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // delete file/folder
  ipcMain.handle('renderer:delete-item', async (event, pathname, type, collectionPathname) => {
    try {
      if (type === 'folder') {
        if (!fs.existsSync(pathname)) {
          return Promise.reject(new Error('The directory does not exist'));
        }

        // delete the request uid mappings
        const requestFilesAtSource = await searchForRequestFiles(pathname, collectionPathname);
        for (let requestFile of requestFilesAtSource) {
          deleteRequestUid(requestFile);
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

  ipcMain.handle('renderer:open-collection', async () => {
    if (watcher && mainWindow) {
      await openCollectionDialog(mainWindow, watcher);
    }
  });

  ipcMain.handle('renderer:open-multiple-collections', async (e, collectionPaths, options = {}) => {
    if (watcher && mainWindow) {
      await openCollectionsByPathname(mainWindow, watcher, collectionPaths);
      if (options.workspacePath) {
        const { setCollectionWorkspace } = require('../store/process-env');
        const { generateUidBasedOnHash } = require('../utils/common');
        for (const collectionPath of collectionPaths) {
          const collectionUid = generateUidBasedOnHash(collectionPath);
          setCollectionWorkspace(collectionUid, options.workspacePath);
        }
      }
    }
  });

  ipcMain.handle('renderer:set-collection-workspace', (event, collectionUid, workspacePath) => {
    if (workspacePath) {
      const { setCollectionWorkspace } = require('../store/process-env');
      setCollectionWorkspace(collectionUid, workspacePath);
    }
  });

  ipcMain.handle('renderer:remove-collection', async (event, collectionPath, collectionUid, workspacePath) => {
    if (watcher && mainWindow) {
      watcher.removeWatcher(collectionPath, mainWindow, collectionUid);

      if (wsClient) {
        wsClient.closeForCollection(collectionUid);
      }
    }

    // Clean up
    const { clearCollectionWorkspace } = require('../store/process-env');
    clearCollectionWorkspace(collectionUid);

    if (workspacePath && workspacePath !== 'default') {
      try {
        const { removeCollectionFromWorkspace } = require('../utils/workspace-config');
        await removeCollectionFromWorkspace(workspacePath, collectionPath);
      } catch (error) {
        console.error('Error removing collection from workspace.yml:', error);
      }
    }
  });

  ipcMain.handle('renderer:import-collection', async (_, collection, collectionLocation, format = 'bru') => {
    try {
      let collectionName = sanitizeName(collection.name);
      let collectionPath = path.join(collectionLocation, collectionName);

      if (fs.existsSync(collectionPath)) {
        throw new Error(`collection: ${collectionPath} already exists`);
      }

      const getFilenameWithFormat = (item, format) => {
        if (item?.filename) {
          const ext = path.extname(item.filename);
          if (ext === '.bru' || ext === '.yml') {
            return item.filename.replace(ext, `.${format}`);
          }
          return item.filename;
        }
        return `${item.name}.${format}`;
      };

      // Recursive function to parse the collection items and create files/folders
      const parseCollectionItems = async (items = [], currentPath) => {
        await Promise.all(items.map(async (item) => {
          if (['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type)) {
            let sanitizedFilename = sanitizeName(getFilenameWithFormat(item, format));
            const content = await stringifyRequestViaWorker(item, { format });
            const filePath = path.join(currentPath, sanitizedFilename);
            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
            const folderPath = path.join(currentPath, sanitizedFolderName);
            fs.mkdirSync(folderPath);

            if (item?.root?.meta?.name) {
              const folderFilePath = path.join(folderPath, `folder.${format}`);
              item.root.meta.seq = item.seq;
              const folderContent = await stringifyFolder(item.root, { format });
              safeWriteFileSync(folderFilePath, folderContent);
            }

            if (item.items && item.items.length) {
              await parseCollectionItems(item.items, folderPath);
            }
          }
          // Handle items of type 'js'
          if (item.type === 'js') {
            let sanitizedFilename = sanitizeName(item?.filename || `${item.name}.js`);
            const filePath = path.join(currentPath, sanitizedFilename);
            safeWriteFileSync(filePath, item.fileContent);
          }
        }));
      };

      const parseEnvironments = async (environments = [], collectionPath) => {
        const envDirPath = path.join(collectionPath, 'environments');
        if (!fs.existsSync(envDirPath)) {
          fs.mkdirSync(envDirPath);
        }

        await Promise.all(environments.map(async (env) => {
          const content = await stringifyEnvironment(env, { format });
          let sanitizedEnvFilename = sanitizeName(`${env.name}.${format}`);
          const filePath = path.join(envDirPath, sanitizedEnvFilename);
          safeWriteFileSync(filePath, content);
        }));
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

      if (format === 'yml') {
        brunoConfig.opencollection = '1.0.0';
        const collectionContent = await stringifyCollection(collection.root, brunoConfig, { format });
        await writeFile(path.join(collectionPath, 'opencollection.yml'), collectionContent);
      } else if (format === 'bru') {
        const stringifiedBrunoConfig = await stringifyJson(brunoConfig);
        await writeFile(path.join(collectionPath, 'bruno.json'), stringifiedBrunoConfig);

        const collectionContent = await stringifyCollection(collection.root, brunoConfig, { format });
        await writeFile(path.join(collectionPath, 'collection.bru'), collectionContent);
      } else {
        throw new Error(`Invalid format: ${format}`);
      }

      const { size, filesCount } = await getCollectionStats(collectionPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

      mainWindow.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid, brunoConfig);

      // create folder and files based on collection
      await parseCollectionItems(collection.items, collectionPath);
      await parseEnvironments(collection.environments, collectionPath);

      return collectionPath;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:clone-folder', async (event, itemFolder, collectionPath, collectionPathname) => {
    try {
      if (fs.existsSync(collectionPath)) {
        throw new Error(`folder: ${collectionPath} already exists`);
      }

      const format = getCollectionFormat(collectionPathname);

      // Recursive function to parse the folder and create files/folders
      const parseCollectionItems = (items = [], currentPath) => {
        items.forEach(async (item) => {
          if (['http-request', 'graphql-request', 'grpc-request'].includes(item.type)) {
            const content = await stringifyRequestViaWorker(item, { format });

            // Use the correct file extension based on target format
            const baseName = path.parse(item.filename).name;
            const newFilename = format === 'yml' ? `${baseName}.yml` : `${baseName}.bru`;
            const filePath = path.join(currentPath, newFilename);

            safeWriteFileSync(filePath, content);
          }
          if (item.type === 'folder') {
            const folderPath = path.join(currentPath, item.filename);
            fs.mkdirSync(folderPath);

            // If folder has a root element, then I should write its folder file
            if (item.root) {
              const folderContent = await stringifyFolder(item.root, { format });
              folderContent.name = item.name;
              if (folderContent) {
                const folderFilePath = path.join(folderPath, `folder.${format}`);
                safeWriteFileSync(folderFilePath, folderContent);
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
        const folderContent = await stringifyFolder(itemFolder.root, { format });
        if (folderContent) {
          const folderFilePath = path.join(collectionPath, `folder.${format}`);
          safeWriteFileSync(folderFilePath, folderContent);
        }
      }

      // create folder and files based on another folder
      await parseCollectionItems(itemFolder.items, collectionPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:resequence-items', async (event, itemsToResequence, collectionPathname) => {
    try {
      const format = getCollectionFormat(collectionPathname);

      for (let item of itemsToResequence) {
        if (item?.type === 'folder') {
          const folderRootPath = path.join(item.pathname, `folder.${format}`);
          let folderJsonData = {
            meta: {
              name: path.basename(item.pathname),
              seq: item.seq
            }
          };
          if (fs.existsSync(folderRootPath)) {
            const folderContent = fs.readFileSync(folderRootPath, 'utf8');
            folderJsonData = await parseFolder(folderContent, { format });
            if (!folderJsonData?.meta) {
              folderJsonData.meta = {
                name: path.basename(item.pathname),
                seq: item.seq
              };
            }
            if (folderJsonData?.meta?.seq === item.seq) {
              continue;
            }
            folderJsonData.meta.seq = item.seq;
          }
          const content = await stringifyFolder(folderJsonData, { format });
          await writeFile(folderRootPath, content);
        } else if (REQUEST_TYPES.includes(item?.type)) {
          if (fs.existsSync(item.pathname)) {
            const itemToSave = transformRequestToSaveToFilesystem(item);
            const content = await stringifyRequestViaWorker(itemToSave, { format });
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
        const pathnamesAfter = pathnamesBefore?.map((p) => p?.replace(sourceDirname, targetDirname));
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

      const requestFilesAtSource = await searchForRequestFiles(folderPath);

      for (let requestFile of requestFilesAtSource) {
        const newRequestFilePath = requestFile.replace(folderPath, newFolderPath);
        moveRequestUid(requestFile, newRequestFilePath);
      }

      fs.renameSync(folderPath, newFolderPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-bruno-config', async (event, brunoConfig, collectionPath, collectionRoot) => {
    try {
      const transformedBrunoConfig = transformBrunoConfigBeforeSave(brunoConfig);
      const format = getCollectionFormat(collectionPath);

      if (format === 'bru') {
        const brunoConfigPath = path.join(collectionPath, 'bruno.json');
        const content = await stringifyJson(transformedBrunoConfig);
        await writeFile(brunoConfigPath, content);
      } else if (format === 'yml') {
        const content = await stringifyCollection(collectionRoot, transformedBrunoConfig, { format });
        await writeFile(path.join(collectionPath, 'opencollection.yml'), content);
      } else {
        throw new Error(`Invalid collection format: ${format}`);
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
        const promptVariables = collection.promptVariables;
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        const { oauth2: { grantType, accessTokenUrl, refreshTokenUrl }, collectionVariables, folderVariables, requestVariables } = requestCopy || {};

        // For OAuth2 token requests, use accessTokenUrl for cert/proxy config instead of main request URL
        let certsAndProxyConfigForTokenUrl = null;
        let certsAndProxyConfigForRefreshUrl = null;

        if (accessTokenUrl && grantType !== 'implicit') {
          const interpolatedTokenUrl = interpolateString(accessTokenUrl, {
            globalEnvironmentVariables,
            collectionVariables,
            envVars,
            folderVariables,
            requestVariables,
            runtimeVariables,
            processEnvVars,
            promptVariables
          });
          let tokenRequestForConfig = { ...requestCopy, url: interpolatedTokenUrl };
          certsAndProxyConfigForTokenUrl = await getCertsAndProxyConfig({
            collectionUid,
            collection,
            request: tokenRequestForConfig,
            envVars,
            runtimeVariables,
            processEnvVars,
            collectionPath,
            globalEnvironmentVariables
          });
        }

        // For refresh token requests, use refreshTokenUrl if available, otherwise accessTokenUrl
        const tokenUrlForRefresh = refreshTokenUrl || accessTokenUrl;
        if (tokenUrlForRefresh && grantType !== 'implicit') {
          const interpolatedRefreshUrl = interpolateString(tokenUrlForRefresh, {
            globalEnvironmentVariables,
            collectionVariables,
            envVars,
            folderVariables,
            requestVariables,
            runtimeVariables,
            processEnvVars,
            promptVariables
          });
          let refreshRequestForConfig = { ...requestCopy, url: interpolatedRefreshUrl };
          certsAndProxyConfigForRefreshUrl = await getCertsAndProxyConfig({
            collectionUid,
            collection,
            request: refreshRequestForConfig,
            envVars,
            runtimeVariables,
            processEnvVars,
            collectionPath,
            globalEnvironmentVariables
          });
        }

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
              certsAndProxyConfigForTokenUrl,
              certsAndProxyConfigForRefreshUrl
            }).then(handleOAuth2Response);

          case 'client_credentials':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingClientCredentials({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfigForTokenUrl,
              certsAndProxyConfigForRefreshUrl
            }).then(handleOAuth2Response);

          case 'password':
            interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
            return await getOAuth2TokenUsingPasswordCredentials({
              request: requestCopy,
              collectionUid,
              forceFetch: true,
              certsAndProxyConfigForTokenUrl,
              certsAndProxyConfigForRefreshUrl
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

  ipcMain.handle('renderer:cancel-oauth2-authorization-request', async () => {
    try {
      const cancelled = cancelOAuth2AuthorizationRequest();
      return { success: true, cancelled };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:is-oauth2-authorization-request-in-progress', () => {
    return isOauth2AuthorizationRequestInProgress();
  });

  // todo: could be removed
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
        const metaJson = parseBruFileMeta(bruContent);
        file.data = metaJson;
        file.loading = true;
        file.partial = true;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        mainWindow.webContents.send('main:collection-tree-updated', 'addFile', file);
        file.data = await parseRequestViaWorker(bruContent, { format: 'bru' });
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
        const parsedData = await parseLargeRequestWithRedaction(bruContent, 'bru');

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
    let tempDirectoryPath = null;
    try {
      tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-'));
      const metadata = {
        collectionPath: collectionPathname
      };
      fs.writeFileSync(path.join(tempDirectoryPath, 'metadata.json'), JSON.stringify(metadata));
    } catch (error) {
      throw error;
    }
    const {
      size,
      filesCount,
      maxFileSize
    } = await getCollectionStats(collectionPathname);

    const shouldLoadCollectionAsync
      = (size > MAX_COLLECTION_SIZE_IN_MB)
        || (filesCount > MAX_COLLECTION_FILES_COUNT)
        || (maxFileSize > MAX_SINGLE_FILE_SIZE_IN_COLLECTION_IN_MB);

    watcher.addWatcher(mainWindow, collectionPathname, collectionUid, brunoConfig, false, shouldLoadCollectionAsync);

    // Add watcher for transient directory
    watcher.addTempDirectoryWatcher(mainWindow, tempDirectoryPath, collectionUid, collectionPathname);

    return tempDirectoryPath;
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

  ipcMain.handle('renderer:get-collection-json', async (event, collectionPath) => {
    let variables = {};
    let name = '';
    const getBruFilesRecursively = async (dir) => {
      const getFilesInOrder = async (dir) => {
        let bruJsons = [];

        const traverse = async (currentPath) => {
          const filesInCurrentDir = fs.readdirSync(currentPath);

          if (currentPath.includes('node_modules')) {
            return;
          }

          for (const file of filesInCurrentDir) {
            const filePath = path.join(currentPath, file);
            const stats = fs.lstatSync(filePath);

            if (stats.isDirectory() && !filePath.startsWith('.git') && !filePath.startsWith('node_modules')) {
              await traverse(filePath);
            }
          }

          const currentDirBruJsons = [];
          for (const file of filesInCurrentDir) {
            const filePath = path.join(currentPath, file);
            const stats = fs.lstatSync(filePath);

            if (isBrunoConfigFile(filePath, collectionPath)) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const brunoConfig = JSON.parse(content);

                name = brunoConfig?.name;
              } catch (err) {
                console.error(err);
              }
            }

            if (isDotEnvFile(filePath, collectionPath)) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const jsonData = dotenvToJson(content);
                variables = {
                  ...variables,
                  processEnvVariables: {
                    ...process.env,
                    ...jsonData
                  }
                };
                continue;
              } catch (err) {
                console.error(err);
              }
            }

            if (isBruEnvironmentConfig(filePath, collectionPath)) {
              try {
                let bruContent = fs.readFileSync(filePath, 'utf8');
                const environmentFilepathBasename = path.basename(filePath);
                const environmentName = environmentFilepathBasename.substring(0, environmentFilepathBasename.length - 4);
                let data = await parseEnvironment(bruContent);
                variables = {
                  ...variables,
                  envVariables: {
                    ...(variables?.envVariables || {}),
                    [path.basename(filePath)]: data.variables
                  }
                };
                continue;
              } catch (err) {
                console.error(err);
              }
            }

            if (isCollectionRootBruFile(filePath, collectionPath)) {
              try {
                let bruContent = fs.readFileSync(filePath, 'utf8');
                let data = await parseCollection(bruContent);
                // TODO
                continue;
              } catch (err) {
                console.error(err);
              }
            }
            if (!stats.isDirectory() && path.extname(filePath) === '.bru' && file !== 'folder.bru') {
              const bruContent = fs.readFileSync(filePath, 'utf8');
              const bruJson = parseRequest(bruContent);

              currentDirBruJsons.push({
                ...bruJson
              });
            }
          }

          bruJsons = bruJsons.concat(currentDirBruJsons);
        };

        await traverse(dir);
        return bruJsons;
      };

      const orderedFiles = await getFilesInOrder(dir);
      return orderedFiles;
    };

    const files = await getBruFilesRecursively(collectionPath);
    return { name, files, ...variables };
  });
};

const registerMainEventHandlers = (mainWindow, watcher) => {
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

const registerCollectionsIpc = (mainWindow, watcher) => {
  registerRendererEventHandlers(mainWindow, watcher);
  registerMainEventHandlers(mainWindow, watcher);
};

module.exports = registerCollectionsIpc;
