// Native
const { join } = require('path');
const { format } = require('url');
const axios = require('axios');

// Packages
const { BrowserWindow, app, ipcMain } = require('electron');
const isDev = require('electron-is-dev');
const prepareNext = require('electron-next');

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  await prepareNext('./renderer');

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: join(__dirname, 'preload.js'),
    },
  });

  const url = isDev
    ? 'http://localhost:8000'
    : format({
        pathname: join(__dirname, '../renderer/out/index.html'),
        protocol: 'file:',
        slashes: true,
      })

  mainWindow.loadURL(url);
});

// Quit the app once all windows are closed
app.on('window-all-closed', app.quit);

// listen the channel `message` and resend the received message to the renderer process
ipcMain.on('message', (event, message) => {
  event.sender.send('message', message);
});

// handler for all request related to a user's grafnode account
ipcMain.handle('grafnode-account-request', async (_, request) => {
  const result = await axios(request)
  return { data: result.data, status: result.status }
})

// handler for sending http request
ipcMain.handle('send-http-request', async (_, request) => {
  try {
    const result = await axios(request);

    return {
      status: result.status,
      headers: result.headers,
      data: result.data
    };
  } catch (error) {
    if(error.response) {
      return {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      };
    }

    return {
      status: -1,
      headers: [],
      data: null
    };
  }
})
