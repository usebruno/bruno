const sshConnectionManager = require('./ssh-connection-manager');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const chokidar = require('chokidar');

class RemoteCollectionHandler {
  constructor() {
    this.remoteCollections = new Map(); // Map of collectionUid -> { connectionId, remotePath, localPath, watcher }
    this.cacheDir = path.join(os.homedir(), '.bruno', 'remote-collections');

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);
  }

  /**
     * Download a remote collection to local cache
     */
  async downloadCollection(connectionId, remotePath, collectionUid) {
    const sftp = sshConnectionManager.getClient(connectionId);
    const localPath = path.join(this.cacheDir, collectionUid);

    try {
      // Ensure local directory exists
      await fs.ensureDir(localPath);

      // Download the entire directory recursively
      await this.downloadDirectoryRecursive(sftp, remotePath, localPath);

      console.log(`Collection downloaded: ${remotePath} -> ${localPath}`);
      return localPath;
    } catch (error) {
      console.error(`Failed to download collection:`, error.message);
      throw new Error(`Failed to download collection: ${error.message}`);
    }
  }

  /**
     * Recursively download a directory
     */
  async downloadDirectoryRecursive(sftp, remotePath, localPath) {
    const items = await sftp.list(remotePath);

    for (const item of items) {
      const remoteItemPath = path.posix.join(remotePath, item.name);
      const localItemPath = path.join(localPath, item.name);

      if (item.type === 'd') {
        // Directory
        await fs.ensureDir(localItemPath);
        await this.downloadDirectoryRecursive(sftp, remoteItemPath, localItemPath);
      } else {
        // File
        await sftp.fastGet(remoteItemPath, localItemPath);
      }
    }
  }

  /**
     * Upload a file to remote server
     */
  async uploadFile(connectionId, localFilePath, remoteFilePath) {
    const sftp = sshConnectionManager.getClient(connectionId);

    try {
      // Ensure remote directory exists
      const remoteDir = path.posix.dirname(remoteFilePath);
      await sftp.mkdir(remoteDir, true);

      await sftp.fastPut(localFilePath, remoteFilePath);
      console.log(`File uploaded: ${localFilePath} -> ${remoteFilePath}`);
    } catch (error) {
      console.error(`Failed to upload file:`, error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
     * Start watching a local collection for changes and sync to remote
     */
  startWatching(collectionUid, connectionId, remotePath, localPath) {
    if (this.remoteCollections.has(collectionUid)) {
      console.log(`Already watching collection: ${collectionUid}`);
      return;
    }

    const watcher = chokidar.watch(localPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('add', async (filePath) => {
        const relativePath = path.relative(localPath, filePath);
        const remoteFilePath = path.posix.join(remotePath, relativePath.replace(/\\/g, '/'));
        try {
          await this.uploadFile(connectionId, filePath, remoteFilePath);
        } catch (error) {
          console.error(`Failed to sync new file: ${error.message}`);
        }
      })
      .on('change', async (filePath) => {
        const relativePath = path.relative(localPath, filePath);
        const remoteFilePath = path.posix.join(remotePath, relativePath.replace(/\\/g, '/'));
        try {
          await this.uploadFile(connectionId, filePath, remoteFilePath);
        } catch (error) {
          console.error(`Failed to sync changed file: ${error.message}`);
        }
      })
      .on('unlink', async (filePath) => {
        const relativePath = path.relative(localPath, filePath);
        const remoteFilePath = path.posix.join(remotePath, relativePath.replace(/\\/g, '/'));
        try {
          const sftp = sshConnectionManager.getClient(connectionId);
          await sftp.delete(remoteFilePath);
          console.log(`File deleted remotely: ${remoteFilePath}`);
        } catch (error) {
          console.error(`Failed to delete remote file: ${error.message}`);
        }
      });

    this.remoteCollections.set(collectionUid, {
      connectionId,
      remotePath,
      localPath,
      watcher
    });

    console.log(`Started watching collection: ${collectionUid}`);
  }

  /**
     * Stop watching a collection
     */
  async stopWatching(collectionUid) {
    const collection = this.remoteCollections.get(collectionUid);
    if (collection) {
      await collection.watcher.close();
      this.remoteCollections.delete(collectionUid);
      console.log(`Stopped watching collection: ${collectionUid}`);
    }
  }

  /**
     * Get collection info
     */
  getCollectionInfo(collectionUid) {
    return this.remoteCollections.get(collectionUid);
  }

  /**
     * Clean up cache for a collection
     */
  async cleanupCache(collectionUid) {
    await this.stopWatching(collectionUid);
    const localPath = path.join(this.cacheDir, collectionUid);
    if (await fs.pathExists(localPath)) {
      await fs.remove(localPath);
      console.log(`Cache cleaned up for collection: ${collectionUid}`);
    }
  }
}

// Singleton instance
const remoteCollectionHandler = new RemoteCollectionHandler();

module.exports = remoteCollectionHandler;
