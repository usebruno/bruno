/**
 * This file exists because the current implementation of the `brunoToOpenapi` (former exportOpenApi) is moved from `@usebruno/app`
 * to `@usebruno/converters` and the scope of the ticket `BRU-3523` is to have the same implementation of
 * `brunoToOpenApi` currently present in the app.
 *
 * This file is part of copying the implementation of
 * [readCollectionForApiSpec](https://github.com/usebruno/bruno/blob/main/packages/bruno-electron/src/utils/collection-reader.js#L31),
 * which is the original function present in `@usebruno/electron` being used by `@usebruno/app`.
 *
 * @author @vasharma05-bruno
 */

const fs = require('node:fs');
const path = require('node:path');

// Copied from bruno-electron/src/utils/mount.js so `bru export openapi` reads the same files as the app's
// Create API Spec. Keep the two in step: a change to one is a change to both.

const posixifyPath = (p) => (p ? p.replace(/\\/g, '/') : p);

const DENY_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.bruno']);
const DEFAULT_DENYLIST = ['**/.DS_Store', '**/Thumbs.db'];

const resolveDenylist = (patterns) => [...DEFAULT_DENYLIST, ...(patterns || [])];

const GLOB_METACHAR = /[*?[\]{}]/;

// Plain folder names are prefixes, same as the watcher. Globs stay path.matchesGlob
// on the path itself: stripping a trailing slash turns `**/` into `**`.
const matchesPlainPrefix = (relativePathPosix, patterns) => {
  for (const pattern of patterns) {
    const raw = posixifyPath(pattern);
    if (!raw || GLOB_METACHAR.test(raw)) continue;
    const folder = raw.replace(/\/+$/, '');
    if (!folder) continue;
    if (relativePathPosix === folder || relativePathPosix.startsWith(`${folder}/`)) return true;
  }
  return false;
};

const isDenied = (relativePathPosix, patterns) => {
  if (matchesPlainPrefix(relativePathPosix, patterns)) return true;
  for (const pattern of patterns) {
    const raw = posixifyPath(pattern);
    if (!raw || !GLOB_METACHAR.test(raw)) continue;
    if (path.matchesGlob(relativePathPosix, raw)) return true;
  }
  return false;
};

const walk = (root, denylist) => {
  const out = [];
  const visited = new Set();
  const visit = (absDir, relDir) => {
    let canonicalDir;
    try {
      canonicalDir = fs.realpathSync(absDir);
    } catch (err) {
      return;
    }
    if (visited.has(canonicalDir)) return;
    visited.add(canonicalDir);

    // readdirSync order depends on the file system (NTFS ignores case, ext4 uses hash order), so sort by
    // name to read a collection in the same order on every OS
    const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
      const childAbs = path.join(absDir, entry.name);
      const childRel = relDir ? path.join(relDir, entry.name) : entry.name;

      let isDir = entry.isDirectory();
      let isFile = entry.isFile();

      if (entry.isSymbolicLink()) {
        try {
          const stat = fs.statSync(childAbs);
          isDir = stat.isDirectory();
          isFile = stat.isFile();
        } catch (err) {
          continue;
        }
      }

      if (isDir) {
        if (DENY_DIRS.has(entry.name)) continue;
        if (matchesPlainPrefix(posixifyPath(childRel), denylist)) continue;
        visit(childAbs, childRel);
      } else if (isFile) {
        if (isDenied(posixifyPath(childRel), denylist)) continue;
        out.push({ relativePath: childRel, absolutePath: childAbs });
      }
    }
  };
  visit(root, '');
  return out;
};

const COLLECTION_ROOT_BASENAMES = new Set(['collection.bru', 'collection.yml', 'opencollection.yml']);
const FOLDER_ROOT_BASENAMES = new Set(['folder.bru', 'folder.yml']);
const BRUNO_CONFIG_BASENAME = 'bruno.json';
const ENVIRONMENTS_DIR = 'environments';

const defaultClassify = (relativePath) => {
  const basename = path.basename(relativePath);
  const dirname = path.dirname(relativePath);
  const segments = dirname === '.' || dirname === '' ? [] : dirname.split(path.sep).filter(Boolean);

  if (basename === BRUNO_CONFIG_BASENAME && segments.length === 0) {
    return { format: 'json', type: 'config' };
  }

  const ext = path.extname(basename).slice(1).toLowerCase();
  let format;
  if (ext === 'bru') format = 'bru';
  else if (ext === 'yml' || ext === 'yaml') format = 'yml';
  else return null;

  if (COLLECTION_ROOT_BASENAMES.has(basename) && segments.length === 0) {
    return { format, type: 'collection' };
  }
  if (FOLDER_ROOT_BASENAMES.has(basename)) {
    return { format, type: 'folder' };
  }
  if (segments[0] === ENVIRONMENTS_DIR && segments.length === 1) {
    return { format, type: 'environment' };
  }
  return { format, type: 'request' };
};

module.exports = {
  COLLECTION_ROOT_BASENAMES,
  FOLDER_ROOT_BASENAMES,
  BRUNO_CONFIG_BASENAME,
  ENVIRONMENTS_DIR,
  posixifyPath,
  resolveDenylist,
  isDenied,
  walk,
  defaultClassify
};
