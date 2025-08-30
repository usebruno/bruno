const fs = require('fs');
const path = require('path');
const { dialog, ipcMain } = require('electron');
const Yup = require('yup');
const { isDirectory, normalizeAndResolvePath, getCollectionStats } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');

// todo: bruno.json config schema validation errors must be propagated to the UI
const configSchema = Yup.object({
  name: Yup.string().max(256, 'name must be 256 characters or less').required('name is required'),
  type: Yup.string().oneOf(['collection']).required('type is required'),
  version: Yup.string().oneOf(['1']).required('type is required')
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
  const configFilePath = path.join(pathname, 'bruno.json');
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`The collection is not valid (bruno.json not found)`);
  }

  const config = await readConfigFile(configFilePath);
  await validateSchema(config);

  return config;
};

const openCollectionDialog = async (win, watcher) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select Collection Folders',
    properties: ['openDirectory', 'multiSelections'],
    message: 'Select one or more collection folders to open'
  });
  
  if (filePaths && filePaths.length > 0) {
    const validPaths = [];
    const invalidPaths = [];
    
    // Validate all selected paths
    for (const filePath of filePaths) {
      const resolvedPath = path.resolve(filePath);
      if (isDirectory(resolvedPath)) {
        validPaths.push(resolvedPath);
      } else {
        invalidPaths.push(resolvedPath);
        console.error(`[ERROR] Cannot open unknown folder: "${resolvedPath}"`);
      }
    }
    
    // Open all valid collections
    for (const collectionPath of validPaths) {
      try {
        await openCollection(win, watcher, collectionPath);
      } catch (err) {
        console.error(`[ERROR] Failed to open collection at "${collectionPath}":`, err.message);
      }
    }
    
    // Notify about any invalid paths
    if (invalidPaths.length > 0) {
      win.webContents.send('main:display-error', {
        error: `Some selected folders could not be opened: ${invalidPaths.join(', ')}`
      });
    }
  }
};

const openCollection = async (win, watcher, collectionPath, options = {}) => {
  if (!watcher.hasWatcher(collectionPath)) {
    try {
      let brunoConfig = await getCollectionConfigFile(collectionPath);
      const uid = generateUidBasedOnHash(collectionPath);

      if (!brunoConfig.ignore || brunoConfig.ignore.length === 0) {
        // 5 Feb 2024:
        // bruno.json now supports an "ignore" field to specify which folders to ignore
        // if the ignore field is not present, we default to ignoring node_modules and .git
        // this is to maintain backwards compatibility with older collections
        brunoConfig.ignore = ['node_modules', '.git'];
      }

      const { size, filesCount } = await getCollectionStats(collectionPath);
      brunoConfig.size = size;
      brunoConfig.filesCount = filesCount;

      win.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
      ipcMain.emit('main:collection-opened', win, collectionPath, uid, brunoConfig);
    } catch (err) {
      if (!options.dontSendDisplayErrors) {
        win.webContents.send('main:display-error', {
          error: err.message || 'An error occurred while opening the local collection'
        });
      }
    }
  } else {
    win.webContents.send('main:collection-already-opened', collectionPath);
  }
};

module.exports = {
  openCollection,
  openCollectionDialog
};
