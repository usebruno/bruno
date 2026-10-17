const path = require('node:path');
const { ipcMain, BrowserWindow } = require('electron');
const { SearchService } = require('../services/search');
const { defaultClassify } = require('../utils/mount');

const SEARCHABLE_TYPES = new Set(['request', 'folder']);

const service = new SearchService();

const isSearchablePath = (relativePath) => typeof relativePath === 'string'
  && !path.isAbsolute(relativePath)
  && !relativePath.split(/[\\/]/).includes('..')
  && SEARCHABLE_TYPES.has(defaultClassify(relativePath)?.type);

const searchCollections = (event, { roots, query } = {}) => {
  if (typeof query !== 'string') throw new Error('Search query must be a string');
  if (!Array.isArray(roots) || !roots.every((root) => typeof root === 'string' && path.isAbsolute(root))) {
    throw new Error('Search roots must be absolute collection paths');
  }

  const win = BrowserWindow.fromWebContents(event.sender);
  return service.search({ roots, query }, (message) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send('main:search-results', message);
  });
};

const resolveSearchWindow = (_event, { id, collectionPath, relativePaths } = {}) => {
  if (!Number.isInteger(id)) throw new Error('Search id must be an integer');
  if (typeof collectionPath !== 'string' || !path.isAbsolute(collectionPath)) {
    throw new Error('Collection path must be absolute');
  }
  if (!Array.isArray(relativePaths) || !relativePaths.every(isSearchablePath)) {
    throw new Error('Window paths must be request or folder files inside the collection');
  }

  return service.resolveWindow({ id, collectionPath: path.resolve(collectionPath), relativePaths });
};

const registerSearchIpc = () => {
  ipcMain.handle('renderer:search-warmup', () => service.warmup());
  ipcMain.handle('renderer:search-collections', searchCollections);
  ipcMain.handle('renderer:search-window', resolveSearchWindow);
  ipcMain.handle('renderer:search-cancel', () => service.cancel());
};

const shutdown = () => service.shutdown();

module.exports = { registerSearchIpc, searchCollections, resolveSearchWindow, shutdown };
