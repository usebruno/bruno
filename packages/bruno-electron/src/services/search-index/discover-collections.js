const path = require('node:path');
const { posixifyPath } = require('../../utils/filesystem');
const { defaultClassify, resolveDenylist, isDenied } = require('../../utils/mount');

const DENY_DIR_NAMES = ['node_modules', '.git', '.svn', '.hg', '.bruno'];
const { collectionNameMatches, normalizedNeedle } = require('./search-term');

const CONTENT_GLOBS = [
  '-g', '*.bru',
  '-g', '*.yml',
  '-g', '*.yaml',
  '-g', 'bruno.json',
  '-g', 'collection.bru',
  '-g', 'collection.yml',
  '-g', 'opencollection.yml',
  '-g', 'folder.bru',
  '-g', 'folder.yml'
];

const DENY_GLOBS = DENY_DIR_NAMES.flatMap((dir) => ['-g', `!**/${dir}/**`]);

const normalizeRoots = (collections) => collections.map((c) => ({
  root: path.resolve(c.path),
  name: c.name ?? '',
  denylist: resolveDenylist(c.ignore)
})).sort((a, b) => b.root.length - a.root.length);

const ownerForAbsolutePath = (absolutePath, roots) => {
  const resolved = path.resolve(absolutePath);
  for (const entry of roots) {
    const rel = path.relative(entry.root, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
    return entry;
  }
  return null;
};

const relativePathAllowed = (owner, relativePath) => {
  const posix = posixifyPath(relativePath);
  if (isDenied(posix, owner.denylist)) return false;
  if (posix.split('/').some((segment) => DENY_DIR_NAMES.includes(segment))) return false;
  return Boolean(defaultClassify(relativePath));
};

const pathStringMatchesTerm = (relativePath, term) => {
  const needle = normalizedNeedle(term);
  if (!needle) return false;
  return posixifyPath(relativePath).toLowerCase().includes(needle);
};

const buildContentArgs = (rgPath, term, roots) => [
  rgPath,
  '-l',
  '-F',
  '-i',
  '--hidden',
  '--no-ignore',
  ...CONTENT_GLOBS,
  ...DENY_GLOBS,
  term,
  ...roots.map((r) => r.root)
];

const buildFilesArgs = (rgPath, roots) => [
  rgPath,
  '--files',
  '--hidden',
  '--no-ignore',
  ...CONTENT_GLOBS,
  ...DENY_GLOBS,
  ...roots.map((r) => r.root)
];

module.exports = {
  normalizeRoots,
  ownerForAbsolutePath,
  relativePathAllowed,
  pathStringMatchesTerm,
  collectionNameMatches,
  buildContentArgs,
  buildFilesArgs
};
