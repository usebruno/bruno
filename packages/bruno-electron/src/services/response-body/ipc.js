const { ipcMain } = require('electron');
const { chooseFileToSave } = require('../../utils/filesystem');
const { resolveResponseSaveDefaultPath } = require('../../utils/response-save-filename');
const { VIEW_MAX_BYTES } = require('./constants');
const { BodyTooLargeForViewError } = require('./errors');

const CHANNELS = {
  SAVE: 'renderer:response-body-save',
  READ: 'renderer:response-body-read',
  PIN: 'renderer:response-body-pin',
  RELEASE: 'renderer:response-body-release'
};

const registerResponseBodyIpc = (mainWindow, store) => {
  ipcMain.handle(CHANNELS.PIN, async (_event, bodyRef) => {
    return store.pin(bodyRef);
  });

  ipcMain.handle(CHANNELS.RELEASE, async (_event, pinIdOrBodyRef) => {
    await store.release(pinIdOrBodyRef);
    return { success: true };
  });

  ipcMain.handle(CHANNELS.READ, async (_event, bodyRef) => {
    const stat = store.getStat(bodyRef);
    if (stat.size > VIEW_MAX_BYTES) {
      throw new BodyTooLargeForViewError(bodyRef, stat.size, VIEW_MAX_BYTES);
    }

    const buf = await store.readRange(bodyRef, 0, stat.size);
    return {
      data: buf.toString('utf8'),
      size: stat.size,
      contentType: stat.contentType || null
    };
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
