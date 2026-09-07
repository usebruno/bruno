const path = require('path');
const fs = require('fs-extra');
const fsPromises = require('fs/promises');
const { dialog } = require('electron');
const isValidPathname = require('is-valid-path');
const os = require('os');
// Single shared implementation lives in @usebruno/common; re-exported below so
// `require('../utils/filesystem')` consumers keep working unchanged.
const { sanitizeName, validateName } = require('@usebruno/common').utils;

const DEFAULT_GITIGNORE = [
  '# Secrets',
  '.env*',
  '',
  '# Dependencies',
  'node_modules',
  '',
  '# OS files',
  '.DS_Store',
  'Thumbs.db'
].join('\n');

const exists = async (p) => {
  try {
    await fsPromises.access(p);
    return true;
  } catch (_) {
    return false;
  }
};

const isSymbolicLink = (filepath) => {
  try {
    return fs.existsSync(filepath) && fs.lstatSync(filepath).isSymbolicLink();
  } catch (_) {
    return false;
  }
};

const isFile = (filepath) => {
  try {
    return fs.existsSync(filepath) && fs.lstatSync(filepath).isFile();
  } catch (_) {
    return false;
  }
};

const isDirectory = (dirPath) => {
  try {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
  } catch (_) {
    return false;
  }
};

const isValidCollectionDirectory = (dirPath) => {
  if (!isDirectory(dirPath)) {
    return false;
  }
  const brunoJsonPath = path.join(dirPath, 'bruno.json');
  const opencollectionYmlPath = path.join(dirPath, 'opencollection.yml');
  return fs.existsSync(brunoJsonPath) || fs.existsSync(opencollectionYmlPath);
};

const hasSubDirectories = (dir) => {
  const files = fs.readdirSync(dir);
  return files.some((file) => fs.statSync(path.join(dir, file)).isDirectory());
};

const normalizeAndResolvePath = (pathname) => {
  if (isWSLPath(pathname)) {
    return normalizeWSLPath(pathname);
  }

  if (isSymbolicLink(pathname)) {
    const absPath = path.dirname(pathname);
    const targetPath = path.resolve(absPath, fs.readlinkSync(pathname));
    if (isFile(targetPath) || isDirectory(targetPath)) {
      return path.resolve(targetPath);
    }
    console.error(`Cannot resolve link target "${pathname}" (${targetPath}).`);
    return '';
  }
  return path.resolve(pathname);
};

function isWSLPath(pathname) {
  // Check if the path starts with the WSL prefix
  // eg. "\\wsl.localhost\Ubuntu\home\user\bruno\collection\scripting\api\req\getHeaders.bru"
  return pathname.startsWith('\\\\') || pathname.startsWith('//') || pathname.startsWith('/wsl.localhost/') || pathname.startsWith('\\wsl.localhost');
}

function normalizeWSLPath(pathname) {
  // Replace the WSL path prefix and convert forward slashes to backslashes
  // This is done to achieve WSL paths (linux style) to Windows UNC equivalent (Universal Naming Conversion)
  return pathname.replace(/^\/wsl.localhost/, '\\\\wsl.localhost').replace(/\//g, '\\');
}

const writeFile = async (pathname, content, isBinary = false) => {
  try {
    await safeWriteFile(pathname, content, {
      encoding: !isBinary ? 'utf-8' : null
    });
  } catch (err) {
    console.error(`Error writing file at ${pathname}:`, err);
    return Promise.reject(err);
  }
};

// Per-path async mutex for file writes. Callers that perform read-modify-write
// against the same file from multiple async chains (e.g. two scripted variable
// writes racing on the same environment file) wrap the whole critical section in
// withFileLock(absPath, ...) so the second writer reads the post-first-write state.
// Without this, `fs.readFileSync` outside the lock can capture pre-A state while
// A is still flushing, and B then overwrites A. Lock entries are cleaned up once
// the queue for a path drains.
const _pathLocks = new Map();
const withFileLock = async (pathname, fn) => {
  // Canonicalize so callers passing `/foo/./bar.env` and `/foo/bar.env` (or
  // trailing slashes / `..` segments) share a single lock. Does NOT normalize
  // symlinks or filesystem case-insensitivity — callers passing semantically
  // equivalent but different strings beyond that get separate locks.
  const key = path.resolve(pathname);
  const prior = _pathLocks.get(key) || Promise.resolve();
  // Errors from a prior writer must not block subsequent writers; the next caller
  // gets its own try/catch.
  const next = prior.catch(() => {}).then(() => fn());
  _pathLocks.set(key, next);
  try {
    return await next;
  } finally {
    if (_pathLocks.get(key) === next) {
      _pathLocks.delete(key);
    }
  }
};

const MAX_DUPLICATE_NAMES = 200;

const MAX_FILENAME_LENGTH = 255;

/**
 * Build the nth suffixed filename. n === 0 -> no suffix.
 * @param {string} base   basename without extension
 * @param {string} ext    extension without a leading dot ('' for directories)
 * @param {number} n      0 for the unsuffixed name, otherwise the suffix number
 */
const nextSuffixedName = (base, ext, n) => {
  const suffix = n === 0 ? '' : ` ${n}`;
  return ext ? `${base}${suffix}.${ext}` : `${base}${suffix}`;
};

/**
 * Truncate `base` so that `base` + the largest possible collision suffix + the
 * extension can never exceed the filesystem filename limit (255). This keeps
 * both the no-collision name and every suffixed candidate within bounds, so a
 * max-length name can't trigger ENAMETOOLONG.
 *
 * @param {string} base   basename without extension
 * @param {string} ext    extension without a leading dot ('' for directories)
 */
const truncateBaseForSuffix = (base, ext) => {
  const extLength = ext ? ext.length + 1 : 0;
  // Longest suffix the duplicate cap can append, incl. the leading space
  // separator (e.g. " 199" -> 4 chars).
  const SUFFIX_RESERVE = String(MAX_DUPLICATE_NAMES - 1).length + 1;
  const maxBaseLength = Math.max(1, MAX_FILENAME_LENGTH - extLength - SUFFIX_RESERVE);
  return base.length > maxBaseLength ? base.slice(0, maxBaseLength) : base;
};

/**
 * Creates a file with a unique name inside `dirname`.
 * If the name already exists, appends a numeric suffix.
 *
 * @returns {Promise<{ pathname: string, filename: string }>} the path created
 */
const writeFileUnique = async (dirname, baseFilename, ext, content) => {
  const normalizedExt = ext && ext.startsWith('.') ? ext.slice(1) : ext;

  // Keep the base name within the filename length limit.
  const safeBase = truncateBaseForSuffix(baseFilename, normalizedExt);

  for (let counter = 0; counter < MAX_DUPLICATE_NAMES; counter++) {
    const candidate = nextSuffixedName(safeBase, normalizedExt, counter);
    const pathname = path.join(dirname, candidate);

    try {
      // `wx` fails with EEXIST if another file already has this name.
      await fsPromises.writeFile(pathname, content, { flag: 'wx' });
      return { pathname, filename: path.basename(pathname) };
    } catch (err) {
      if (err && err.code === 'EEXIST') continue;

      console.error(`Error writing file at ${pathname}:`, err);
      throw err;
    }
  }

  throw new Error(
    `Too many items named "${baseFilename}" (limit ${MAX_DUPLICATE_NAMES}). Please use a different name.`
  );
};

/**
 * Creates a unique directory inside `dirname`.
 * If `baseName` already exists, tries `baseName 1`, `baseName 2`, etc.
 * Stops after MAX_DUPLICATE_NAMES attempts.
 *
 * @returns {Promise<{ pathname: string, name: string }>} The created directory.
 */
const mkdirUnique = async (dirname, baseName) => {
  // Keep the base name within the filename length limit when adding a suffix.
  const safeBase = truncateBaseForSuffix(baseName, '');

  // Let mkdir determine whether the name is already taken.
  // EEXIST means, try the next suffix.
  for (let counter = 0; counter < MAX_DUPLICATE_NAMES; counter++) {
    const name = nextSuffixedName(safeBase, '', counter);
    const pathname = path.join(dirname, name);

    try {
      await fsPromises.mkdir(pathname);
      return { pathname, name };
    } catch (err) {
      if (err && err.code === 'EEXIST') continue;

      console.error(`Error creating directory at ${pathname}:`, err);
      throw err;
    }
  }

  throw new Error(
    `Too many items named "${baseName}" (limit ${MAX_DUPLICATE_NAMES}). Please use a different name.`
  );
};

const hasJsonExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  return ['json'].some((ext) => filename.toLowerCase().endsWith(`.${ext}`));
};

const hasBruExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  return ['bru'].some((ext) => filename.toLowerCase().endsWith(`.${ext}`));
};

const hasRequestExtension = (filename, format = null) => {
  if (!filename || typeof filename !== 'string') return false;

  if (format) {
    const ext = format === 'yml' ? 'yml' : 'bru';
    return filename.toLowerCase().endsWith(`.${ext}`);
  }

  return ['bru', 'yml'].some((ext) => filename.toLowerCase().endsWith(`.${ext}`));
};

const createDirectory = async (dir) => {
  if (!dir) {
    throw new Error(`directory: path is null`);
  }

  if (fs.existsSync(dir)) {
    throw new Error(`directory: ${dir} already exists`);
  }

  return fs.mkdirSync(dir);
};

const browseDirectory = async (win) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!filePaths || !filePaths[0]) {
    return false;
  }

  const resolvedPath = path.resolve(filePaths[0]);
  return isDirectory(resolvedPath) ? resolvedPath : false;
};

const browseDirectories = async (win) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory', 'multiSelections']
  });

  if (!filePaths || !filePaths.length) {
    return [];
  }

  const resolvedPaths = filePaths.map((filePath) => path.resolve(filePath)).filter((resolvedPath) => isDirectory(resolvedPath));
  return [...new Set(resolvedPaths)];
};

const browseFiles = async (win, filters = [], properties = []) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', ...properties],
    filters
  });

  if (!filePaths) {
    return [];
  }

  return filePaths.map((filePath) => path.resolve(filePath)).filter((filePath) => isFile(filePath));
};

const chooseFileToSave = async (win, preferredFileName = '') => {
  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: preferredFileName
  });

  return filePath;
};

const searchForFiles = (dir, extension) => {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(searchForFiles(filePath, extension));
    } else if (path.extname(file) === extension) {
      results.push(filePath);
    }
  }
  return results;
};

// Search for request files based on collection filetype by reading config
const searchForRequestFiles = (dir, collectionPath = null) => {
  const format = getCollectionFormat(collectionPath || dir);
  if (format === 'yml') {
    return searchForFiles(dir, '.yml');
  } else if (format === 'bru') {
    return searchForFiles(dir, '.bru');
  } else {
    throw new Error(`Invalid format: ${format}`);
  }
};

const isWindowsOS = () => {
  return os.platform() === 'win32';
};

/**
 * Generate a unique name by adding a "copy" suffix if needed
 *
 * @param {string} baseName - The base name
 * @param {Function} checkExists - Function that takes a name and returns true if it exists
 * @returns {string} - A unique name
 */
const generateUniqueName = (baseName, checkExists) => {
  if (!checkExists(baseName)) {
    return baseName;
  }

  let counter = 1;
  let uniqueName = `${baseName} copy`;

  while (checkExists(uniqueName)) {
    counter++;
    uniqueName = `${baseName} copy ${counter}`;
  }
  return uniqueName;
};

const getCollectionFormat = (collectionPath) => {
  const ocYmlPath = path.join(collectionPath, 'opencollection.yml');
  if (fs.existsSync(ocYmlPath)) {
    return 'yml';
  }

  const brunoJsonPath = path.join(collectionPath, 'bruno.json');
  if (fs.existsSync(brunoJsonPath)) {
    return 'bru';
  }

  throw new Error(`No collection configuration found at: ${collectionPath}`);
};

const safeToRename = (oldPath, newPath) => {
  try {
    // If the new path doesn't exist, it's safe to rename
    if (!fs.existsSync(newPath)) {
      return true;
    }

    const oldStat = fs.statSync(oldPath);
    const newStat = fs.statSync(newPath);

    if (isWindowsOS()) {
      // Windows-specific comparison:
      // Check if both files have the same birth time, size (Since, Win FAT-32 doesn't use inodes)

      return oldStat.birthtimeMs === newStat.birthtimeMs && oldStat.size === newStat.size;
    }
    // Unix/Linux/MacOS: Check inode to see if they are the same file
    return oldStat.ino === newStat.ino;
  } catch (error) {
    console.error(`Error checking file rename safety for ${oldPath} and ${newPath}:`, error);
    return false;
  }
};

/**
 * Canonicalize a path to its real on-disk form (actual casing + symlinks
 * resolved) so path comparisons are correct on case-insensitive volumes.
 */
const canonicalPath = (p) => {
  try {
    return fs.realpathSync.native(p);
  } catch (_) {
    return path.resolve(p);
  }
};

const getUniqueRenamePath = (oldPath, desiredNewPath) => {
  const dir = path.dirname(desiredNewPath);
  const ext = isDirectory(oldPath) ? '' : path.extname(desiredNewPath);
  const rawBase = path.basename(desiredNewPath, ext);
  const extNoDot = ext.startsWith('.') ? ext.slice(1) : ext;

  // Leave room for numeric suffixes within the filename limit.
  const base = truncateBaseForSuffix(rawBase, extNoDot);

  const sourceReal = canonicalPath(oldPath);

  // Start with the requested name; if it's taken, try numbered suffixes.
  for (let counter = 0; counter < MAX_DUPLICATE_NAMES; counter++) {
    const candidatePath = path.join(
      dir,
      nextSuffixedName(base, extNoDot, counter)
    );
    if (!fs.existsSync(candidatePath) || canonicalPath(candidatePath) === sourceReal) {
      return candidatePath;
    }
  }

  throw new Error(
    `Too many items named "${rawBase}" (limit ${MAX_DUPLICATE_NAMES}). Please use a different name.`
  );
};

/**
  * Returns a unique path for moving `sourcePathname` into `targetDirname`.
  */
const getUniqueTargetPath = (sourcePathname, targetDirname) => {
  const desired = path.join(targetDirname, path.basename(sourcePathname));
  return getUniqueRenamePath(sourcePathname, desired);
};

/**
 * Recursively copies `source` to `targetPath`.
 */
const copyPathTo = async (source, targetPath) => {
  const resolvedSource = canonicalPath(source);
  const resolvedTarget = path.join(canonicalPath(path.dirname(targetPath)), path.basename(targetPath));

  // Prevent copying a path into itself or one of its descendants.
  if (resolvedTarget === resolvedSource || resolvedTarget.startsWith(resolvedSource + path.sep)) {
    throw new Error('Cannot copy a path into itself or a subdirectory of itself');
  }

  const copyTree = async (src, dest) => {
    const lst = await fsPromises.lstat(src);

    if (lst.isSymbolicLink()) {
      // Dereference the link (copy what it points at) rather than recreating it.
      const real = await fsPromises.stat(src).catch(() => null); // follows the link
      if (!real) return; // dangling link(target doesn't exist). skip
      if (real.isFile()) {
        await fsPromises.copyFile(src, dest); // copyFile follows the link → real file
      }

      return;
    }

    if (lst.isDirectory()) {
      await fsPromises.mkdir(dest, { recursive: true });

      const entries = await fsPromises.readdir(src);
      for (const entry of entries) {
        await copyTree(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      await fsPromises.copyFile(src, dest);
    }
  };

  await copyTree(source, targetPath);
};

/**
 * Serializes moves targeting the same directory.
 * Different directories can still be processed concurrently.
 */
const dirLockChains = new Map();

const withDirLock = async (dirname, fn) => {
  // canonicalPath resolves symlinks and real on-disk casing via realpathSync,
  // so two differently-cased spellings of the same dir on a case-insensitive
  // volume (macOS, Windows) share the same lock key.
  const key = canonicalPath(dirname);
  const prev = dirLockChains.get(key) || Promise.resolve();

  // Wait for the previous operation, even if it failed.
  const next = prev.catch(() => {}).then(() => fn());

  dirLockChains.set(key, next);

  try {
    return await next;
  } finally {
    if (dirLockChains.get(key) === next) {
      dirLockChains.delete(key);
    }
  }
};

const getCollectionStats = async (directoryPath) => {
  let size = 0;
  let filesCount = 0;
  let maxFileSize = 0;

  async function calculateStats(directory) {
    const entries = await fsPromises.readdir(directory, { withFileTypes: true });

    const tasks = entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', '.git'].includes(entry.name)) {
          return;
        }

        await calculateStats(fullPath);
      }

      if (path.extname(fullPath) === '.bru') {
        const stats = await fsPromises.stat(fullPath);
        size += stats?.size;
        if (maxFileSize < stats?.size) {
          maxFileSize = stats?.size;
        }
        filesCount += 1;
      }
    });

    await Promise.all(tasks);
  }

  await calculateStats(directoryPath);

  size = sizeInMB(size);
  maxFileSize = sizeInMB(maxFileSize);

  return { size, filesCount, maxFileSize };
};

const sizeInMB = (size) => {
  return size / (1024 * 1024);
};

const getSafePathToWrite = (filePath) => {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  let base = path.basename(filePath, ext);
  if (base.length + ext.length > MAX_FILENAME_LENGTH) {
    base = sanitizeName(base);
    base = base.slice(0, MAX_FILENAME_LENGTH - ext.length);
  }
  const safePath = path.join(dir, base + ext);
  return safePath;
};

async function safeWriteFile(filePath, data, options) {
  const safePath = getSafePathToWrite(filePath);

  try {
    const fsExtra = require('fs-extra');
    fsExtra.outputFileSync(safePath, data, options);
  } catch (err) {
    console.error(`Error writing file at ${safePath}:`, err);
    return Promise.reject(err);
  }
}

function safeWriteFileSync(filePath, data) {
  const safePath = getSafePathToWrite(filePath);
  fs.writeFileSync(safePath, data);
}

// Recursively removes a source <file/directory>.
const removePath = async (source) => {
  const stat = await fsPromises.lstat(source);
  if (stat.isDirectory()) {
    const entries = await fsPromises.readdir(source);
    for (const entry of entries) {
      const entryPath = path.join(source, entry);
      await removePath(entryPath);
    }
    await fsPromises.rmdir(source);
  } else {
    await fsPromises.unlink(source);
  }
};

/**
 * Move a collection directory from source to destination.
 * Uses fs-extra's move for cross-device compatibility.
 */
const moveCollectionDirectory = async (source, destination) => {
  const needsWindowsSafeMove = isWindowsOS() && !isWSLPath(source) && hasSubDirectories(source);
  if (!needsWindowsSafeMove) {
    await fs.move(source, destination, { overwrite: false });
    return;
  }

  const tempDir = path.join(os.tmpdir(), `temp-collection-${Date.now()}`);
  try {
    await fs.copy(source, tempDir);
    await fs.remove(source);
    await fs.move(tempDir, destination, { overwrite: false });
    await fs.remove(tempDir);
  } catch (error) {
    // restore the source if the windows safe move left files in the temp dir
    if (fs.pathExistsSync(tempDir) && !fs.pathExistsSync(source)) {
      try {
        await fs.copy(tempDir, source);
        await fs.remove(tempDir);
      } catch (err) {
        console.error('Failed to restore collection directory to its original path:', err);
      }
    }
    throw error;
  }
};

// Recursively gets paths.
const getPaths = async (source) => {
  const paths = [];
  const _getPaths = async (source) => {
    const stat = await fsPromises.lstat(source);
    paths.push(source);
    if (stat.isDirectory()) {
      const entries = await fsPromises.readdir(source);
      for (const entry of entries) {
        const entryPath = path.join(source, entry);
        await _getPaths(entryPath);
      }
    }
  };
  await _getPaths(source);
  return paths;
};

/**
 * Checks if a file is larger than a given threshold.
 * @param {string} filePath - The path to the file.
 * @param {number} threshold - The threshold in bytes. Default is 10MB.
 * @returns {boolean} True if the file is larger than the threshold, false otherwise.
 */
const isLargeFile = (filePath, threshold = 10 * 1024 * 1024) => {
  if (!isFile(filePath)) {
    throw new Error(`File ${filePath} is not a file`);
  }

  const size = fs.statSync(filePath).size;

  return size > threshold;
};

const isDotEnvFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return path.normalize(dirname) === path.normalize(collectionPath) && basename === '.env';
};

const isValidDotEnvFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  const basename = path.basename(filename);
  if (basename !== filename) return false;
  return basename === '.env' || (basename.startsWith('.env.') && /^\.env\.[a-zA-Z0-9._-]+$/.test(basename));
};

const isBrunoConfigFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return path.normalize(dirname) === path.normalize(collectionPath) && basename === 'bruno.json';
};

const isBruEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const envDirectory = path.join(collectionPath, 'environments');
  const basename = path.basename(pathname);

  return path.normalize(dirname) === path.normalize(envDirectory) && hasBruExtension(basename);
};

const isCollectionRootBruFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return path.normalize(dirname) === path.normalize(collectionPath) && basename === 'collection.bru';
};

const scanForBrunoFiles = async (dir) => {
  const brunoFolders = [];

  const scanDir = (currentDir) => {
    const files = fs.readdirSync(currentDir);

    if (files && files.length) {
      files.forEach((file) => {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (['node_modules', '.git'].includes(file)) {
            return;
          }
          scanDir(fullPath);
        } else if ((file === 'bruno.json' || file === 'opencollection.yml') && !brunoFolders.includes(currentDir)) {
          brunoFolders.push(currentDir);
        }
      });
    }
  };

  scanDir(dir);
  return brunoFolders;
};

const posixifyPath = (p) => (p ? p.replace(/\\/g, '/') : p);

module.exports = {
  DEFAULT_GITIGNORE,
  posixifyPath,
  isValidPathname,
  exists,
  isSymbolicLink,
  isFile,
  isDirectory,
  isValidCollectionDirectory,
  normalizeAndResolvePath,
  isWSLPath,
  normalizeWSLPath,
  writeFile,
  withFileLock,
  nextSuffixedName,
  writeFileUnique,
  mkdirUnique,
  getUniqueRenamePath,
  getUniqueTargetPath,
  copyPathTo,
  canonicalPath,
  withDirLock,
  hasJsonExtension,
  hasBruExtension,
  hasRequestExtension,
  createDirectory,
  browseDirectory,
  browseDirectories,
  browseFiles,
  chooseFileToSave,
  searchForFiles,
  searchForRequestFiles,
  sanitizeName,
  isWindowsOS,
  safeToRename,
  validateName,
  hasSubDirectories,
  getCollectionStats,
  sizeInMB,
  safeWriteFile,
  safeWriteFileSync,
  removePath,
  moveCollectionDirectory,
  getPaths,
  isLargeFile,
  generateUniqueName,
  getCollectionFormat,
  isDotEnvFile,
  isValidDotEnvFilename,
  isBrunoConfigFile,
  isBruEnvironmentConfig,
  isCollectionRootBruFile,
  scanForBrunoFiles
};
