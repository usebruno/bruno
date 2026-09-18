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

  ipcMain.handle(CHANNELS.READ, async (_event, bodyRef, options = {}) => {
    const stat = store.getStat(bodyRef);
    if (stat.size > VIEW_MAX_BYTES) {
      throw new BodyTooLargeForViewError(bodyRef, stat.size, VIEW_MAX_BYTES);
    }

    const buf = await store.readRange(bodyRef, 0, stat.size);
    const payload = {
      size: stat.size,
      contentType: stat.contentType || null
    };

    // base64 keeps raw bytes for example save / sniffing; utf8 is the View path.
    if (options?.encoding === 'base64') {
      payload.dataBuffer = buf.toString('base64');
    } else {
      payload.data = buf.toString('utf8');
    }

    return payload;
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
