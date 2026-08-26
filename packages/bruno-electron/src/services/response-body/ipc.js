const { ipcMain } = require('electron');
const { chooseFileToSave } = require('../../utils/filesystem');
const { resolveResponseSaveDefaultPath } = require('../../utils/response-save-filename');

const CHANNELS = {
  STAT: 'renderer:response-body-stat',
  READ: 'renderer:response-body-read',
  SAVE: 'renderer:response-body-save',
  PIN: 'renderer:response-body-pin',
  RELEASE: 'renderer:response-body-release'
};

const registerResponseBodyIpc = (mainWindow, store) => {
  ipcMain.handle(CHANNELS.STAT, async (_event, bodyRef) => {
    return store.getStat(bodyRef);
  });

  ipcMain.handle(CHANNELS.READ, async (_event, bodyRef, offset, length) => {
    const buf = await store.readRange(bodyRef, offset, length);
    return buf.toString('base64');
  });

  ipcMain.handle(CHANNELS.PIN, async (_event, bodyRef) => {
    return store.pin(bodyRef);
  });

  ipcMain.handle(CHANNELS.RELEASE, async (_event, pinIdOrBodyRef) => {
    await store.release(pinIdOrBodyRef);
    return { success: true };
  });

  ipcMain.handle(CHANNELS.SAVE, async (_event, { bodyRef, url, pathname, headers } = {}) => {
    try {
      store.getStat(bodyRef);
    } catch (err) {
      return Promise.reject(err);
    }

    const defaultPath = resolveResponseSaveDefaultPath({ headers, url, pathname });
    const filePath = await chooseFileToSave(mainWindow, defaultPath);

    if (!filePath) {
      return { success: false, cancelled: true };
    }

    await store.saveToPath(bodyRef, filePath);
    return { success: true, filePath };
  });

  return CHANNELS;
};

module.exports = {
  CHANNELS,
  registerResponseBodyIpc
};
