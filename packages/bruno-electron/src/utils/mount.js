const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { posixifyPath } = require('./filesystem');

const DENY_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.bruno']);
const DEFAULT_DENYLIST = ['**/.DS_Store', '**/Thumbs.db'];

const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const hashFile = (absPath) => sha256(fs.readFileSync(absPath));
const hashFileAsync = async (absPath) => sha256(await fs.promises.readFile(absPath));
const normalize = (p) => path.resolve(p);
const idForAbsolutePath = (absolutePath) => sha256(posixifyPath(absolutePath)).slice(0, 21);
const uidForSeed = (seed) => sha256(seed).slice(0, 21);

const resolveDenylist = (patterns) => [...DEFAULT_DENYLIST, ...(patterns || [])];

const isDenied = (relativePathPosix, patterns) => {
  for (const pattern of patterns) {
    if (path.matchesGlob(relativePathPosix, pattern)) return true;
  }
  return false;
};

/**
 * Every file under `root`, minus denied paths, following symlinks once.
 *
 * Asynchronous because this runs on the main process ahead of the parse: a synchronous walk blocks
 * it for the whole traversal, and mounting a workspace runs one per collection back to back, so the
 * app is unresponsive before any of the pooled parsing starts.
 *
 * Sibling directories are traversed together rather than one after another — awaiting each in turn
 * would trade blocking for wall-clock. Concurrency is bounded by the directory count, which is small
 * next to the file count. The cycle guard stays correct under that: the check and the `add` sit in
 * the same synchronous step after `realpath` resolves, so no other branch can interleave between
 * them.
 */
const walk = async (root, denylist) => {
  const out = [];
  const visited = new Set();

  const visit = async (absDir, relDir) => {
    let canonicalDir;
    try {
      canonicalDir = await fs.promises.realpath(absDir);
    } catch (err) {
      return;
    }
    if (visited.has(canonicalDir)) return;
    visited.add(canonicalDir);

    let entries;
    try {
      entries = await fs.promises.readdir(absDir, { withFileTypes: true });
    } catch (err) {
      return;
    }

    const subdirectories = [];
    for (const entry of entries) {
      const childAbs = path.join(absDir, entry.name);
      const childRel = relDir ? path.join(relDir, entry.name) : entry.name;

      let isDir = entry.isDirectory();
      let isFile = entry.isFile();

      if (entry.isSymbolicLink()) {
        try {
          const stat = await fs.promises.stat(childAbs);
          isDir = stat.isDirectory();
          isFile = stat.isFile();
        } catch (err) {
          continue;
        }
      }

      if (isDir) {
        if (DENY_DIRS.has(entry.name)) continue;
        subdirectories.push([childAbs, childRel]);
      } else if (isFile) {
        if (isDenied(posixifyPath(childRel), denylist)) continue;
        out.push({ relativePath: childRel, absolutePath: childAbs });
      }
    }

    await Promise.all(subdirectories.map(([childAbs, childRel]) => visit(childAbs, childRel)));
  };

  await visit(root, '');
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

const diffFiles = async (root, stored, denylist) => {
  const added = [];
  const updated = [];
  const removed = [];
  const seen = new Set();

  const files = await walk(root, denylist);
  const results = await Promise.all(files.map(async ({ relativePath, absolutePath }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const mtime = stat.mtimeNs;
    const prior = stored.get(relativePath);

    if (!prior) {
      const hash = await hashFileAsync(absolutePath);
      return { kind: 'added', entry: { relativePath, absolutePath, mtime, hash } };
    }
    if (prior.mtime === mtime) return { kind: 'unchanged', relativePath };
    const hash = await hashFileAsync(absolutePath);
    if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    return { kind: 'updated', entry: { relativePath, absolutePath, mtime, hash, prevHash: prior.hash } };
  }));

  for (const r of results) {
    if (r.kind === 'added') {
      added.push(r.entry);
      seen.add(r.entry.relativePath);
    } else if (r.kind === 'updated') {
      updated.push(r.entry);
      seen.add(r.entry.relativePath);
    } else {
      seen.add(r.relativePath);
    }
  }

  for (const [relativePath, row] of stored) {
    if (seen.has(relativePath)) continue;
    if (isDenied(posixifyPath(relativePath), denylist)) continue;
    removed.push({ relativePath, id: row.id, hash: row.hash });
  }

  return { added, updated, removed };
};

module.exports = {
  DENY_DIRS,
  COLLECTION_ROOT_BASENAMES,
  FOLDER_ROOT_BASENAMES,
  BRUNO_CONFIG_BASENAME,
  ENVIRONMENTS_DIR,
  hashFile,
  hashFileAsync,
  normalize,
  posixifyPath,
  idForAbsolutePath,
  uidForSeed,
  resolveDenylist,
  isDenied,
  walk,
  diffFiles,
  defaultClassify
};
