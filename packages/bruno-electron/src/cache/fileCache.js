const { join } = require('path');
const { open } = require('lmdb');
const { app } = require('electron');
const { preferencesUtil } = require('../store/preferences');

const CACHE_VERSION = 1;
const VERSION_KEY = '__cache_version__';

class FileCache {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    try {
      this.dbPath = join(app.getPath('userData'), 'file-cache-lmdb');
      this.db = open({
        path: this.dbPath,
        compression: true,
        encoding: 'json'
      });

      this._clearIfIncompatible();

      this.initialized = true;
      console.log('File cache initialized at:', this.dbPath);
    } catch (err) {
      console.error('Failed to initialize file cache:', err);
      throw err;
    }
  }

  _clearIfIncompatible() {
    try {
      const storedVersion = this.db.get(VERSION_KEY);
      if (storedVersion !== CACHE_VERSION) {
        console.log(`Cache version mismatch (stored: ${storedVersion}, current: ${CACHE_VERSION}), clearing cache`);
        this.db.clearSync();
        this.db.putSync(VERSION_KEY, CACHE_VERSION);
      }
    } catch (err) {
      console.log('Cache appears incompatible, clearing cache');
      this.db.clearSync();
      this.db.putSync(VERSION_KEY, CACHE_VERSION);
    }
  }

  /**
   * Get cached parsed data for a file if the mtime matches
   * @param {string} filepath - The full path to the file
   * @param {number} currentMtime - The current mtime of the file (in milliseconds)
   * @returns {object|null} - The parsed data if cache hit, null if cache miss
   */
  get(filepath, currentMtime) {
    if (!this.initialized || !this.db || !preferencesUtil.isCacheEnabled()) {
      return null;
    }

    try {
      const entry = this.db.get(filepath);
      if (entry && entry.mtime === currentMtime) {
        return entry.parsedData;
      }
      return null;
    } catch (err) {
      console.error('Error getting from file cache:', err);
      return null;
    }
  }

  /**
   * Set cached parsed data for a file
   * @param {string} filepath - The full path to the file
   * @param {object} data - The data to cache
   * @param {number} data.mtime - The mtime of the file (in milliseconds)
   * @param {string} data.fileType - The type of file (e.g., 'request', 'environment')
   * @param {object} data.parsedData - The parsed data to cache
   * @param {string} data.collectionUid - The UID of the collection
   * @param {string} data.collectionPath - The path of the collection
   * @param {number} data.size - The size of the file in bytes
   */
  set(filepath, { mtime, fileType, parsedData, collectionUid, collectionPath, size }) {
    if (!this.initialized || !this.db || !preferencesUtil.isCacheEnabled()) {
      return;
    }

    try {
      this.db.putSync(filepath, { mtime, fileType, parsedData, collectionUid, collectionPath, size });
    } catch (err) {
      console.error('Error setting file cache:', err);
    }
  }

  /**
   * Delete a file from the cache
   * @param {string} filepath - The full path to the file
   */
  delete(filepath) {
    if (!this.initialized || !this.db) {
      return;
    }

    try {
      this.db.removeSync(filepath);
    } catch (err) {
      console.error('Error deleting from file cache:', err);
    }
  }

  /**
   * Clear the entire cache (preserves version key)
   */
  clearAll() {
    if (!this.initialized || !this.db) {
      return;
    }

    try {
      this.db.clearSync();
      this.db.putSync(VERSION_KEY, CACHE_VERSION);
    } catch (err) {
      console.error('Error clearing file cache:', err);
    }
  }

  /**
   * Get statistics about the cache
   * @returns {object} - Cache statistics
   */
  getStats() {
    if (!this.initialized || !this.db) {
      return {
        fileCount: 0,
        totalSizeBytes: 0,
        byCollection: {}
      };
    }

    try {
      let fileCount = 0;
      let totalSizeBytes = 0;
      const byCollection = {};

      for (const { key, value } of this.db.getRange()) {
        if (key === VERSION_KEY) {
          continue;
        }

        fileCount++;
        totalSizeBytes += value.size || 0;

        const cp = value.collectionPath;
        if (!byCollection[cp]) {
          byCollection[cp] = { count: 0, size: 0 };
        }
        byCollection[cp].count++;
        byCollection[cp].size += value.size || 0;
      }

      return {
        fileCount,
        totalSizeBytes,
        byCollection
      };
    } catch (err) {
      console.error('Error getting file cache stats:', err);
      return {
        fileCount: 0,
        totalSizeBytes: 0,
        byCollection: {}
      };
    }
  }

  /**
   * Flush any pending writes to disk
   */
  async flush() {
    if (!this.initialized || !this.db) {
      return;
    }

    try {
      await this.db.flushed;
    } catch (err) {
      console.error('Error flushing file cache:', err);
    }
  }

  /**
   * Close the database (call on app quit)
   */
  async close() {
    if (this.db) {
      try {
        await this.flush();
        this.db.close();
      } catch (err) {
        console.error('Error closing file cache:', err);
      }
      this.db = null;
      this.initialized = false;
    }
  }
}

const fileCache = new FileCache();
module.exports = { fileCache, FileCache };
