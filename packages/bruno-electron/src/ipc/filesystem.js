const { ipcMain } = require('electron');
const path = require('node:path');
const fsPromises = require('node:fs/promises');

const {
  browseDirectory,
  browseFiles,
  normalizeAndResolvePath,
  isFile,
  isDirectory,
  chooseFileToSave
} = require('../utils/filesystem');

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

  // Choose file to save
  ipcMain.handle('renderer:choose-file-to-save', async (_, preferredFileName = '') => {
    try {
      return await chooseFileToSave(mainWindow, preferredFileName);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Write file
  ipcMain.handle('renderer:write-file', async (_, filePath, content) => {
    try {
      await fsPromises.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Check if file exists
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
};

module.exports = registerFilesystemIpc;
