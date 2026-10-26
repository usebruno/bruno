const path = require('path');
const { format, fileURLToPath } = require('url');
const isDev = require('electron-is-dev');

const getAppUrl = () => {
  const devPort = process.env.BRUNO_DEV_PORT || 3000;
  return isDev
    ? `http://localhost:${devPort}`
    : format({
        pathname: path.join(__dirname, '../../web/index.html'),
        protocol: 'file:',
        slashes: true
      });
};

/**
 * True only for the app's own document (dev server origin, or the packaged
 * index.html). Hash/query are ignored so in-app and reload navigations pass.
 */
const isAppUrl = (url, appUrl = getAppUrl()) => {
  try {
    const target = new URL(url);
    const app = new URL(appUrl);
    if (target.protocol !== app.protocol) return false;
    if (app.protocol === 'file:') {
      return path.resolve(fileURLToPath(target)) === path.resolve(fileURLToPath(app));
    }
    return target.origin === app.origin;
  } catch {
    return false;
  }
};

/**
 * Renderer-originated IPC must come from the main frame of the app document.
 * Events without `sender` are internal `ipcMain.emit(...)` calls, not renderer IPC.
 */
const isTrustedSender = (event, appUrl) => {
  if (!event || !event.sender) return true;
  const frame = event.senderFrame;
  return Boolean(frame) && frame === event.sender.mainFrame && isAppUrl(frame.url, appUrl);
};

/**
 * Makes every ipcMain.handle/on listener reject frames that are not the app
 * document, so a navigated-away page can't use the preload bridge.
 */
const restrictIpcToAppFrames = (ipcMain, appUrl) => {
  const originalHandle = ipcMain.handle.bind(ipcMain);
  const originalOn = ipcMain.on.bind(ipcMain);

  ipcMain.handle = (channel, listener) => originalHandle(channel, (event, ...args) => {
    if (!isTrustedSender(event, appUrl)) {
      throw new Error(`Blocked IPC "${channel}" from untrusted frame`);
    }
    return listener(event, ...args);
  });

  ipcMain.on = (channel, listener) => originalOn(channel, (event, ...args) => {
    if (!isTrustedSender(event, appUrl)) return;
    return listener(event, ...args);
  });
};

module.exports = { getAppUrl, isAppUrl, isTrustedSender, restrictIpcToAppFrames };
