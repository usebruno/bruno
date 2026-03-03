const { ipcMain } = require('electron');
const path = require('node:path');

const {
  browseDirectory,
  browseFiles,
  normalizeAndResolvePath,
  isFile,
  isDirectory
} = require('../utils/filesystem');
const { findUniqueFolderName } = require('../utils/collection-import');

const registerFilesystemIpc = (mainWindow) => {
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      return await browseDirectory(mainWindow);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:browse-files', async (_, filters, properties) => {
    try {
      return await browseFiles(mainWindow, filters, properties);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('renderer:exists-sync', async (_, filePath) => {
    try {
      const normalizedPath = normalizeAndResolvePath(filePath);
      return isFile(normalizedPath);
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('renderer:resolve-path', async (_, relativePath, basePath) => {
    try {
      const resolvedPath = path.resolve(basePath, relativePath);
      return normalizeAndResolvePath(resolvedPath);
    } catch (error) {
      return relativePath;
    }
  });

  ipcMain.handle('renderer:is-directory', async (_, pathname) => {
    return isDirectory(pathname);
  });

  ipcMain.handle('renderer:find-unique-folder-name', async (_, baseName, location) => {
    try {
      return findUniqueFolderName(baseName, location);
    } catch (error) {
      return baseName;
    }
  });
};

module.exports = registerFilesystemIpc;
