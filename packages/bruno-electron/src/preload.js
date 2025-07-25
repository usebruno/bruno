const { ipcRenderer, contextBridge, webUtils } = require('electron');
const fs = require('fs');
const path = require('path');
const { normalizeAndResolvePath, isFile } = require('./utils/filesystem');

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, handler) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => handler(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getFilePath(file) {
    const path = webUtils.getPathForFile(file);
    return path;
  },
  existsSync(filePath) {
    const normalizedPath = normalizeAndResolvePath(filePath);
    return isFile(normalizedPath);
  },
  resolvePath(relativePath, basePath) {
    try {
      const resolvedPath = path.resolve(basePath, relativePath);
      return normalizeAndResolvePath(resolvedPath);
    } catch (error) {
      return relativePath;
    }
  }
});
