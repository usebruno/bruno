const path = require('path');
const fs = require('fs-extra');
const fsPromises = require('fs/promises');
const { dialog } = require('electron');
const isValidPathname = require('is-valid-path');
const os = require('os');

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

const hasSubDirectories = (dir) => {
  const files = fs.readdirSync(dir);
  return files.some(file => fs.statSync(path.join(dir, file)).isDirectory());
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
      encoding: !isBinary ? "utf-8" : null
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

const searchForBruFiles = (dir) => {
  return searchForFiles(dir, '.bru');
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
}

const validateName = (name) => {
    const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g; // keeping this for informational purpose
    const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
    const firstCharacter = /^[^\s\-<>:"/\\|?*\x00-\x1F]/; // no space, hyphen and `invalidCharacters`
    const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/;   // no `invalidCharacters`
    const lastCharacter = /[^.\s<>:"/\\|?*\x00-\x1F]$/; // no dot, space and `invalidCharacters`
    if (name.length > 255) return false;          // max name length

    if (reservedDeviceNames.test(name)) return false; // windows reserved names

    return (
        firstCharacter.test(name) &&
        middleCharacters.test(name) &&
        lastCharacter.test(name)
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
}

const sizeInMB = (size) => {
  return size / (1024 * 1024);
}

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
}

async function safeWriteFile(filePath, data, options) {
  const safePath = getSafePathToWrite(filePath);
  await fs.writeFile(safePath, data, options);
}

function safeWriteFileSync(filePath, data) {
  const safePath = getSafePathToWrite(filePath);
  fs.writeFileSync(safePath, data);
}

module.exports = {
  isValidPathname,
  exists,
  isSymbolicLink,
  isFile,
  isDirectory,
  normalizeAndResolvePath,
  isWSLPath,
  normalizeWSLPath,
  writeFile,
  hasJsonExtension,
  hasBruExtension,
  createDirectory,
  browseDirectory,
  browseFiles,
  chooseFileToSave,
  searchForFiles,
  searchForBruFiles,
  sanitizeName,
  isWindowsOS,
  safeToRename,
  validateName,
  hasSubDirectories,
  getCollectionStats,
  sizeInMB,
  safeWriteFile,
  safeWriteFileSync
};
