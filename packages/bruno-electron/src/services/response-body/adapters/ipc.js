const { ipcMain } = require('electron');
const path = require('node:path');
const contentDispositionParser = require('content-disposition');
const mime = require('mime-types');
const { chooseFileToSave } = require('../../../utils/filesystem');

const CHANNELS = {
  STAT: 'renderer:response-body-stat',
  READ: 'renderer:response-body-read',
  SAVE: 'renderer:response-body-save',
  PIN: 'renderer:response-body-pin',
  RELEASE: 'renderer:response-body-release'
};

/**
 * Register IPC handlers for response-body client. Dialog stays at this edge.
 */
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

    const getHeaderValue = (headerName) => {
      const headersObj = headers && typeof headers === 'object' ? headers : {};
      const headersArray = Object.entries(headersObj);
      if (headersArray.length > 0) {
        const header = headersArray.find(([name]) => name === headerName);
        if (header && header.length > 1) {
          return header[1];
        }
      }
    };

    const getFileNameFromContentDispositionHeader = () => {
      const contentDisposition = getHeaderValue('content-disposition');
      try {
        const disposition = contentDispositionParser.parse(contentDisposition);
        return disposition && disposition.parameters['filename'];
      } catch (_) {
        /* ignore */
      }
    };

    const getFileNameFromUrlPath = () => {
      try {
        const lastPathLevel = new URL(url).pathname.split('/').pop();
        if (lastPathLevel && /\..+/.exec(lastPathLevel)) {
          return lastPathLevel;
        }
      } catch (_) {
        /* ignore */
      }
    };

    const getFileNameBasedOnContentTypeHeader = () => {
      const contentType = getHeaderValue('content-type');
      const extension = (contentType && mime.extension(contentType)) || 'txt';
      return `response.${extension}`;
    };

    const fileName
      = getFileNameFromContentDispositionHeader() || getFileNameFromUrlPath() || getFileNameBasedOnContentTypeHeader();
    const dirPath = pathname ? path.dirname(pathname) : undefined;
    const defaultPath = dirPath ? path.join(dirPath, fileName) : fileName;
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
