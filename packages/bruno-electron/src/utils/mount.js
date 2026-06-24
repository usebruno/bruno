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

const walk = (root, denylist) => {
  const out = [];
  const visit = (absDir, relDir) => {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const childAbs = path.join(absDir, entry.name);
      const childRel = relDir ? path.join(relDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (DENY_DIRS.has(entry.name)) continue;
        visit(childAbs, childRel);
      } else if (entry.isFile()) {
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
  hashFile,
  hashFileAsync,
  normalize,
  posixifyPath,
  idForAbsolutePath,
  uidForSeed,
  resolveDenylist,
  isDenied,
  walk,
  defaultClassify
};
