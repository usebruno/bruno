const fs = require('node:fs/promises');
const path = require('node:path');
const { getRealPath, toPathKey, isSameOrInside, isPrunedFolderName, hasCollectionConfig } = require('../collection-search/walk');
const { isRealFolder } = require('../collection-search/entry-kind');
const { getSkippedMountPoints } = require('../collection-search/mount-points');
const { readCollectionName } = require('../collection-search/collection-name');

const MAX_DEPTH = 12;
const CONCURRENCY = 16;
const RECENTS_CONCURRENCY = 4;
const RECENTS_LOCATION_ID = 'recents';

const isUncPath = (folderPath) => process.platform === 'win32' && folderPath.startsWith('\\\\');

const toRootStatus = (error) => (error.code === 'EACCES' || error.code === 'EPERM' ? 'denied' : 'missing');

const readMtime = (folderPath) => fs.stat(folderPath).then((stats) => Math.floor(stats.mtimeMs), () => 0);

const scanLocations = async ({ locations, recents, excludedPaths, onCollection }) => {
  const skippedMountPoints = await getSkippedMountPoints();
  const excludedKeys = await Promise.all(
    excludedPaths.map(async (excludedPath) => toPathKey(await getRealPath(excludedPath).catch(() => excludedPath)))
  );
  const rootKeys = new Set(locations.map((location) => toPathKey(path.resolve(location.path))));
  const walkedRootKeys = new Set();
  const statuses = new Map();
  const emitted = new Map();
  const jobs = [];

  const isExcluded = (key) => excludedKeys.some((excludedKey) => isSameOrInside(excludedKey, key));

  const isSkippedFolder = (name, parentRealPath) => {
    const childRealPath = path.join(parentRealPath, name);
    const childKey = toPathKey(childRealPath);
    return isPrunedFolderName(name, parentRealPath)
      || skippedMountPoints.has(childRealPath)
      || rootKeys.has(childKey)
      || isExcluded(childKey);
  };

  const startRoot = async ({ id, path: rootPath }) => {
    if (isUncPath(rootPath)) {
      statuses.set(id, 'missing');
      return;
    }
    let realPath;
    try {
      realPath = await getRealPath(rootPath);
    } catch (error) {
      statuses.set(id, toRootStatus(error));
      return;
    }
    const realKey = toPathKey(realPath);
    rootKeys.add(realKey);
    if (walkedRootKeys.has(realKey) || isExcluded(realKey)) {
      return;
    }
    walkedRootKeys.add(realKey);
    jobs.push({ folderPath: rootPath, realPath, depth: 0, locationId: id });
  };

  const emitWalkedCollection = async ({ folderPath, realPath, depth, locationId }) => {
    const key = toPathKey(realPath);
    const earlierRow = emitted.get(key);
    if (earlierRow && earlierRow.locationId !== RECENTS_LOCATION_ID) {
      return;
    }
    const row = { path: earlierRow ? earlierRow.path : folderPath, locationId };
    emitted.set(key, row);
    if (!earlierRow && depth === 0 && (await fs.lstat(folderPath).catch(() => null))?.isSymbolicLink()) {
      row.path = realPath;
    }
    const [name, mtime] = await Promise.all([readCollectionName(folderPath), readMtime(folderPath)]);
    onCollection({ path: row.path, name, mtime, locationId });
  };

  const visitFolder = async (job) => {
    const { folderPath, realPath, depth, locationId } = job;
    let entries;
    try {
      entries = await fs.readdir(folderPath, { withFileTypes: true });
    } catch (error) {
      if (depth === 0) {
        statuses.set(locationId, toRootStatus(error));
      }
      return;
    }
    if (hasCollectionConfig(entries)) {
      await emitWalkedCollection(job);
      return;
    }
    if (depth >= MAX_DEPTH) {
      return;
    }
    const candidates = entries.filter((entry) => !isSkippedFolder(entry.name, realPath));
    const isFolder = await Promise.all(candidates.map((entry) => isRealFolder(entry, path.join(folderPath, entry.name))));
    candidates.forEach((entry, index) => {
      if (isFolder[index]) {
        jobs.push({ folderPath: path.join(folderPath, entry.name), realPath: path.join(realPath, entry.name), depth: depth + 1, locationId });
      }
    });
  };

  const walk = () => new Promise((resolve, reject) => {
    let activeVisits = 0;
    let unresolvedRoots = locations.length;

    const pump = () => {
      while (activeVisits < CONCURRENCY && jobs.length > 0) {
        activeVisits += 1;
        visitFolder(jobs.pop()).then(() => {
          activeVisits -= 1;
          pump();
        }, reject);
      }
      if (unresolvedRoots === 0 && activeVisits === 0 && jobs.length === 0) {
        resolve();
      }
    };

    locations.forEach((location) => {
      startRoot(location).then(() => {
        unresolvedRoots -= 1;
        pump();
      }, reject);
    });
    pump();
  });

  const checkRecent = async ({ path: recentPath, name }) => {
    let entries;
    try {
      entries = await fs.readdir(recentPath, { withFileTypes: true });
    } catch (error) {
      return;
    }
    if (!hasCollectionConfig(entries)) {
      return;
    }
    const [realPath, mtime] = await Promise.all([getRealPath(recentPath).catch(() => null), readMtime(recentPath)]);
    if (!realPath) {
      return;
    }
    const key = toPathKey(realPath);
    if (emitted.has(key)) {
      return;
    }
    emitted.set(key, { path: recentPath, locationId: RECENTS_LOCATION_ID });
    onCollection({ path: recentPath, name, mtime, locationId: RECENTS_LOCATION_ID });
  };

  const checkRecents = async () => {
    const queue = [...recents];
    const checkQueued = async () => {
      while (queue.length > 0) {
        await checkRecent(queue.shift());
      }
    };
    await Promise.all(Array.from({ length: RECENTS_CONCURRENCY }, () => checkQueued()));
  };

  await Promise.all([walk(), checkRecents()]);

  const found = new Map();
  emitted.forEach(({ locationId }) => found.set(locationId, (found.get(locationId) || 0) + 1));
  return locations.map(({ id }) => ({ id, status: statuses.get(id) || 'done', found: found.get(id) || 0 }));
};

module.exports = {
  scanLocations
};
