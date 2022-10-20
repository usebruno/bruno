const path = require("path");
const { format } = require("url");
const { BrowserWindow, app, Menu } = require("electron");
const { setContentSecurityPolicy } = require("electron-util");

const menuTemplate = require("./app/menu-template");
const registerIpc = require("./ipc");
const isDev = require("electron-is-dev");
const prepareNext = require("electron-next");

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

// Prepare the renderer once the app is ready
app.on("ready", async () => {
  await prepareNext("./renderer");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const url = isDev
    ? "http://localhost:8000"
    : format({
        pathname: path.join(__dirname, "../renderer/out/index.html"),
        protocol: "file:",
        slashes: true,
      });

  mainWindow.loadURL(url);

  // register all ipc handlers
  registerIpc(mainWindow);
});

// Quit the app once all windows are closed
app.on("window-all-closed", app.quit);
