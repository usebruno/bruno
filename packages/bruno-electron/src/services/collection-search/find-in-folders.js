const fs = require('node:fs/promises');
const { CollectionWalker, getRealPath, toPathKey, isSameOrInside } = require('./walk');
const { getSkippedMountPoints } = require('./mount-points');
const { findImportableFiles } = require('./importable-files');
const { readCollectionConfig } = require('./collection-name');

const MAX_FOLDERS = 50000;
const PARALLEL_FILE_READS = 16;

const FOLDER_ERROR_STATUSES = {
  ENOENT: 'not-found',
  ENOTDIR: 'not-found',
  EACCES: 'no-access',
  EPERM: 'no-access'
};

const inspectFolder = async (folderPath) => {
  try {
    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      return { status: 'not-a-folder' };
    }
    await fs.readdir(folderPath);
    return { status: 'readable', key: toPathKey(await getRealPath(folderPath)) };
  } catch (error) {
    return { status: FOLDER_ERROR_STATUSES[error.code] || 'unreadable' };
  }
};

const mapInBatches = async (items, mapItem, signal) => {
  const results = [];
  for (let start = 0; start < items.length; start += PARALLEL_FILE_READS) {
    signal?.throwIfAborted();
    results.push(...await Promise.all(items.slice(start, start + PARALLEL_FILE_READS).map(mapItem)));
  }
  return results;
};

const getFolderStatus = (ownCollection) => {
  if (!ownCollection) {
    return 'folder';
  }
  return ownCollection.isBroken ? 'broken-collection' : 'collection';
};

const summarizeFolder = async (folder, collections, isOnlyFolder) => {
  if (folder.status !== 'readable') {
    return { path: folder.path, status: folder.status, collectionPaths: [], importableFiles: [] };
  }
  const ownCollections = collections.filter((collection) => collection.key === folder.key);
  const found = ownCollections.length > 0
    ? ownCollections
    : collections.filter((collection) => isSameOrInside(folder.key, collection.key));
  return {
    path: folder.path,
    status: getFolderStatus(ownCollections[0]),
    collectionPaths: found.filter((collection) => !collection.isBroken).map((collection) => collection.path),
    importableFiles: isOnlyFolder && found.length === 0 ? await findImportableFiles(folder.path) : []
  };
};

const findCollectionsInFolders = async (folderPaths, { signal, maxFolders = MAX_FOLDERS, excludedFolders = [] } = {}) => {
  const excludedKeys = await Promise.all(
    excludedFolders.map(async (folderPath) => toPathKey(await getRealPath(folderPath).catch(() => folderPath)))
  );
  const walker = new CollectionWalker({ signal, maxFolders, excludedKeys, skippedMountPoints: await getSkippedMountPoints() });

  const folders = [];
  for (const folderPath of folderPaths) {
    signal?.throwIfAborted();
    const folder = await inspectFolder(folderPath);
    if (folder.status === 'readable') {
      await walker.walk(folderPath);
    }
    folders.push({ path: folderPath, ...folder });
  }

  const collections = await mapInBatches(
    walker.collections,
    async (collection) => ({ ...collection, ...(await readCollectionConfig(collection.path)) }),
    signal
  );

  return {
    folders: await mapInBatches(folders, (folder) => summarizeFolder(folder, collections, folders.length === 1), signal),
    collections: collections.filter((collection) => !collection.isBroken).map(({ path, name }) => ({ path, name })),
    brokenCollectionPaths: collections.filter((collection) => collection.isBroken).map((collection) => collection.path),
    unreadableFolderCount: walker.unreadableFolderCount,
    stoppedEarly: walker.stoppedEarly
  };
};

module.exports = {
  findCollectionsInFolders
};
