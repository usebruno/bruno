const fs = require('fs');
const path = require('path');
const { dialog, ipcMain } = require('electron');
const Yup = require('yup');
const { isDirectory, normalizeAndResolvePath } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');

// uid inside collections is deprecated, but we still need to validate it
// for backward compatibility
const uidSchema = Yup.string()
  .length(21, 'uid must be 21 characters in length')
  .matches(/^[a-zA-Z0-9]*$/, 'uid must be alphanumeric');

const configSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable().max(256, 'name must be 256 characters or less'),
  type: Yup.string().oneOf(['collection']).required('type is required'),
  version: Yup.string().oneOf(['1']).required('type is required')
})
  .noUnknown(true)
  .strict();

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
    properties: ['openDirectory', 'createDirectory']
  });

  if (filePaths && filePaths[0]) {
    const resolvedPath = normalizeAndResolvePath(filePaths[0]);
    if (isDirectory(resolvedPath)) {
      openCollection(win, watcher, resolvedPath);
    } else {
      console.error(`[ERROR] Cannot open unknown folder: "${resolvedPath}"`);
    }
  }
};

const openCollection = async (win, watcher, collectionPath, options = {}) => {
  if (!watcher.hasWatcher(collectionPath)) {
    try {
      const { name } = await getCollectionConfigFile(collectionPath);
      const uid = generateUidBasedOnHash(collectionPath);

      win.webContents.send('main:collection-opened', collectionPath, uid, name);
      ipcMain.emit('main:collection-opened', win, collectionPath, uid);
    } catch (err) {
      if (!options.dontSendDisplayErrors) {
        win.webContents.send('main:display-error', {
          error: err.message || 'An error occured while opening the local collection'
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
