const path = require('path');
const isDev = require('electron-is-dev');
const { format } = require('url');
const { BrowserWindow, app, Menu } = require('electron');
const { setContentSecurityPolicy } = require('electron-util');

const menuTemplate = require('./app/menu-template');
const LastOpenedCollections = require('./app/last-opened-collections');
const registerNetworkIpc = require('./ipc/network');
const registerCollectionsIpc = require('./ipc/collection');
const Watcher = require('./app/watcher');

const lastOpenedCollections = new LastOpenedCollections();

setContentSecurityPolicy(`
	default-src * 'unsafe-inline' 'unsafe-eval';
	script-src * 'unsafe-inline' 'unsafe-eval';
	connect-src * 'unsafe-inline';
	base-uri 'none';
	form-action 'none';
  img-src 'self' data:image/svg+xml;
`);

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

let mainWindow;
let watcher;

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const url = isDev
    ? 'http://localhost:3000'
    : format({
        pathname: path.join(__dirname, '../web/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(url);
  watcher = new Watcher();

  mainWindow.webContents.on('new-window', function (e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });

  // register all ipc handlers
  registerNetworkIpc(mainWindow, watcher, lastOpenedCollections);
  registerCollectionsIpc(mainWindow, watcher, lastOpenedCollections);
});

// Quit the app once all windows are closed
app.on('window-all-closed', app.quit);
