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
const ALWAYS_SKIPPED_FOLDER_NAMES = new Set(['.git', 'node_modules']);
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

const isCollectionFolder = async (folderPath) => {
  const configFiles = await Promise.all(COLLECTION_CONFIG_FILES.map((file) =>
    fs.stat(path.join(folderPath, file)).then((stats) => stats.isFile(), () => false)));
  return configFiles.includes(true);
};

class CollectionWalker {
  constructor({ signal, maxFolders, excludedKeys = [], skippedMountPoints = new Set(), pruneByName = true }) {
    this.signal = signal;
    this.maxFolders = maxFolders;
    this.excludedKeys = excludedKeys;
    this.skippedMountKeys = new Set([...skippedMountPoints].map(toPathKey));
    this.pruneByName = pruneByName;
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
    if (this.visitedKeys.has(key) || this.isExcluded(key)) {
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
      try {
        this.collections.push({ path: await this.getOpenablePath(folderPath, realPath), key });
      } catch (error) {
        this.unreadableFolderCount += 1;
      }
      return [];
    }

    const children = entries
      .map((entry) => ({ entry, folderPath: path.join(folderPath, entry.name), realPath: path.join(realPath, entry.name) }))
      .filter((child) => !this.skippedMountKeys.has(toPathKey(child.realPath)));
    const isFolder = await Promise.all(children.map((child) => isRealFolder(child.entry, child.folderPath)));
    const subfolders = [];
    const skippedFolders = [];
    children.forEach((child, index) => {
      if (isFolder[index] && !this.isSkippedFolderName(child.entry.name, realPath)) {
        subfolders.push({ folderPath: child.folderPath, realPath: child.realPath });
      } else if (isFolder[index] || child.entry.isSymbolicLink()) {
        skippedFolders.push(child);
      }
    });
    await Promise.all(skippedFolders.map((child) => this.addIfCollection(child)));
    return subfolders;
  }

  async addIfCollection({ entry, folderPath, realPath }) {
    const isLink = entry.isSymbolicLink();
    const collectionRealPath = isLink ? await getRealPath(folderPath).catch(() => null) : realPath;
    if (!collectionRealPath) {
      return;
    }
    const key = toPathKey(collectionRealPath);
    if (this.isExcluded(key) || (isLink && this.isOnSkippedMount(key)) || !(await isCollectionFolder(folderPath)) || this.visitedKeys.has(key)) {
      return;
    }
    this.visitedKeys.add(key);
    this.collections.push(isLink
      ? { path: collectionRealPath, key, linkKey: toPathKey(realPath) }
      : { path: folderPath, key });
  }

  isSkippedFolderName(name, parentRealPath) {
    return this.pruneByName ? isPrunedFolderName(name, parentRealPath) : ALWAYS_SKIPPED_FOLDER_NAMES.has(name);
  }

  isExcluded(key) {
    return this.excludedKeys.some((excludedKey) => isSameOrInside(excludedKey, key));
  }

  isOnSkippedMount(key) {
    return [...this.skippedMountKeys].some((mountKey) => isSameOrInside(mountKey, key));
  }

  async getOpenablePath(folderPath, realPath) {
    const stats = await fs.lstat(folderPath);
    return stats.isSymbolicLink() ? realPath : folderPath;
  }
}

module.exports = {
  CollectionWalker,
  getRealPath,
  toPathKey,
  isSameOrInside
};
