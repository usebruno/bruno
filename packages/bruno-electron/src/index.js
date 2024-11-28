const fs = require('fs');
const path = require('path');
const isDev = require('electron-is-dev');
const { produce } = require('immer');

if (isDev) {
  if (!fs.existsSync(path.join(__dirname, '../../bruno-js/src/sandbox/bundle-browser-rollup.js'))) {
    console.log('JS Sandbox libraries have not been bundled yet');
    console.log('Please run the below command \nnpm run sandbox:bundle-libraries --workspace=packages/bruno-js');
    throw new Error('JS Sandbox libraries have not been bundled yet');
  }
}

const { format } = require('url');
const { BrowserWindow, app, Menu, ipcMain } = require('electron');
const { setContentSecurityPolicy } = require('electron-util');

const menuTemplate = require('./app/menu-template');
const { openCollection } = require('./app/collections');
const LastOpenedCollections = require('./store/last-opened-collections');
const registerNetworkIpc = require('./ipc/network');
const registerCollectionsIpc = require('./ipc/collection');
const { registerPreferencesIpc, initRendererIpc } = require('./ipc/preferences');
const Watcher = require('./app/watcher');
const { loadWindowState, saveBounds, saveMaximized } = require('./utils/window');
const registerNotificationsIpc = require('./ipc/notifications');
const registerGlobalEnvironmentsIpc = require('./ipc/global-environments');

const lastOpenedCollections = new LastOpenedCollections();

let isMainWindowClosed = false;

// Create an Immer proxy state to store mainWindow
let state = {
  mainWindow: null,
};

// Proxy to dynamically forward all properties and methods to the current mainWindow
let mainWindow = new Proxy({}, {
  get(target, prop) {
    if (!state.mainWindow) {
      throw new Error(`mainWindow is not set. cannot access property '${prop}'`);
    }
    const value = Reflect.get(state.mainWindow, prop);
    if (typeof value === 'function') {
      return value.bind(state.mainWindow);
    }
    return value;
  },
  set() {
    throw new Error("use 'setMainWindow()' function to update mainWindow.");
  }
});

function setMainWindow(newWindow) {
  state = produce(state, (draft) => {
    draft.mainWindow = newWindow;
  });
}

// Reference: https://content-security-policy.com/
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src * 'unsafe-inline' 'unsafe-eval'",
  "connect-src * 'unsafe-inline'",
  "font-src 'self' https:",
  // this has been commented out to make oauth2 work
  // "form-action 'none'",
  // we make an exception and allow http for images so that
  // they can be used as link in the embedded markdown editors
  "img-src 'self' blob: data: http: https:",
  "media-src 'self' blob: data: https:",
  "style-src 'self' 'unsafe-inline' https:"
];

setContentSecurityPolicy(contentSecurityPolicy.join(';') + ';');

const menu = Menu.buildFromTemplate(menuTemplate);
let watcher;
let ipcsRegistered = false;

const createWindow = () => {
  Menu.setApplicationMenu(menu);
  const { maximized, x, y, width, height } = loadWindowState();

  let _mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    title: 'Bruno',
    icon: path.join(__dirname, 'about/256x256.png')
    // we will bring this back
    // see https://github.com/usebruno/bruno/issues/440
    // autoHideMenuBar: true
  });

  setMainWindow(_mainWindow);
  isMainWindowClosed = false;

  if (maximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  const url = isDev
    ? 'http://localhost:3000'
    : format({
        pathname: path.join(__dirname, '../web/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(url).catch((reason) => {
    console.error(`Error: Failed to load URL: "${url}" (Electron shows a blank screen because of this).`);
    console.error('Original message:', reason);
    if (isDev) {
      console.error(
        'Could not connect to Next.Js dev server, is it running?' +
          ' Start the dev server using "npm run dev:web" and restart electron'
      );
    } else {
      console.error(
        'If you are using an official production build: the above error is most likely a bug! ' +
          ' Please report this under: https://github.com/usebruno/bruno/issues'
      );
    }
  });
  watcher = new Watcher();

  const handleBoundsChange = () => {
    if (!mainWindow.isMaximized()) {
      saveBounds(mainWindow);
    }
  };

  mainWindow.on('resize', handleBoundsChange);
  mainWindow.on('move', handleBoundsChange);

  mainWindow.on('maximize', () => saveMaximized(true));
  mainWindow.on('unmaximize', () => saveMaximized(false));
  mainWindow.on('close', (e) => {
    e.preventDefault();
    ipcMain.emit('main:start-quit-flow');
    isMainWindowClosed = true;
  });

  mainWindow.webContents.on('will-redirect', (event, url) => {
    event.preventDefault();
    if (/^(http:\/\/|https:\/\/)/.test(url)) {
      require('electron').shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url);
      if (['https:', 'http:'].includes(protocol)) {
        require('electron').shell.openExternal(url);
      }
    } catch (e) {
      console.error(e);
    }
    return { action: 'deny' };
  });

  initRendererIpc(mainWindow, watcher, lastOpenedCollections);

  if(ipcsRegistered) return;

  // register all ipc handlers
  registerNetworkIpc(mainWindow);
  registerGlobalEnvironmentsIpc(mainWindow);
  registerCollectionsIpc(mainWindow, watcher, lastOpenedCollections);
  registerPreferencesIpc(mainWindow, watcher, lastOpenedCollections);
  registerNotificationsIpc();
  ipcsRegistered = true;
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !isMainWindowClosed) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.on('ready', createWindow);

  app.on('activate', () => {
    if (isMainWindowClosed) {
      createWindow();
    }

    if (process.platform !== 'darwin') {
      if (mainWindow && !isMainWindowClosed) {
        mainWindow?.show?.();
        mainWindow?.focus?.();
      }
    }
  });

  // Quit the app once all windows are closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Open collection from Recent menu (#1521)
  app.on('open-file', (event, path) => {
    openCollection(mainWindow, watcher, path);
  });

}