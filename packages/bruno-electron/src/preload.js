const { ipcRenderer, contextBridge, webUtils } = require('electron');
const fs = require('fs');
const path = require('path');

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
  existsSync(filePath, options) {
    return fs.existsSync(filePath, options);
  },
  getRelativePath(absolutePath, basePath) {
    try {
      return path.relative(basePath, absolutePath);
    } catch (error) {
      return absolutePath;
    }
  },
  resolvePath(relativePath, basePath) {
    try {
      return path.resolve(basePath, relativePath);
    } catch (error) {
      return relativePath;
    }
  }
});
