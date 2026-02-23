import { openDB } from 'idb';
import path from 'utils/common/path';

const DB_NAME = 'bruno-parsed-file-cache';
const STORE_NAME = 'parsedFiles';
const DB_VERSION = 1;
const CACHE_VERSION = '1.0.0';
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('collectionPath', 'collectionPath');
          store.createIndex('parsedAt', 'parsedAt');
        }
      }
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
};

const generateKey = (collectionPath, filePath) => {
  return `${collectionPath}↝${filePath}`;
};

export const parsedFileCacheStore = {
  async getEntry(collectionPath, filePath) {
    try {
      const db = await getDB();
      const key = generateKey(collectionPath, filePath);
      const entry = await db.get(STORE_NAME, key);

      if (entry && typeof entry.mtimeMs === 'number' && entry.parsedData) {
        return {
          mtimeMs: entry.mtimeMs,
          parsedData: entry.parsedData
        };
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error reading cache entry:', error);
    }
    return null;
  },

  async setEntry(collectionPath, filePath, entry, retryAfterEviction = true) {
    try {
      const db = await getDB();
      const key = generateKey(collectionPath, filePath);
      const cacheEntry = {
        key,
        collectionPath,
        filePath,
        mtimeMs: entry.mtimeMs,
        parsedData: entry.parsedData,
        parsedAt: Date.now()
      };
      await db.put(STORE_NAME, cacheEntry);
    } catch (error) {
      // Handle QuotaExceededError by evicting old entries and retrying
      const isQuotaError
        = error.name === 'QuotaExceededError'
          || error.code === 22 // Legacy Safari
          || (error.code === 1014 && error.name === 'NS_ERROR_DOM_QUOTA_REACHED'); // Firefox

      if (isQuotaError && retryAfterEviction) {
        console.warn('ParsedFileCacheStore: Quota exceeded, evicting old entries...');
        const evicted = await this.evictLRU();
        if (evicted > 0) {
          // Retry the write after eviction
          return this.setEntry(collectionPath, filePath, entry, false);
        }
        console.warn('ParsedFileCacheStore: No entries to evict, cache write skipped');
      } else {
        console.error('ParsedFileCacheStore: Error writing cache entry:', error);
      }
    }
  },

  async invalidate(collectionPath, filePath) {
    try {
      const db = await getDB();
      const key = generateKey(collectionPath, filePath);
      await db.delete(STORE_NAME, key);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating cache entry:', error);
    }
  },

  async invalidateCollection(collectionPath) {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('collectionPath');

      let cursor = await index.openCursor(IDBKeyRange.only(collectionPath));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating collection cache:', error);
    }
  },

  async invalidateDirectory(collectionPath, dirPath) {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('collectionPath');
      const normalizedDirPath = dirPath.endsWith(path.sep) ? dirPath : `${dirPath}${path.sep}`;

      let cursor = await index.openCursor(IDBKeyRange.only(collectionPath));
      while (cursor) {
        if (cursor.value.filePath.startsWith(normalizedDirPath)) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating directory cache:', error);
    }
  },

  async moveEntry(collectionPath, oldFilePath, newFilePath) {
    try {
      const entry = await this.getEntry(collectionPath, oldFilePath);
      if (entry) {
        await this.invalidate(collectionPath, oldFilePath);
        await this.setEntry(collectionPath, newFilePath, {
          mtimeMs: entry.mtimeMs,
          parsedData: entry.parsedData
        });
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error moving cache entry:', error);
    }
  },

  async prune(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    try {
      const db = await getDB();
      const cutoff = Date.now() - maxAgeMs;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('parsedAt');

      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error pruning cache:', error);
    }
  },

  /**
   * Evict least recently used entries when quota is exceeded.
   * Removes approximately 20% of the oldest entries to free up space.
   * @returns {Promise<number>} Number of entries evicted
   */
  async evictLRU(percentageToEvict = 0.2) {
    try {
      const db = await getDB();
      const totalCount = await db.count(STORE_NAME);

      if (totalCount === 0) {
        return 0;
      }

      const countToEvict = Math.max(1, Math.floor(totalCount * percentageToEvict));

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('parsedAt');

      let cursor = await index.openCursor();
      let evicted = 0;

      while (cursor && evicted < countToEvict) {
        await cursor.delete();
        evicted++;
        cursor = await cursor.continue();
      }

      await tx.done;
      console.log(`ParsedFileCacheStore: Evicted ${evicted} LRU entries to free up space`);
      return evicted;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error during LRU eviction:', error);
      return 0;
    }
  },

  async clear() {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error clearing cache:', error);
    }
  },

  async getStats() {
    try {
      const db = await getDB();

      // Use count() for O(1) total files count
      const totalFiles = await db.count(STORE_NAME);

      // Count unique collections using index with unique cursor
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.store.index('collectionPath');
      let totalCollections = 0;

      // Use openKeyCursor with 'nextunique' to count unique collection paths
      let cursor = await index.openKeyCursor(null, 'nextunique');
      while (cursor) {
        totalCollections++;
        cursor = await cursor.continue();
      }

      return {
        version: CACHE_VERSION,
        totalCollections,
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
};

export default parsedFileCacheStore;
