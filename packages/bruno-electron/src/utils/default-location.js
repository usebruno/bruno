const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const BRUNO_DIR_NAME = 'bruno';

/**
 * Returns the default location where new workspaces and collections are stored.
 * Checks ~/Documents/bruno if available, otherwise falls back to the app's data directory
 */
function resolveDefaultLocation() {
  const defaultPaths = [
    path.join(app.getPath('documents'), BRUNO_DIR_NAME),
    app.getPath('userData')
  ];

  for (const dirPath of defaultPaths) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return dirPath;
    } catch (error) {
      console.warn(`Failed to create directory at ${dirPath}:`, error.message);
    }
  }

  throw new Error('Failed to create default location');
}

module.exports = { resolveDefaultLocation };
