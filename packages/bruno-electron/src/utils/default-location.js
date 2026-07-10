const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const CURLY_CATS_DIR = path.join('C:', 'LOGICIELS', 'Curly-CATS');

/**
 * Returns the default location where new workspaces and collections are stored.
 * Uses C:\LOGICIELS\Curly-CATS as the primary location, otherwise falls back to the app's data directory
 */
function resolveDefaultLocation() {
  const defaultPaths = [
    CURLY_CATS_DIR,
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
