const path = require('path');
const fs = require('fs-extra');
const fsPromises = require('fs/promises');
const { dialog } = require('electron');
const isValidPathname = require('is-valid-path');

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

const writeBinaryFile = async (pathname, content) => {
  try {
    fs.writeFileSync(pathname, content);
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

const browseDirectory = async (win) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!filePaths || !filePaths[0]) {
    return false;
  }

  const resolvedPath = normalizeAndResolvePath(filePaths[0]);
  return isDirectory(resolvedPath) ? resolvedPath : false;
};

const browseFiles = async (win, filters) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters
  });

  if (!filePaths) {
    return [];
  }

  return filePaths.map((path) => normalizeAndResolvePath(path)).filter((path) => isFile(path));
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

const sanitizeDirectoryName = (name) => {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-');
};

const renameDirectory = async (oldDir, newDir) => {
  if (!oldDir || !newDir) {
    throw new Error(`directory: path is null`);
  }
  if (!fs.existsSync(oldDir)) {
    throw new Error(`directory: ${oldDir} does not exist`);
  }
  if (fs.existsSync(newDir)) {
    throw new Error(`directory: ${newDir} already exists`);
  }
  fs.renameSync(oldDir, newDir);
};

module.exports = {
  isValidPathname,
  exists,
  isSymbolicLink,
  isFile,
  isDirectory,
  normalizeAndResolvePath,
  writeFile,
  writeBinaryFile,
  hasJsonExtension,
  hasBruExtension,
  createDirectory,
  browseDirectory,
  browseFiles,
  chooseFileToSave,
  searchForFiles,
  searchForBruFiles,
  sanitizeDirectoryName,
  renameDirectory
};
