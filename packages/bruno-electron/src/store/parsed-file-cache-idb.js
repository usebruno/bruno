const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');

// Pending requests waiting for renderer response
const pendingRequests = new Map();

// Timeout for IPC requests (5 seconds)
const REQUEST_TIMEOUT = 5000;

// Store reference to main window
let mainWindow = null;

// Initialize the IPC response handler
const initializeCacheIpc = (win) => {
  mainWindow = win;

  ipcMain.on('renderer:parsed-file-cache-response', (event, response) => {
    const { requestId, success, data, error } = response;
    const pending = pendingRequests.get(requestId);

    if (pending) {
      pendingRequests.delete(requestId);
      clearTimeout(pending.timeout);

      if (success) {
        pending.resolve(data);
      } else {
        pending.reject(new Error(error || 'Unknown error'));
      }
    }
  });
};

// Send a request to the renderer and wait for response
const sendCacheRequest = (operation, ...args) => {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      resolve(null);
      return;
    }

    const requestId = uuidv4();

    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve(null);
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, { resolve, timeout });

    mainWindow.webContents.send('main:parsed-file-cache-request', operation, requestId, ...args);
  });
};

class ParsedFileCacheStore {
  constructor() {
    this.initialized = false;
  }

  initialize(win) {
    if (!this.initialized) {
      initializeCacheIpc(win);
      this.initialized = true;
    }
  }

  async getEntry(collectionPath, filePath) {
    try {
      return await sendCacheRequest('getEntry', collectionPath, filePath);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error reading cache entry:', error);
      return null;
    }
  }

  async setEntry(collectionPath, filePath, entry) {
    try {
      await sendCacheRequest('setEntry', collectionPath, filePath, entry);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error writing cache entry:', error);
    }
  }

  async invalidate(collectionPath, filePath) {
    try {
      await sendCacheRequest('invalidate', collectionPath, filePath);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating cache entry:', error);
    }
  }

  async invalidateCollection(collectionPath) {
    try {
      await sendCacheRequest('invalidateCollection', collectionPath);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating collection cache:', error);
    }
  }

  async invalidateDirectory(collectionPath, dirPath) {
    try {
      await sendCacheRequest('invalidateDirectory', collectionPath, dirPath);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating directory cache:', error);
    }
  }

  async moveEntry(collectionPath, oldFilePath, newFilePath) {
    const entry = await this.getEntry(collectionPath, oldFilePath);
    if (entry) {
      await this.invalidate(collectionPath, oldFilePath);
      await this.setEntry(collectionPath, newFilePath, {
        mtimeMs: entry.mtimeMs,
        parsedData: entry.parsedData
      });
    }
  }

  async getStats() {
    try {
      const stats = await sendCacheRequest('getStats');
      return stats || {
        version: '1.0.0',
        totalCollections: 0,
        totalFiles: 0
      };
    } catch (error) {
      console.error('ParsedFileCacheStore: Error getting stats:', error);
      return {
        version: '1.0.0',
        totalCollections: 0,
        totalFiles: 0,
        error: error.message
      };
    }
  }

  async clear() {
    try {
      await sendCacheRequest('clear');
    } catch (error) {
      console.error('ParsedFileCacheStore: Error clearing cache:', error);
    }
  }

  async close() {
    // No-op for IndexedDB version (managed by browser)
  }
}

// Singleton instance
const parsedFileCacheStore = new ParsedFileCacheStore();

module.exports = {
  parsedFileCacheStore,
  ParsedFileCacheStore
};
