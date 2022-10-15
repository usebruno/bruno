const path = require('path');
const isDev = require('electron-is-dev');
const { format } = require('url');
const { BrowserWindow, app, Menu } = require('electron');
const { setContentSecurityPolicy } = require('electron-util');

const menuTemplate = require('./app/menu-template');
const registerNetworkIpc = require('./ipc/network');
const registerLocalCollectionsIpc = require('./ipc/local-collection');
const Watcher = require('./app/watcher');

setContentSecurityPolicy(`
	default-src * 'unsafe-inline' 'unsafe-eval';
	script-src * 'unsafe-inline' 'unsafe-eval';
	connect-src * 'unsafe-inline';
	base-uri 'none';
	form-action 'none';
	frame-ancestors 'none';
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
      preload: path.join(__dirname, "preload.js")
    },
  });

  const url = isDev
    ? 'http://localhost:3000'
    : format({
        pathname: path.join(__dirname, '../packages/bruno-app/out/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(url);
  watcher = new Watcher();

  // register all ipc handlers
  registerNetworkIpc(mainWindow, watcher);
  registerLocalCollectionsIpc(mainWindow, watcher);
});

// Quit the app once all windows are closed
app.on('window-all-closed', app.quit);
