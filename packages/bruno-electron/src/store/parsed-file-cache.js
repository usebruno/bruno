const { open } = require('lmdb');
const path = require('path');
const { app } = require('electron');

const CACHE_VERSION = '1.0.0';
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * ParsedFileCacheStore - Caches parsed .bru file content to speed up collection mounting.
 *
 * Uses LMDB (Lightning Memory-Mapped Database) for high-performance storage.
 * LMDB provides:
 * - Synchronous reads (no async overhead)
 * - Memory-mapped I/O for fast access
 * - ACID transactions
 * - Automatic crash recovery
 *
 * Uses mtime (modification time) to determine if a cached entry is still valid.
 */
class ParsedFileCacheStore {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this._initPromise = null;
  }

  /**
   * Get the cache directory path
   */
  _getCachePath() {
    // Use app.getPath('userData') for Electron, fallback for testing
    try {
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'parsed-file-cache');
    } catch (e) {
      // Fallback for when app is not ready (e.g., during testing)
      return path.join(process.cwd(), '.bruno-cache', 'parsed-file-cache');
    }
  }

  /**
   * Initialize the LMDB database
   */
  _initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = (async () => {
      try {
        const cachePath = this._getCachePath();

        this.db = open({
          path: cachePath,
          compression: true, // Enable compression for smaller disk usage
          encoding: 'json', // Automatically serialize/deserialize JSON
          // Map size: 1GB should be plenty for parsed file cache
          mapSize: 1024 * 1024 * 1024
        });

        // Check and handle version migration
        const storedVersion = this.db.get('__version__');
        if (storedVersion !== CACHE_VERSION) {
          // Clear cache if version mismatch
          await this.db.clearAsync();
          this.db.put('__version__', CACHE_VERSION);
        }

        this.isInitialized = true;

        // Prune old entries on startup (async, don't block)
        this.prune(DEFAULT_MAX_AGE_MS).catch((err) => {
          console.error('ParsedFileCacheStore: Error during startup prune:', err);
        });
      } catch (error) {
        console.error('ParsedFileCacheStore: Error initializing LMDB:', error);
        // Create a no-op fallback so the app doesn't crash
        this.db = null;
        this.isInitialized = true;
      }
    })();

    return this._initPromise;
  }

  /**
   * Ensure the database is initialized
   */
  _ensureInitialized() {
    if (!this.isInitialized) {
      this._initialize();
    }
  }

  /**
   * Generate a cache key from collection path and file path
   */
  _getKey(collectionPath, filePath) {
    return `${collectionPath}\0${filePath}`;
  }

  /**
   * Get a cached entry if it exists
   * @param {string} collectionPath - The collection root path
   * @param {string} filePath - The file path
   * @returns {object|null} - The cached entry or null if not found/invalid
   */
  getEntry(collectionPath, filePath) {
    this._ensureInitialized();

    if (!this.db) {
      return null;
    }

    try {
      const key = this._getKey(collectionPath, filePath);
      const entry = this.db.get(key);

      if (entry && typeof entry.mtimeMs === 'number' && entry.parsedData) {
        return entry;
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error reading cache entry:', error);
    }

    return null;
  }

  /**
   * Set a cache entry
   * @param {string} collectionPath - The collection root path
   * @param {string} filePath - The file path
   * @param {object} entry - The cache entry { mtimeMs, parsedData }
   */
  setEntry(collectionPath, filePath, entry) {
    this._ensureInitialized();

    if (!this.db) {
      return;
    }

    try {
      const key = this._getKey(collectionPath, filePath);
      const cacheEntry = {
        mtimeMs: entry.mtimeMs,
        parsedData: entry.parsedData,
        parsedAt: Date.now(),
        collectionPath // Store for pruning/iteration
      };

      this.db.put(key, cacheEntry);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error writing cache entry:', error);
    }
  }

  /**
   * Invalidate (remove) a single cache entry
   * @param {string} collectionPath - The collection root path
   * @param {string} filePath - The file path
   */
  invalidate(collectionPath, filePath) {
    this._ensureInitialized();

    if (!this.db) {
      return;
    }

    try {
      const key = this._getKey(collectionPath, filePath);
      this.db.remove(key);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating cache entry:', error);
    }
  }

  /**
   * Invalidate all cache entries for a collection
   * @param {string} collectionPath - The collection root path
   */
  invalidateCollection(collectionPath) {
    this._ensureInitialized();

    if (!this.db) {
      return;
    }

    try {
      const prefix = `${collectionPath}\0`;
      const keysToDelete = [];

      // Use range query to find all keys with this collection prefix
      for (const { key } of this.db.getRange({ start: prefix, end: `${collectionPath}\x01` })) {
        keysToDelete.push(key);
      }

      // Delete in a transaction for efficiency
      if (keysToDelete.length > 0) {
        this.db.transaction(() => {
          for (const key of keysToDelete) {
            this.db.remove(key);
          }
        });
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating collection cache:', error);
    }
  }

  /**
   * Invalidate all cache entries under a directory path
   * @param {string} collectionPath - The collection root path
   * @param {string} dirPath - The directory path
   */
  invalidateDirectory(collectionPath, dirPath) {
    this._ensureInitialized();

    if (!this.db) {
      return;
    }

    try {
      const normalizedDirPath = dirPath.endsWith(path.sep) ? dirPath : `${dirPath}${path.sep}`;
      const prefix = `${collectionPath}\0${normalizedDirPath}`;
      const keysToDelete = [];

      // Find all keys that start with this directory prefix
      for (const { key } of this.db.getRange({ start: prefix })) {
        // Check if key still starts with our prefix (getRange might go beyond)
        if (!key.startsWith(prefix)) {
          break;
        }
        keysToDelete.push(key);
      }

      // Delete in a transaction for efficiency
      if (keysToDelete.length > 0) {
        this.db.transaction(() => {
          for (const key of keysToDelete) {
            this.db.remove(key);
          }
        });
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating directory cache:', error);
    }
  }

  /**
   * Move a cache entry to a new path (for renames)
   * @param {string} collectionPath - The collection root path
   * @param {string} oldFilePath - The old file path
   * @param {string} newFilePath - The new file path
   */
  moveEntry(collectionPath, oldFilePath, newFilePath) {
    const entry = this.getEntry(collectionPath, oldFilePath);
    if (entry) {
      this.invalidate(collectionPath, oldFilePath);
      this.setEntry(collectionPath, newFilePath, {
        mtimeMs: entry.mtimeMs,
        parsedData: entry.parsedData
      });
    }
  }

  /**
   * Prune old cache entries
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 30 days)
   */
  async prune(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    this._ensureInitialized();

    if (!this.db) {
      return;
    }

    const now = Date.now();
    const cutoff = now - maxAgeMs;

    try {
      const keysToDelete = [];

      // Iterate through all entries
      for (const { key, value } of this.db.getRange({})) {
        // Convert key to string if it's a buffer
        const keyStr = typeof key === 'string' ? key : key.toString();
        // Skip metadata keys
        if (keyStr.startsWith('__')) {
          continue;
        }

        if (value && value.parsedAt && value.parsedAt < cutoff) {
          keysToDelete.push(key);
        }
      }

      // Delete old entries in a transaction
      if (keysToDelete.length > 0) {
        await this.db.transaction(() => {
          for (const key of keysToDelete) {
            this.db.remove(key);
          }
        });
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error pruning cache:', error);
    }
  }

  /**
   * Clear the entire cache
   */
  async clear() {
    this._ensureInitialized();

    if (!this.db) {
      return;
    }

    try {
      await this.db.clearAsync();
      this.db.put('__version__', CACHE_VERSION);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Statistics about the cache
   */
  getStats() {
    this._ensureInitialized();

    if (!this.db) {
      return {
        version: CACHE_VERSION,
        totalCollections: 0,
        totalFiles: 0,
        error: 'Database not initialized'
      };
    }

    try {
      const collections = new Set();
      let totalFiles = 0;

      for (const { key, value } of this.db.getRange({})) {
        // Convert key to string if it's a buffer
        const keyStr = typeof key === 'string' ? key : key.toString();
        if (keyStr.startsWith('__')) {
          continue;
        }

        totalFiles++;
        if (value && value.collectionPath) {
          collections.add(value.collectionPath);
        }
      }

      return {
        version: this.db.get('__version__') || CACHE_VERSION,
        totalCollections: collections.size,
        totalFiles
      };
    } catch (error) {
      console.error('ParsedFileCacheStore: Error getting stats:', error);
      return {
        version: CACHE_VERSION,
        totalCollections: 0,
        totalFiles: 0,
        error: error.message
      };
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
const parsedFileCacheStore = new ParsedFileCacheStore();

module.exports = {
  parsedFileCacheStore,
  ParsedFileCacheStore
};
