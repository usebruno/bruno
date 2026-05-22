const fs = require('node:fs');
const path = require('node:path');
const { ipcMain } = require('electron');
const { sanitizeName, createDirectory, writeFile, safeWriteFileSync, getCollectionStats, getUniqueSiblingName } = require('./filesystem');
const { generateUidBasedOnHash, stringifyJson } = require('./common');
const { stringifyRequestViaWorker, stringifyCollection, stringifyEnvironment, stringifyFolder, DEFAULT_COLLECTION_FORMAT } = require('@usebruno/filestore');

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
 * @param {Object} options - Optional settings
 * @param {boolean} options.skipOpenEvent - If true, don't send main:collection-opened event (caller will handle it)
 */
async function importCollection(collection, collectionLocation, mainWindow, uniqueFolderName = null, format = DEFAULT_COLLECTION_FORMAT, options = {}) {
  // Use provided unique folder name or use collection name
  let folderName = uniqueFolderName ? sanitizeName(uniqueFolderName) : sanitizeName(collection.name);
  let collectionPath = path.join(collectionLocation, folderName);

  if (fs.existsSync(collectionPath)) {
    throw new Error(`collection: ${collectionPath} already exists`);
  }

  // Recursive function to parse the collection items and create files/folders.
  // A per-directory Set of already-claimed sibling names (lowercased) deduplicates
  // imports case-insensitively, so collections containing siblings like `OAuth2`
  // and `oAuth2` don't silently overwrite each other on case-insensitive
  // filesystems (macOS APFS/HFS+, Windows NTFS by default).
  const parseCollectionItems = async (items = [], currentPath) => {
    const usedNamesLowercase = new Set();

    for (const item of items) {
      if (['http-request', 'graphql-request', 'grpc-request'].includes(item.type)) {
        const sanitizedFilename = sanitizeName(item.filename || `${item.name}.${format}`);
        const ext = path.extname(sanitizedFilename);
        const base = ext ? sanitizedFilename.slice(0, -ext.length) : sanitizedFilename;
        const uniqueFilename = getUniqueSiblingName(base, ext, usedNamesLowercase);
        const content = await stringifyRequestViaWorker(item, { format });
        const filePath = path.join(currentPath, uniqueFilename);
        safeWriteFileSync(filePath, content);
      }
      if (item.type === 'folder') {
        const sanitizedFolderName = sanitizeName(item.filename || item.name);
        const uniqueFolderName = getUniqueSiblingName(sanitizedFolderName, '', usedNamesLowercase);
        const folderPath = path.join(currentPath, uniqueFolderName);
        fs.mkdirSync(folderPath, { recursive: true });

        if (item.root?.meta?.name) {
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
        const sanitizedFilename = sanitizeName(item.filename || `${item.name}.js`);
        const ext = path.extname(sanitizedFilename);
        const base = ext ? sanitizedFilename.slice(0, -ext.length) : sanitizedFilename;
        const uniqueFilename = getUniqueSiblingName(base, ext, usedNamesLowercase);
        const filePath = path.join(currentPath, uniqueFilename);
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
      const content = await stringifyEnvironment(env, { format });
      let sanitizedEnvFilename = sanitizeName(`${env.name}.${format}`);
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

  if (format === 'yml') {
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

  // Send collection-opened event unless caller wants to handle it themselves (e.g., during onboarding)
  if (!options.skipOpenEvent) {
    mainWindow.webContents.send('main:collection-opened', collectionPath, uid, brunoConfig);
    ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid, brunoConfig);
  }

  // create folder and files based on collection
  await parseCollectionItems(collection.items, collectionPath);
  await parseEnvironments(collection.environments, collectionPath);

  return { collectionPath, uid, brunoConfig };
}

module.exports = {
  importCollection,
  findUniqueFolderName
};
