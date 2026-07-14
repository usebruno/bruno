const path = require('path');
const fs = require('fs');
const { sortByNameThenSequence } = require('../utils/collection');

/**
 * Collect every folder path that appears in the sidebar tree:
 * dirs with folder.bru, and ancestors of request .bru files.
 */
const collectVisibleFolderPaths = (collectionPath, bruFiles) => {
  const folders = new Set();
  const envDirPath = path.join(collectionPath, 'environments');
  const normalizedCollection = path.normalize(collectionPath);

  const addAncestors = (dirPath) => {
    let current = path.normalize(dirPath);
    while (current.startsWith(normalizedCollection) && current !== normalizedCollection) {
      folders.add(current);
      current = path.dirname(current);
    }
  };

  for (const bruFilePath of bruFiles) {
    const basename = path.basename(bruFilePath);
    const dirname = path.dirname(bruFilePath);

    if (basename === 'collection.bru' && path.normalize(dirname) === normalizedCollection) {
      continue;
    }
    if (path.normalize(dirname) === path.normalize(envDirPath) || dirname.startsWith(envDirPath + path.sep)) {
      continue;
    }

    if (basename === 'folder.bru') {
      addAncestors(dirname);
      continue;
    }

    addAncestors(dirname);
  }

  return [...folders];
};

/**
 * Freeze pre-migrate sidebar order as contiguous seq 1..N per parent.
 * Mutates folderItems[*].seq and returns the same array.
 */
const stampFolderSeqFromDisplayOrder = (folderItems) => {
  const byParent = new Map();

  for (const item of folderItems) {
    const parentPath = path.dirname(item.folderPath);
    if (!byParent.has(parentPath)) {
      byParent.set(parentPath, []);
    }
    byParent.get(parentPath).push(item);
  }

  for (const siblings of byParent.values()) {
    const sorted = sortByNameThenSequence(siblings);

    sorted.forEach((item, index) => {
      item.seq = index + 1;
    });
  }

  return folderItems;
};

// Build stamped folder migrate items from the collection filesystem.
const buildStampedFolderMigrateItems = (collectionPath, bruFiles, readFolderMeta) => {
  const folderPaths = collectVisibleFolderPaths(collectionPath, bruFiles);

  const folderItems = folderPaths.map((folderPath) => {
    const meta = readFolderMeta(folderPath) || {};
    const bruFilePath = path.join(folderPath, 'folder.bru');
    return {
      folderPath,
      bruFilePath: fs.existsSync(bruFilePath) ? bruFilePath : null,
      name: meta.name || path.basename(folderPath),
      seq: meta.seq,
      folderData: meta.folderData || {
        meta: {
          name: meta.name || path.basename(folderPath)
        }
      }
    };
  });

  stampFolderSeqFromDisplayOrder(folderItems);

  for (const item of folderItems) {
    if (!item.folderData.meta) {
      item.folderData.meta = {};
    }
    item.folderData.meta.name = item.folderData.meta.name || item.name;
    item.folderData.meta.seq = item.seq;
  }

  return folderItems;
};

module.exports = {
  collectVisibleFolderPaths,
  stampFolderSeqFromDisplayOrder,
  buildStampedFolderMigrateItems
};
