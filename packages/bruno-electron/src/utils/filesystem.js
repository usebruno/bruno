const path = require('path');
const fs = require('fs-extra');
const fsPromises = require('fs/promises');
const { dialog } = require('electron');
const isValidPathname = require('is-valid-path');
const os = require('os');

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

const sanitizeName = (name) => {
  const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g;
  name = name
    .replace(invalidCharacters, '-') // replace invalid characters with hyphens
    .replace(/^[\s\-]+/, '') // remove leading spaces and hyphens
    .replace(/[.\s]+$/, ''); // remove trailing dots and spaces
  return name;
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

const validateName = (name) => {
  const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g; // keeping this for informational purpose
  const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
  const firstCharacter = /^[^\s\-<>:"/\\|?*\x00-\x1F]/; // no space, hyphen and `invalidCharacters`
  const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/; // no `invalidCharacters`
  const lastCharacter = /[^.\s<>:"/\\|?*\x00-\x1F]$/; // no dot, space and `invalidCharacters`
  if (name.length > 255) return false; // max name length

  if (reservedDeviceNames.test(name)) return false; // windows reserved names

  return (
    firstCharacter.test(name)
    && middleCharacters.test(name)
    && lastCharacter.test(name)
  );
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
  const MAX_FILENAME_LENGTH = 255; // Common limit on most filesystems
  let dir = path.dirname(filePath);
  let ext = path.extname(filePath);
  let base = path.basename(filePath, ext);
  if (base.length + ext.length > MAX_FILENAME_LENGTH) {
    base = sanitizeName(base);
    base = base.slice(0, MAX_FILENAME_LENGTH - ext.length);
  }
  let safePath = path.join(dir, base + ext);
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

// Recursively copies a source <file/directory> to a destination <directory>.
const copyPath = async (source, destination) => {
  let targetPath = `${destination}/${path.basename(source)}`;

  const targetPathExists = await fsPromises.access(targetPath).then(() => true).catch(() => false);
  if (targetPathExists) {
    throw new Error(`Cannot copy, ${path.basename(source)} already exists in ${path.basename(destination)}`);
  }

  const copy = async (source, destination) => {
    const stat = await fsPromises.lstat(source);
    if (stat.isDirectory()) {
      await fsPromises.mkdir(destination, { recursive: true });
      const entries = await fsPromises.readdir(source);
      for (const entry of entries) {
        const srcPath = path.join(source, entry);
        const destPath = path.join(destination, entry);
        await copy(srcPath, destPath);
      }
    } else {
      await fsPromises.copyFile(source, destination);
    }
  };

  await copy(source, targetPath);
};

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

// Recursively gets paths.
const getPaths = async (source) => {
  let paths = [];
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

  return dirname === collectionPath && basename === '.env';
};

const isBrunoConfigFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'bruno.json';
};

const isBruEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const envDirectory = path.join(collectionPath, 'environments');
  const basename = path.basename(pathname);

  return dirname === envDirectory && hasBruExtension(basename);
};

const isCollectionRootBruFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'collection.bru';
};

module.exports = {
  DEFAULT_GITIGNORE,
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
  hasJsonExtension,
  hasBruExtension,
  hasRequestExtension,
  createDirectory,
  browseDirectory,
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
  copyPath,
  removePath,
  getPaths,
  isLargeFile,
  generateUniqueName,
  getCollectionFormat,
  isDotEnvFile,
  isBrunoConfigFile,
  isBruEnvironmentConfig,
  isCollectionRootBruFile
};
