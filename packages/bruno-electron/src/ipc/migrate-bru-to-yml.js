const path = require('path');
const fs = require('fs');
const { ipcMain } = require('electron');
const {
  parseRequest,
  stringifyRequest,
  parseCollection,
  stringifyCollection,
  parseFolder,
  stringifyFolder,
  stringifyEnvironment,
  parseEnvironment
} = require('@usebruno/filestore');
const {
  writeFile,
  getCollectionFormat,
  searchForFiles,
  getCollectionStats
} = require('../utils/filesystem');
const { sortByNameThenSequence } = require('../utils/collection');
const { moveRequestUid } = require('../cache/requestUids');
const snapshotManager = require('../services/snapshot');
const { remount: remountCollectionV2 } = require('./mount');

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

const registerMigrateBruToYmlIpc = (mainWindow, watcher) => {
  ipcMain.handle('renderer:migrate-collection-to-yml', async (event, collectionPathname, collectionUid) => {
    const format = getCollectionFormat(collectionPathname);
    if (format === 'yml') {
      throw new Error('Collection is already in YML format');
    }

    // Stop the watcher during migration to avoid triggering events
    if (watcher) {
      watcher.removeWatcher(collectionPathname, mainWindow, collectionUid);
    }

    // Track all written yml files so we can roll back on failure
    const writtenYmlFiles = [];

    const tabPathMap = {};

    try {
      const brunoJsonPath = path.join(collectionPathname, 'bruno.json');
      const brunoJsonContent = fs.readFileSync(brunoJsonPath, 'utf8');
      const brunoConfig = JSON.parse(brunoJsonContent);

      const collectionBruPath = path.join(collectionPathname, 'collection.bru');
      let collectionRoot = {};
      if (fs.existsSync(collectionBruPath)) {
        const collectionBruContent = fs.readFileSync(collectionBruPath, 'utf8');
        collectionRoot = parseCollection(collectionBruContent, { format: 'bru' });
      }

      const ymlBrunoConfig = { ...brunoConfig };
      delete ymlBrunoConfig.version; // drop the bru format marker
      ymlBrunoConfig.opencollection = '1.0.0';
      // Carry the user-facing version: bru's collectionVersion becomes yml's info.version.
      if (ymlBrunoConfig.collectionVersion) {
        ymlBrunoConfig.version = ymlBrunoConfig.collectionVersion;
      }
      delete ymlBrunoConfig.collectionVersion;

      const ocYmlPath = path.join(collectionPathname, 'opencollection.yml');
      const ymlCollectionContent = stringifyCollection(collectionRoot, ymlBrunoConfig, { format: 'yml' });
      await writeFile(ocYmlPath, ymlCollectionContent);
      writtenYmlFiles.push(ocYmlPath);

      const bruFiles = searchForFiles(collectionPathname, '.bru');
      const envDirPath = path.join(collectionPathname, 'environments');
      const bruFilesToDelete = [];

      // Freeze sidebar folder order as contiguous seq on every visible folder before writing yml
      const folderMigrateItems = buildStampedFolderMigrateItems(collectionPathname, bruFiles, (folderPath) => {
        const folderBruPath = path.join(folderPath, 'folder.bru');
        if (!fs.existsSync(folderBruPath)) {
          return null;
        }
        const folderData = parseFolder(fs.readFileSync(folderBruPath, 'utf8'), { format: 'bru' });
        return {
          name: folderData?.meta?.name,
          seq: folderData?.meta?.seq,
          folderData
        };
      });

      for (const item of folderMigrateItems) {
        const ymlContent = stringifyFolder(item.folderData, { format: 'yml' });
        const ymlFilePath = path.join(item.folderPath, 'folder.yml');
        await writeFile(ymlFilePath, ymlContent);
        writtenYmlFiles.push(ymlFilePath);
        if (item.bruFilePath) {
          bruFilesToDelete.push(item.bruFilePath);
        }
      }

      for (const bruFilePath of bruFiles) {
        const basename = path.basename(bruFilePath);
        const dirname = path.dirname(bruFilePath);

        if (basename === 'collection.bru' && path.normalize(dirname) === path.normalize(collectionPathname)) {
          bruFilesToDelete.push(bruFilePath);
          continue;
        }

        if (path.normalize(dirname) === path.normalize(envDirPath)) {
          continue;
        }

        if (basename === 'folder.bru') {
          continue;
        }

        const bruContent = fs.readFileSync(bruFilePath, 'utf8');
        const requestData = parseRequest(bruContent, { format: 'bru' });
        const ymlContent = stringifyRequest(requestData, { format: 'yml' });
        const ymlFilePath = bruFilePath.replace(/\.bru$/, '.yml');
        await writeFile(ymlFilePath, ymlContent);
        moveRequestUid(bruFilePath, ymlFilePath);
        tabPathMap[bruFilePath] = ymlFilePath;
        writtenYmlFiles.push(ymlFilePath);
        bruFilesToDelete.push(bruFilePath);
      }

      if (fs.existsSync(envDirPath)) {
        const envBruFiles = searchForFiles(envDirPath, '.bru');
        for (const envBruFilePath of envBruFiles) {
          const envBruContent = fs.readFileSync(envBruFilePath, 'utf8');
          const envData = parseEnvironment(envBruContent, { format: 'bru' });
          const ymlContent = stringifyEnvironment(envData, { format: 'yml' });
          const ymlFilePath = envBruFilePath.replace(/\.bru$/, '.yml');
          await writeFile(ymlFilePath, ymlContent);
          moveRequestUid(envBruFilePath, ymlFilePath);
          writtenYmlFiles.push(ymlFilePath);
          bruFilesToDelete.push(envBruFilePath);
        }
      }

      for (const bruFile of bruFilesToDelete) {
        fs.unlinkSync(bruFile);
      }
      fs.unlinkSync(brunoJsonPath);

      try {
        snapshotManager.remapCollectionTabPaths(collectionPathname, tabPathMap);
      } catch (_) {
      }

      const { size, filesCount } = await getCollectionStats(collectionPathname);
      ymlBrunoConfig.size = size;
      ymlBrunoConfig.filesCount = filesCount;

      try {
        const remounted = await remountCollectionV2({ collectionUid, brunoConfig: ymlBrunoConfig });
        if (!remounted && watcher) {
          watcher.addWatcher(mainWindow, collectionPathname, collectionUid, ymlBrunoConfig, false, undefined, { ignoreInitial: true });
        }
      } catch (watcherError) {
        console.error('Failed to re-attach watcher after migration:', watcherError);
        try {
          if (watcher) {
            watcher.addWatcher(mainWindow, collectionPathname, collectionUid, ymlBrunoConfig, false, undefined, { ignoreInitial: true });
          }
        } catch (fallbackError) {
          console.error('Fallback watcher attach failed after migration:', fallbackError);
          mainWindow.webContents.send('main:display-error', {
            message: `Collection migrated to yml, but live sync could not be re-enabled: ${fallbackError.message}. Please reopen the collection.`
          });
        }
      }

      return ymlBrunoConfig;
    } catch (error) {
      for (const ymlFile of writtenYmlFiles) {
        try {
          if (fs.existsSync(ymlFile)) {
            fs.unlinkSync(ymlFile);
          }
        } catch (_) {
        }
      }

      // Restart the watcher on the original bru collection
      try {
        const config = JSON.parse(fs.readFileSync(path.join(collectionPathname, 'bruno.json'), 'utf8'));
        const remounted = await remountCollectionV2({ collectionUid, brunoConfig: config });
        if (!remounted && watcher) {
          watcher.addWatcher(mainWindow, collectionPathname, collectionUid, config);
        }
      } catch (watcherError) {
        console.error('Failed to restart watcher after migration error:', watcherError);
      }
      throw error;
    }
  });
};

module.exports = registerMigrateBruToYmlIpc;
