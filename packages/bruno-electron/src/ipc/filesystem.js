const { ipcMain } = require('electron');
const fs = require('fs');
const fsPromises = require('fs/promises');

const {
  writeFile,
  hasBruExtension,
  isDirectory,
  browseDirectory,
  browseFiles,
  createDirectory,
  searchForBruFiles,
  sanitizeName,
  safeToRename,
  validateName,
  hasSubDirectories,
  getCollectionStats,
  sizeInMB,
  safeWriteFileSync,
  copyPath,
  removePath,
  getPaths
} = require('../utils/filesystem');

const registerFilesystemIpc = (mainWindow) => {
  // Check if path exists
  ipcMain.handle('renderer:path-exists', async (event, pathname) => {
    try {
      return fs.existsSync(pathname);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Create directory
  ipcMain.handle('renderer:create-directory', async (event, dirPath) => {
    try {
      await createDirectory(dirPath);
      return true;
    } catch (error) {
      console.error('Error creating directory:', error);
      return Promise.reject(error);
    }
  });

  // Copy path
  ipcMain.handle('renderer:copy-path', async (event, source, destination) => {
    try {
      await copyPath(source, destination);
      return true;
    } catch (error) {
      console.error('Error copying path:', error);
      return Promise.reject(error);
    }
  });

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

  // Write file
  ipcMain.handle('renderer:write-file', async (event, filePath, content, isBinary = false) => {
    try {
      return await writeFile(filePath, content, isBinary);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Safe write file sync
  ipcMain.handle('renderer:safe-write-file-sync', async (event, filePath, content) => {
    try {
      return safeWriteFileSync(filePath, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Check if path is directory
  ipcMain.handle('renderer:is-directory', async (event, pathname) => {
    try {
      return isDirectory(pathname);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Check if path has bru extension
  ipcMain.handle('renderer:has-bru-extension', async (event, pathname) => {
    try {
      return hasBruExtension(pathname);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Search for bru files
  ipcMain.handle('renderer:search-bru-files', async (event, dirPath) => {
    try {
      return searchForBruFiles(dirPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Get collection stats
  ipcMain.handle('renderer:get-collection-stats', async (event, dirPath) => {
    try {
      return await getCollectionStats(dirPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Remove path
  ipcMain.handle('renderer:remove-path', async (event, source) => {
    try {
      return await removePath(source);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Get paths
  ipcMain.handle('renderer:get-paths', async (event, source) => {
    try {
      return await getPaths(source);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Validate name
  ipcMain.handle('renderer:validate-name', async (event, name) => {
    try {
      return validateName(name);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Sanitize name
  ipcMain.handle('renderer:sanitize-name', async (event, name) => {
    try {
      return sanitizeName(name);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Check if safe to rename
  ipcMain.handle('renderer:safe-to-rename', async (event, oldPath, newPath) => {
    try {
      return safeToRename(oldPath, newPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Check if has subdirectories
  ipcMain.handle('renderer:has-subdirectories', async (event, dirPath) => {
    try {
      return hasSubDirectories(dirPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Read file
  ipcMain.handle('renderer:read-file', async (event, filePath, encoding = 'utf8') => {
    try {
      return await fsPromises.readFile(filePath, encoding);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Read directory
  ipcMain.handle('renderer:read-directory', async (event, dirPath) => {
    try {
      return await fsPromises.readdir(dirPath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  // Get file stats
  ipcMain.handle('renderer:get-file-stats', async (event, filePath) => {
    try {
      const stats = await fsPromises.stat(filePath);
      return {
        size: sizeInMB(stats.size),
        birthtime: stats.birthtime,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      };
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerFilesystemIpc; 