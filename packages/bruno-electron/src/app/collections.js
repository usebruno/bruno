const { uuid } = require('../utils/common');
const { dialog } = require('electron');
const { isDirectory, normalizeAndResolvePath } = require('../utils/filesystem');

const openCollection = async (win, watcher) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (filePaths && filePaths[0]) {
    const resolvedPath = normalizeAndResolvePath(filePaths[0]);
    if (isDirectory(resolvedPath)) {
      if(!watcher.hasWatcher(resolvedPath)) {
        const uid = uuid();
        win.webContents.send('main:collection-opened', resolvedPath, uid);
        watcher.addWatcher(win, resolvedPath, uid);
      } else {
        win.webContents.send('main:collection-already-opened', resolvedPath);
      }
    } else {
      console.error(`[ERROR] Cannot open unknown folder: "${resolvedPath}"`);
    }
  }
};

module.exports = {
  openCollection
};
