const fs = require('node:fs/promises');
const { realpath: realpathWithCallback } = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { isRealFolder } = require('./entry-kind');

const COLLECTION_CONFIG_FILES = ['opencollection.yml', 'bruno.json'];
const PARALLEL_FOLDER_READS = 8;

const PRUNED_FOLDER_NAMES = new Set([
  'node_modules', 'bower_components', 'venv', '__pycache__', 'dist', 'build', 'target', 'out',
  'Library', 'AppData', '$Recycle.Bin', 'System Volume Information', 'Applications', 'CMakeFiles'
]);
const LINUX_ROOT_SYSTEM_FOLDERS = new Set(['proc', 'sys', 'dev']);
const PRUNED_FOLDER_SUFFIXES = ['.app', '.framework', '.xcodeproj'];

const realpathInJs = promisify(realpathWithCallback);

const getRealPath = (folderPath) => fs.realpath(folderPath).catch(() => realpathInJs(folderPath));

const toPathKey = (realPath) => (process.platform === 'win32' ? realPath.toLowerCase() : realPath);

const isSameOrInside = (parentKey, childKey) => {
  const parentPrefix = parentKey.endsWith(path.sep) ? parentKey : `${parentKey}${path.sep}`;
  return childKey === parentKey || childKey.startsWith(parentPrefix);
};

const isPrunedFolderName = (name, parentRealPath) =>
  name.startsWith('.')
  || PRUNED_FOLDER_NAMES.has(name)
  || PRUNED_FOLDER_SUFFIXES.some((suffix) => name.endsWith(suffix))
  || (process.platform === 'linux' && parentRealPath === '/' && LINUX_ROOT_SYSTEM_FOLDERS.has(name));

const hasCollectionConfig = (entries) =>
  entries.some((entry) => COLLECTION_CONFIG_FILES.includes(entry.name) && (entry.isFile() || entry.isSymbolicLink()));

class CollectionWalker {
  constructor({ signal, maxFolders, excludedKeys = [], skippedMountPoints = new Set() }) {
    this.signal = signal;
    this.maxFolders = maxFolders;
    this.excludedKeys = excludedKeys;
    this.skippedMountKeys = new Set([...skippedMountPoints].map(toPathKey));
    this.visitedKeys = new Set();
    this.collections = [];
    this.folderCount = 0;
    this.unreadableFolderCount = 0;
    this.stoppedEarly = false;
  }

  async walk(rootPath) {
    this.signal?.throwIfAborted();
    let rootRealPath;
    try {
      rootRealPath = await getRealPath(rootPath);
    } catch (error) {
      this.unreadableFolderCount += 1;
      return;
    }

    let folders = await this.visit({ folderPath: rootPath, realPath: rootRealPath }, true);
    while (folders.length > 0 && !this.stoppedEarly) {
      const nextFolders = [];
      for (let start = 0; start < folders.length && !this.stoppedEarly; start += PARALLEL_FOLDER_READS) {
        this.signal?.throwIfAborted();
        const batch = folders.slice(start, start + PARALLEL_FOLDER_READS);
        const subfolderLists = await Promise.all(batch.map((folder) => this.visit(folder)));
        subfolderLists.forEach((subfolders) => {
          subfolders.forEach((subfolder) => nextFolders.push(subfolder));
        });
      }
      folders = nextFolders;
    }
  }

  async visit({ folderPath, realPath }, isRoot = false) {
    const key = toPathKey(realPath);
    if (this.visitedKeys.has(key) || this.excludedKeys.some((excludedKey) => isSameOrInside(excludedKey, key))) {
      return [];
    }
    if (!isRoot && this.folderCount >= this.maxFolders) {
      this.stoppedEarly = true;
      return [];
    }
    this.visitedKeys.add(key);
    this.folderCount += 1;

    let entries;
    try {
      entries = await fs.readdir(folderPath, { withFileTypes: true });
    } catch (error) {
      this.unreadableFolderCount += 1;
      return [];
    }

    if (hasCollectionConfig(entries)) {
      this.collections.push({ path: folderPath, key });
      return [];
    }

    const candidates = entries.filter((entry) =>
      !isPrunedFolderName(entry.name, realPath) && !this.skippedMountKeys.has(toPathKey(path.join(realPath, entry.name))));
    const isFolder = await Promise.all(candidates.map((entry) => isRealFolder(entry, path.join(folderPath, entry.name))));
    return candidates
      .filter((_entry, index) => isFolder[index])
      .map((entry) => ({ folderPath: path.join(folderPath, entry.name), realPath: path.join(realPath, entry.name) }));
  }
}

module.exports = {
  CollectionWalker,
  getRealPath,
  toPathKey,
  isSameOrInside
};
