const path = require('path');
const isDev = require('electron-is-dev');
const { format } = require('url');
const { BrowserWindow, app, Menu } = require('electron');
const { setContentSecurityPolicy } = require('electron-util');

const menuTemplate = require('./app/menu-template');
const LastOpenedCollections = require('./store/last-opened-collections');
const registerNetworkIpc = require('./ipc/network');
const registerCollectionsIpc = require('./ipc/collection');
const registerPreferencesIpc = require('./ipc/preferences');
const Watcher = require('./app/watcher');
const { loadWindowState, saveBounds, saveMaximized } = require('./utils/window');

const lastOpenedCollections = new LastOpenedCollections();

const contentSecurityPolicy = [
  isDev ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'" : "default-src 'self'",
  "connect-src 'self' https://api.github.com/repos/usebruno/bruno",
  "form-action 'none'",
  "img-src 'self' blob: data:"
];

setContentSecurityPolicy(contentSecurityPolicy.join(';'));

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

let mainWindow;
let watcher;

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  const { maximized, x, y, width, height } = loadWindowState();

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 1000,
    minHeight: 640,
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

  if (maximized) {
    mainWindow.maximize();
  }

  const url = isDev
    ? 'http://localhost:3000'
    : format({
        pathname: path.join(__dirname, '../web/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(url);
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

  mainWindow.webContents.on('new-window', function (e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });

  // register all ipc handlers
  registerNetworkIpc(mainWindow);
  registerCollectionsIpc(mainWindow, watcher, lastOpenedCollections);
  registerPreferencesIpc(mainWindow, watcher, lastOpenedCollections);
});

// Quit the app once all windows are closed
app.on('window-all-closed', app.quit);
