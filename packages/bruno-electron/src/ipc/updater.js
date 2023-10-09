const _ = require('lodash');
const path = require('path');
const { ipcMain, shell, app } = require('electron');
const axios = require('axios');
const { createWriteStream } = require('fs');
const { join } = require('path');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

const cache = {
  version: undefined,
  latest: undefined
};

function parseName(name) {
  let nameArr = name.split('_');

  return {
    arch: nameArr[2] == 'x86' ? 'x86_64' : nameArr[2],
    os: nameArr[nameArr.length - 1].split('.')[0],
    ext: nameArr[nameArr.length - 1].split('.')[1]
  };
}

function getCurrentVersion() {
  if (cache.version) {
    return cache.version;
  }

  cache.version = app.getVersion();
  return cache.version;
}

async function checkVersion() {
  const latest = await getLatestVersion();
  const current = getCurrentVersion();

  return current == latest.version;
}

async function getLatestVersion() {
  if (cache.latest) {
    return cache.latest;
  }

  let response;
  try {
    response = await axios({
      method: 'GET',
      url: 'https://api.github.com/repos/usebruno/bruno/releases/latest'
    });
  } catch {
    return {
      version: 'v0.0.0',
      url: undefined,
      body: 'Error while parsing github.',
      assets: []
    };
  }

  let data = response.data;

  cache.latest = {
    version: data.tag_name,
    url: data.html_url,
    body: data.body,
    assets: data.assets.map((val) => {
      return {
        ...parseName(val.name),
        name: val.name,
        download: val.browser_download_url
      };
    })
  };

  return cache.latest;
}

const registerUpdaterIpc = (mainWindow) => {
  // Get current version of electron app ( for sidebar )
  ipcMain.handle('renderer:current-version', (event) => {
    return getCurrentVersion();
  });

  ipcMain.handle('renderer:check-version', async (event) => {
    return await checkVersion();
  });

  ipcMain.handle('renderer:get-latest-version', async (event) => {
    return await getLatestVersion();
  });

  ipcMain.handle('renderer:get-builds', async (event) => {
    await getLatestVersion();
    switch (process.platform) {
      case 'darwin': {
        return cache.latest.assets.filter((val) => {
          return val.os == 'mac';
        });
      }

      case 'win32': {
        return cache.latest.assets.filter((val) => {
          return val.os == 'win';
        });
      }

      case 'linux': {
        return cache.latest.assets.filter((val) => {
          return val.os == 'linux';
        });
      }

      default: {
        return [];
      }
    }
  });

  ipcMain.handle('renderer:download-update', async (event, name, url) => {
    console.log('Test:', url);
    const response = await axios({
      url,
      timeout: 20000,
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream'
      },
      responseType: 'stream', // Set responseType to 'stream' for binary data
      onDownloadProgress: (progressEvent) => {
        mainWindow.webContents.send('main:update-download-progress', progressEvent.progress, progressEvent.estimated);
      }
    });

    await pipeline(response.data, createWriteStream(join(app.getAppPath(), name)));
    await shell.openPath(join(app.getAppPath(), name));

    setTimeout(() => process.exit(0), 1000);
  });

  ipcMain.handle('renderer:open-latest-release', (event) => {
    shell.openExternal('https://github.com/usebruno/bruno/releases/latest');
  });
};

module.exports = registerUpdaterIpc;
