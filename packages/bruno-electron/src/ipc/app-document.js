const { ipcMain } = require('electron');

const MAX_OWNER_KEY_LENGTH = 1024;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

/**
 * Publishes an app's guest document and returns the `bruno-app://` URL the
 * renderer should point its <webview> at.
 */
const registerAppDocument = (appDocuments, payload) => {
  const { ownerKey, html } = payload || {};

  if (typeof ownerKey !== 'string' || !ownerKey.length) {
    throw new Error('ownerKey must be a non-empty string');
  }
  if (ownerKey.length > MAX_OWNER_KEY_LENGTH) {
    throw new Error(`ownerKey must not exceed ${MAX_OWNER_KEY_LENGTH} characters`);
  }
  if (typeof html !== 'string') {
    throw new Error('html must be a string');
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error(`html must not exceed ${MAX_HTML_BYTES / 1024 / 1024} MB`);
  }

  return appDocuments.register(ownerKey, html);
};

const unregisterAppDocument = (appDocuments, payload) => {
  const { ownerKey } = payload || {};

  if (typeof ownerKey !== 'string' || !ownerKey.length) {
    throw new Error('ownerKey must be a non-empty string');
  }

  appDocuments.unregister(ownerKey);
};

const registerAppDocumentIpc = (appDocuments, mainWindow) => {
  // Documents are keyed on predictable ownerKeys, so registration is limited
  // to the main window's renderer — any other WebContents (a guest, a child
  // window) must not be able to evict or replace another app's document.
  const assertMainWindowSender = (event) => {
    if (event.sender !== mainWindow.webContents) {
      throw new Error('app documents can only be managed by the main window');
    }
  };

  ipcMain.handle('renderer:register-app-document', (event, payload) => {
    assertMainWindowSender(event);
    return registerAppDocument(appDocuments, payload);
  });

  ipcMain.handle('renderer:unregister-app-document', (event, payload) => {
    assertMainWindowSender(event);
    return unregisterAppDocument(appDocuments, payload);
  });
};

module.exports = registerAppDocumentIpc;
module.exports.registerAppDocument = registerAppDocument;
module.exports.unregisterAppDocument = unregisterAppDocument;
module.exports.registerAppDocumentIpc = registerAppDocumentIpc;
