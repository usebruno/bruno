const path = require('path');
const fs = require('fs-extra');
const fsPromises = require('fs/promises');

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
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (_) {
    return false;
  }
};

const normalizeAndResolvePath = (pathname) => {
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

const writeFile = async (pathname, content) => {
  try {
    fs.writeFileSync(pathname, content, {
      encoding: 'utf8'
    });
  } catch (err) {
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

const stripExtension = (filename = '') => {
  return filename.replace(/\.[^/.]+$/, '');
};

const getSubDirectories = (dir) => {
  try {
    const files = fs.readdirSync(dir);
    const subDirectories = files
      .filter((file) => {
        return fs.lstatSync(path.join(dir, file)).isDirectory();
      })
      .sort();

    return subDirectories;
  } catch (err) {
    return [];
  }
};

/**
 * Sanitizes a filename to make it safe for filesystem operations
 * 
 * @param {string} name - The name to sanitize
 * @returns {string} - The sanitized name
 */
const sanitizeName = (name) => {
  if (!name) return '';
  
  const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g;
  return name
    .replace(invalidCharacters, '-')       // replace invalid characters with hyphens
    .replace(/^[.\s-]+/, '')               // remove leading dots, hyphens and spaces
    .replace(/[.\s]+$/, '');               // remove trailing dots and spaces (keep trailing hyphens)
};

/**
 * Validates if a name is valid for the filesystem
 * 
 * @param {string} name - The name to validate
 * @returns {boolean} - True if the name is valid, false otherwise
 */
const validateName = (name) => {
  if (!name) return false;
  
  const reservedDeviceNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;
  const firstCharacter = /^[^.\s\-\<>:"/\\|?*\x00-\x1F]/; // no dot, space, or hyphen at start
  const middleCharacters = /^[^<>:"/\\|?*\x00-\x1F]*$/;   // no invalid characters
  const lastCharacter = /[^.\s]$/;  // no dot or space at end, hyphen allowed
  
  if (name.length > 255) return false;          // max name length
  if (reservedDeviceNames.test(name)) return false; // windows reserved names

  return (
    firstCharacter.test(name) &&
    middleCharacters.test(name) &&
    lastCharacter.test(name)
  );
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

module.exports = {
  exists,
  isSymbolicLink,
  isFile,
  isDirectory,
  normalizeAndResolvePath,
  writeFile,
  hasJsonExtension,
  hasBruExtension,
  createDirectory,
  searchForFiles,
  searchForBruFiles,
  stripExtension,
  getSubDirectories,
  sanitizeName,
  validateName,
  isLargeFile
};
