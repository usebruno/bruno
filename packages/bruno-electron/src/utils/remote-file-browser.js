const sshConnectionManager = require('./ssh-connection-manager');
const path = require('path');

/**
 * Browse remote directories via SFTP
 */
async function listRemoteDirectory(connectionId, remotePath) {
  const sftp = sshConnectionManager.getClient(connectionId);

  try {
    // Resolve path if it is '.' to get the absolute path
    let resolvedPath = remotePath;
    if (remotePath === '.') {
      resolvedPath = await sftp.realPath('.');
    }

    const list = await sftp.list(resolvedPath);

    // Transform to a more usable format
    return list.map((item) => ({
      name: item.name,
      path: path.posix.join(resolvedPath, item.name),
      type: item.type === 'd' ? 'directory' : 'file',
      size: item.size,
      modifyTime: item.modifyTime,
      isCollection: false // Will be determined separately
    }));
  } catch (error) {
    console.error(`Failed to list directory ${remotePath}:`, error.message);
    throw new Error(`Failed to list directory: ${error.message}`);
  }
}

/**
 * Check if a remote path exists
 */
async function remotePathExists(connectionId, remotePath) {
  const sftp = sshConnectionManager.getClient(connectionId);

  try {
    await sftp.stat(remotePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a directory is a Bruno collection
 * A Bruno collection contains either bruno.json or collection.yml
 */
async function isBrunoCollection(connectionId, remotePath) {
  const sftp = sshConnectionManager.getClient(connectionId);

  try {
    const files = await sftp.list(remotePath);
    const fileNames = files.map((f) => f.name);

    return fileNames.includes('bruno.json') || fileNames.includes('collection.yml');
  } catch (error) {
    return false;
  }
}

/**
 * Get collection metadata
 */
async function getCollectionMetadata(connectionId, remotePath) {
  const sftp = sshConnectionManager.getClient(connectionId);

  try {
    // Try to read bruno.json first
    const brunoJsonPath = path.posix.join(remotePath, 'bruno.json');
    if (await remotePathExists(connectionId, brunoJsonPath)) {
      const content = await sftp.get(brunoJsonPath);
      return JSON.parse(content.toString());
    }

    // Try collection.yml
    const collectionYmlPath = path.posix.join(remotePath, 'collection.yml');
    if (await remotePathExists(connectionId, collectionYmlPath)) {
      // For now, just return basic info
      // Full YAML parsing would require additional dependencies
      return {
        name: path.basename(remotePath),
        format: 'yml'
      };
    }

    throw new Error('Collection metadata file not found');
  } catch (error) {
    console.error(`Failed to get collection metadata:`, error.message);
    throw new Error(`Failed to get collection metadata: ${error.message}`);
  }
}

/**
 * Browse and identify Bruno collections in a directory
 */
async function browseWithCollectionInfo(connectionId, remotePath) {
  const items = await listRemoteDirectory(connectionId, remotePath);

  // Check each directory to see if it's a collection
  const itemsWithCollectionInfo = await Promise.all(items.map(async (item) => {
    if (item.type === 'directory') {
      item.isCollection = await isBrunoCollection(connectionId, item.path);
    }
    return item;
  }));

  return itemsWithCollectionInfo;
}

module.exports = {
  listRemoteDirectory,
  remotePathExists,
  isBrunoCollection,
  getCollectionMetadata,
  browseWithCollectionInfo
};
