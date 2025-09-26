const { ipcMain } = require('electron');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('node:path');

const {
  browseDirectory,
  browseFiles,
  normalizeAndResolvePath,
  isFile,
  chooseFileToSave,
} = require('../utils/filesystem');

const registerFilesystemIpc = (mainWindow) => {
  // Browse directory
  ipcMain.handle('renderer:browse-directory', async (event, pathname, request) => {
    try {
      return await browseDirectory(mainWindow);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Browse files
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

  // Resolve path
  ipcMain.handle('renderer:resolve-path', async (_, relativePath, basePath) => {
    try {
      const resolvedPath = path.resolve(basePath, relativePath);
      return normalizeAndResolvePath(resolvedPath);
    } catch (error) {
      return relativePath;
    }
  });
};

module.exports = registerFilesystemIpc; 