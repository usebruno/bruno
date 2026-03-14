const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

/**
 * TransientRequestManager
 *
 * Manages transient request directories for collections.
 * Uses a mapping file to track which collection owns which transient directory.
 */
class TransientRequestManager {
  constructor() {
    this._basePath = null;
    this._mappingPath = null;
  }

  /**
   * Get the base path for all transient directories
   */
  getBasePath() {
    if (!this._basePath) {
      this._basePath = path.join(app.getPath('userData'), 'tmp', 'transient');
    }
    return this._basePath;
  }

  /**
   * Get the path to the mapping file
   */
  getMappingPath() {
    if (!this._mappingPath) {
      this._mappingPath = path.join(app.getPath('userData'), 'transient-mapping.json');
    }
    return this._mappingPath;
  }

  /**
   * Check if a file path is inside the transient directory
   */
  isTransientPath(filePath) {
    if (!filePath) return false;
    const basePath = this.getBasePath();
    const normalized = path.normalize(filePath);
    return normalized.startsWith(basePath + path.sep) || normalized === basePath;
  }

  /**
   * Read the mapping file
   * Returns { collections: { [collectionUid]: { pathname, transientDir, format, createdAt } } }
   */
  readMapping() {
    try {
      const content = fs.readFileSync(this.getMappingPath(), 'utf8');
      return JSON.parse(content);
    } catch (err) {
      return { collections: {} };
    }
  }

  /**
   * Write the mapping file
   */
  writeMapping(mapping) {
    fs.writeFileSync(this.getMappingPath(), JSON.stringify(mapping, null, 2), 'utf8');
  }

  /**
   * Get or create a transient directory for a collection.
   * If one already exists and is valid, reuse it.
   */
  getOrCreateDirectory(collectionUid, collectionPath, format = 'bru') {
    const mapping = this.readMapping();

    // Check if we already have a valid mapping
    const existing = mapping.collections[collectionUid];
    if (existing && existing.transientDir && fs.existsSync(existing.transientDir)) {
      return existing.transientDir;
    }

    // Create a new transient directory
    const basePath = this.getBasePath();
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    const dirName = 'bruno-' + crypto.randomBytes(8).toString('hex');
    const transientDir = path.join(basePath, dirName);
    fs.mkdirSync(transientDir, { recursive: true });

    // Update mapping
    mapping.collections[collectionUid] = {
      pathname: collectionPath,
      transientDir: transientDir,
      format: format,
      createdAt: Date.now()
    };
    this.writeMapping(mapping);

    return transientDir;
  }

  /**
   * Get the transient directory path for a collection (without creating it)
   */
  getDirectoryPath(collectionUid) {
    const mapping = this.readMapping();
    const entry = mapping.collections[collectionUid];
    if (entry && entry.transientDir && fs.existsSync(entry.transientDir)) {
      return entry.transientDir;
    }
    return null;
  }

  /**
   * Get collection info by transient directory path.
   * Returns { collectionUid, collectionPath, format } or null if not found.
   */
  getCollectionInfo(transientDir) {
    const normalizedDir = path.normalize(transientDir);
    const mapping = this.readMapping();

    for (const [collectionUid, entry] of Object.entries(mapping.collections)) {
      if (path.normalize(entry.transientDir) === normalizedDir) {
        return {
          collectionUid,
          collectionPath: entry.pathname,
          format: entry.format || 'bru'
        };
      }
    }

    // Not in mapping - check if it's a scratch collection (has metadata.json)
    const metadataPath = path.join(transientDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (metadata.type === 'scratch') {
          return {
            collectionUid: null,
            collectionPath: transientDir,
            format: 'yml'
          };
        }
        // Legacy metadata.json with collectionPath
        if (metadata.collectionPath) {
          return {
            collectionUid: null,
            collectionPath: metadata.collectionPath,
            format: 'bru'
          };
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    return null;
  }

  /**
   * Delete the transient directory for a collection and remove from mapping
   */
  deleteDirectory(collectionUid) {
    const mapping = this.readMapping();
    const entry = mapping.collections[collectionUid];

    if (!entry) return false;

    try {
      if (fs.existsSync(entry.transientDir)) {
        fs.rmSync(entry.transientDir, { recursive: true, force: true });
      }
      delete mapping.collections[collectionUid];
      this.writeMapping(mapping);
      return true;
    } catch (err) {
      console.error(`Failed to delete transient directory for ${collectionUid}:`, err.message);
      return false;
    }
  }

  /**
   * Clean up orphaned transient directories.
   * Removes directories where the collection no longer exists.
   */
  cleanupOrphanedDirectories() {
    const mapping = this.readMapping();
    let cleaned = 0;
    let mappingChanged = false;

    for (const [uid, entry] of Object.entries(mapping.collections)) {
      if (entry.pathname && !fs.existsSync(entry.pathname)) {
        console.log(`Cleaning up orphaned transient directory: ${entry.transientDir}`);
        try {
          if (fs.existsSync(entry.transientDir)) {
            fs.rmSync(entry.transientDir, { recursive: true, force: true });
          }
          delete mapping.collections[uid];
          mappingChanged = true;
          cleaned++;
        } catch (err) {
          console.error(`Failed to clean up ${entry.transientDir}:`, err.message);
        }
      }
    }

    if (mappingChanged) {
      this.writeMapping(mapping);
    }

    return cleaned;
  }

  /**
   * List all transient request files for a collection
   */
  listFiles(collectionUid, format = null) {
    const transientDir = this.getDirectoryPath(collectionUid);
    if (!transientDir) return [];

    // Get format from mapping if not provided
    if (!format) {
      const mapping = this.readMapping();
      format = mapping.collections[collectionUid]?.format || 'bru';
    }

    const extension = format === 'yml' ? '.yml' : '.bru';
    const files = [];

    try {
      const entries = fs.readdirSync(transientDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(extension)) {
          // Skip folder.bru and folder.yml
          if (entry.name === 'folder.bru' || entry.name === 'folder.yml') continue;
          files.push(path.join(transientDir, entry.name));
        }
      }
    } catch (err) {
      console.error(`Error listing transient files for ${collectionUid}:`, err.message);
    }

    return files;
  }
}

// Export a singleton instance
module.exports = new TransientRequestManager();
