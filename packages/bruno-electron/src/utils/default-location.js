const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

/**
 * Returns the default location where new workspaces and collections are stored.
 * Uses ~/Documents/bruno if available, otherwise falls back to the app's data directory
 */
function resolveDefaultLocation() {
  let resolvedPath;

  try {
    const documentsPath = app.getPath('documents');
    fs.accessSync(documentsPath, fs.constants.W_OK);
    resolvedPath = path.join(documentsPath, 'bruno');
  } catch (error) {
    // Documents not available or not writable, fall back to userData
    resolvedPath = app.getPath('userData');
  }

  try {
    fs.mkdirSync(resolvedPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create default location directory:', error.message);
  }

  return resolvedPath;
}

module.exports = { resolveDefaultLocation };
