const fs = require('node:fs/promises');
const path = require('node:path');
const { app } = require('electron');

const isProcessRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

const shouldDeleteDirectory = (name) => {
  if (!/^\d+$/.test(name)) return true;
  const pid = Number(name);
  return pid === process.pid || !isProcessRunning(pid);
};

class TransientManager {
  getRootDirectory() {
    return path.join(app.getPath('userData'), 'tmp', 'transient');
  }

  getDirectoryBase() {
    return path.join(this.getRootDirectory(), String(process.pid));
  }

  async clearStale() {
    const root = this.getRootDirectory();
    let entries;
    try {
      entries = await fs.readdir(root);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('[transient] failed to read the transient directory', error);
      }
      return;
    }

    await Promise.all(entries.filter(shouldDeleteDirectory).map(async (name) => {
      try {
        await fs.rm(path.join(root, name), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (error) {
        console.warn(`[transient] failed to remove stale transient directory ${name}`, error);
      }
    }));
  }
}

const transientManager = new TransientManager();

module.exports = { TransientManager, transientManager };
