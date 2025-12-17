const fs = require('fs');
const path = require('path');
const { dialog, ipcMain } = require('electron');
const Yup = require('yup');
const { isDirectory, getCollectionStats, normalizeAndResolvePath } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');
const { transformBrunoConfigAfterRead } = require('../utils/transfomBrunoConfig');
const { parseCollection } = require('@usebruno/filestore');

// todo: bruno.json config schema validation errors must be propagated to the UI
const configSchema = Yup.object({
  name: Yup.string().max(256, 'name must be 256 characters or less').required('name is required'),
  type: Yup.string().oneOf(['collection']).required('type is required'),
  // For BRU format collections
  version: Yup.string().oneOf(['1']).notRequired(),
  // For YAML format collections (opencollection)
  opencollection: Yup.string().notRequired()
});

const readConfigFile = async (pathname) => {
  try {
    const jsonData = fs.readFileSync(pathname, 'utf8');
    return JSON.parse(jsonData);
  } catch (err) {
    return Promise.reject(new Error('Unable to parse json in bruno.json'));
  }
};

const validateSchema = async (config) => {
  try {
    await configSchema.validate(config);
  } catch (err) {
    return Promise.reject(new Error('bruno.json format is invalid'));
  }
};

const getCollectionConfigFile = async (pathname) => {
  // Check for opencollection.yml first
  const ocYmlPath = path.join(pathname, 'opencollection.yml');
  if (fs.existsSync(ocYmlPath)) {
    try {
      const content = fs.readFileSync(ocYmlPath, 'utf8');
      const {
        brunoConfig
      } = parseCollection(content, { format: 'yml' });
      await validateSchema(brunoConfig);
      return brunoConfig;
    } catch (err) {
      throw new Error(`Unable to parse opencollection.yml: ${err.message}`);
    }
  }

  // Fall back to bruno.json
  const configFilePath = path.join(pathname, 'bruno.json');
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`The collection is not valid (neither bruno.json nor opencollection.yml found)`);
  }

  const config = await readConfigFile(configFilePath);
  await validateSchema(config);

  return config;
};

const openCollectionDialog = async (win, watcher) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory', 'multiSelections']
  });

  if (!canceled && filePaths?.length > 0) {
    // Using Set to remove duplicates
    const { openCollectionPromises, invalidPaths } = [...new Set(filePaths)].reduce((acc, filePath) => {
      const resolvedPath = path.resolve(filePath);

      if (isDirectory(resolvedPath)) {
        // Open each valid collection in parallel
        acc.openCollectionPromises.push(openCollection(win, watcher, resolvedPath).catch((err) => {
          console.error(`[ERROR] Failed to open collection at "${resolvedPath}":`, err.message);
          return { error: err, path: resolvedPath };
        }));
      } else {
        acc.invalidPaths.push(resolvedPath);
        console.error(`[ERROR] Cannot open unknown folder: "${resolvedPath}"`);
      }

      return acc;
    },
    { openCollectionPromises: [], invalidPaths: [] });

    // Wait for all valid collections to be opened
    await Promise.all(openCollectionPromises);

    // Notify about any invalid paths
    if (invalidPaths.length > 0) {
      win.webContents.send('main:display-error', `Some selected folders could not be opened: ${invalidPaths.join(', ')}`);
    }
  }
};

const openCollection = async (win, watcher, collectionPath, options = {}) => {
  if (!watcher.hasWatcher(collectionPath)) {
    try {
      let brunoConfig = await getCollectionConfigFile(collectionPath);
      const uid = generateUidBasedOnHash(collectionPath);

      // Always ensure node_modules and .git are ignored, regardless of user config
      // This prevents infinite loops with symlinked directories (e.g., npm workspaces)
      const defaultIgnores = ['node_modules', '.git'];
      const userIgnores = brunoConfig.ignore || [];
      brunoConfig.ignore = [...new Set([...defaultIgnores, ...userIgnores])];

      // Transform the config to add existence checks for protobuf files and import paths
      brunoConfig = await transformBrunoConfigAfterRead(brunoConfig, collectionPath);

      const { size, filesCount } = await getCollectionStats(collectionPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

      win.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', win, collectionPath, uid, brunoConfig);
    } catch (err) {
      if (!options.dontSendDisplayErrors) {
        win.webContents.send('main:display-error', {
          message: err.message || 'An error occurred while opening the local collection'
        });
      }
    }
  } else {
    win.webContents.send('main:collection-already-opened', collectionPath);
  }
};

const openCollectionsByPathname = async (win, watcher, collectionPaths, options = {}) => {
  for (const collectionPath of collectionPaths) {
    const resolvedPath = path.isAbsolute(collectionPath)
      ? collectionPath
      : normalizeAndResolvePath(collectionPath);
    if (isDirectory(resolvedPath)) {
      await openCollection(win, watcher, resolvedPath, options);
    } else {
      console.error(`Cannot open unknown folder: "${resolvedPath}"`);
    }
  }
};

module.exports = {
  openCollection,
  openCollectionDialog,
  openCollectionsByPathname
};
