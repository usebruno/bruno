const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

class TransientManager {
  getDirectoryBase() {
    return path.join(app.getPath('userData'), 'tmp', 'transient');
  }

  clear() {
    try {
      fs.rmSync(this.getDirectoryBase(), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      console.warn('[transient] failed to clear the transient directory', error);
    }
  }
}

const transientManager = new TransientManager();

module.exports = { TransientManager, transientManager };
