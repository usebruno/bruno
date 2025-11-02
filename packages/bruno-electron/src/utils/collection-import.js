const fs = require('node:fs');
const path = require('node:path');
const { ipcMain } = require('electron');
const { sanitizeName, createDirectory, writeFile, safeWriteFileSync, getCollectionStats } = require('./filesystem');
const { generateUidBasedOnHash, stringifyJson } = require('./common');
const { stringifyRequestViaWorker, stringifyCollection, stringifyEnvironment, stringifyFolder } = require('@usebruno/filestore');

/**
 * Recursively find a unique folder name by appending incremental numbers
 */
async function findUniqueFolderName(baseName, collectionLocation, counter = 0) {
  const folderName = counter === 0 ? baseName : `${baseName} - ${counter}`;
  const collectionPath = path.join(collectionLocation, sanitizeName(folderName));
  
  if (fs.existsSync(collectionPath)) {
    return findUniqueFolderName(baseName, collectionLocation, counter + 1);
  }
  
  return folderName;
}

/**
 * Import a collection - shared logic used by both IPC handler and onboarding service
 */
async function importCollection(collection, collectionLocation, mainWindow, lastOpenedCollections, uniqueFolderName = null) {
  // Use provided unique folder name or use collection name
  let folderName = uniqueFolderName ? sanitizeName(uniqueFolderName) : sanitizeName(collection.name);
  let collectionPath = path.join(collectionLocation, folderName);

  if (fs.existsSync(collectionPath)) {
    throw new Error(`collection: ${collectionPath} already exists`);
  }

  // Recursive function to parse the collection items and create files/folders
  const parseCollectionItems = async (items = [], currentPath) => {
    for (const item of items) {
      if (['http-request', 'graphql-request', 'grpc-request'].includes(item.type)) {
        let sanitizedFilename = sanitizeName(item.filename || `${item.name}.bru`);
        const content = await stringifyRequestViaWorker(item);
        const filePath = path.join(currentPath, sanitizedFilename);
        safeWriteFileSync(filePath, content);
      }
      if (item.type === 'folder') {
        let sanitizedFolderName = sanitizeName(item.filename || item.name);
        const folderPath = path.join(currentPath, sanitizedFolderName);
        fs.mkdirSync(folderPath);

        if (item.root?.meta?.name) {
          const folderBruFilePath = path.join(folderPath, 'folder.bru');
          item.root.meta.seq = item.seq;
          const folderContent = await stringifyFolder(item.root);
          safeWriteFileSync(folderBruFilePath, folderContent);
        }

        if (item.items && item.items.length) {
          await parseCollectionItems(item.items, folderPath);
        }
      }
      // Handle items of type 'js'
      if (item.type === 'js') {
        let sanitizedFilename = sanitizeName(item.filename || `${item.name}.js`);
        const filePath = path.join(currentPath, sanitizedFilename);
        safeWriteFileSync(filePath, item.fileContent);
      }
    }
  };

  const parseEnvironments = async (environments = [], collectionPath) => {
    const envDirPath = path.join(collectionPath, 'environments');
    if (!fs.existsSync(envDirPath)) {
      fs.mkdirSync(envDirPath);
    }

    for (const env of environments) {
      const content = await stringifyEnvironment(env);
      let sanitizedEnvFilename = sanitizeName(`${env.name}.bru`);
      const filePath = path.join(envDirPath, sanitizedEnvFilename);
      safeWriteFileSync(filePath, content);
    }
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

  const collectionContent = await stringifyCollection(collection.root);
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

  return { collectionPath, uid, brunoConfig };
}

module.exports = {
  importCollection,
  findUniqueFolderName
};
