const path = require('node:path');
const { getStatements, transaction } = require('../sqlite');
const { transientManager } = require('../transient');

const MAX_ROWS = 50;
const MAX_NAME_LENGTH = 256;

const getPathApi = () => (process.platform === 'win32' ? path.win32 : path.posix);

const toKey = (resolvedPath) => (process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath);

const toName = (value) => (typeof value === 'string' && value.trim() !== '' ? value.slice(0, MAX_NAME_LENGTH) : null);

const toEntry = (value) => {
  const pathApi = getPathApi();
  if (typeof value !== 'string' || !pathApi.isAbsolute(value)) {
    return null;
  }
  const resolvedPath = pathApi.resolve(value);
  const key = toKey(resolvedPath);
  const transientKey = toKey(pathApi.resolve(transientManager.getRootDirectory()));
  if (key === transientKey || key.startsWith(`${transientKey}${pathApi.sep}`)) {
    return null;
  }
  return { path: resolvedPath, key };
};

const update = (action, change) => {
  try {
    let hasChanged = false;
    transaction(() => {
      hasChanged = change(getStatements());
    });
    return hasChanged;
  } catch (error) {
    console.error(`[recent-collections] ${action} failed:`, error);
    return false;
  }
};

const list = () => getStatements().execute('list_recent_collections', { max_rows: MAX_ROWS });

const record = (collections, lastEvent) => update('record', (statements) => {
  const usedAt = Date.now();
  let hasChanged = false;
  [...collections].reverse().forEach((collection) => {
    const entry = toEntry(collection.path);
    if (!entry) {
      return;
    }
    statements.execute('record_recent_collection', {
      path_key: entry.key,
      path: entry.path,
      name: toName(collection.name),
      folder_name: getPathApi().basename(entry.path) || entry.path,
      used_at: usedAt,
      last_event: lastEvent
    });
    hasChanged = true;
  });
  statements.execute('trim_recent_collections', { max_rows: MAX_ROWS });
  return hasChanged;
});

const forget = (paths) => update('forget', (statements) => {
  let hasChanged = false;
  paths.forEach((value) => {
    const entry = toEntry(value);
    if (entry && statements.execute('forget_recent_collection', { path_key: entry.key }).changes > 0) {
      hasChanged = true;
    }
  });
  return hasChanged;
});

const move = (fromPath, toPath) => update('move', (statements) => {
  const from = toEntry(fromPath);
  const to = toEntry(toPath);
  if (!from || !to) {
    return false;
  }
  return statements.execute('move_recent_collection', { from_path_key: from.key, to_path_key: to.key, to_path: to.path }).changes > 0;
});

const rename = (collectionPath, name) => update('rename', (statements) => {
  const entry = toEntry(collectionPath);
  const nextName = toName(name);
  if (!entry || !nextName) {
    return false;
  }
  return statements.execute('rename_recent_collection', { path_key: entry.key, name: nextName }).changes > 0;
});

module.exports = {
  list,
  record,
  forget,
  move,
  rename
};
