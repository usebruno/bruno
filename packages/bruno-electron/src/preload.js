const { ipcRenderer, contextBridge, webUtils } = require('electron');

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
  getFilePath (file) {
    const path = webUtils.getPathForFile(file)
    return path;
  }
});
