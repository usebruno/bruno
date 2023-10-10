const _ = require('lodash');
const path = require('path');
const { ipcMain, shell, app } = require('electron');
const axios = require('axios');
const { createWriteStream } = require('fs');
const { join } = require('path');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

// Cache for requests
const cache = {
  version: undefined,
  latest: undefined
};

// Parse arch, os and ext from asset name
function parseName(name) {
  let nameArr = name.split('_');

  return {
    //        shitty code for x86_64
    arch: nameArr[2] == 'x86' ? 'x86_64' : nameArr[2],
    os: nameArr[nameArr.length - 1].split('.')[0],
    ext: nameArr[nameArr.length - 1].split('.')[1]
  };
}

function getCurrentVersion() {
  if (cache.version) {
    return cache.version;
  }

  // Ask electron for local version
  cache.version = app.getVersion();
  return cache.version;
}

async function checkVersion() {
  const latest = await getLatestVersion();
  const current = getCurrentVersion();

  return current == latest.version;
}

// Get latest release via github api
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
    // OOOPS net problems here :)
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

// Download update, open it and exit current process.
async function downloadUpdate(name, url) {
  // Request to github
  const response = await axios({
    url,
    method: 'GET',
    headers: {
      Accept: 'application/octet-stream'
    },
    responseType: 'stream',
    onDownloadProgress: (progressEvent) => {
      // For web progress bar
      mainWindow.webContents.send('main:update-download-progress', progressEvent.progress, progressEvent.estimated);
    }
  });

  // Pipline for save new version
  await pipeline(response.data, createWriteStream(join(app.getAppPath(), name)));

  // Open new version
  await shell.openPath(join(app.getAppPath(), name));

  // Wait and graceful exit.
  setTimeout(() => process.exit(0), 1000);
}

// Parse builds for current os
async function getBuilds() {
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
      // Its a pity, but I wanted to load this into my robot vacuum cleaner
      return [];
    }
  }
}

// Register events
const registerUpdaterIpc = (mainWindow) => {
  // Get current version of electron app ( for sidebar )
  ipcMain.handle('renderer:current-version', (event) => {
    return getCurrentVersion();
  });

  // Compare 2 versions ( local and remote )
  ipcMain.handle('renderer:check-version', async (event) => {
    return await checkVersion();
  });

  // Get latest release
  ipcMain.handle('renderer:get-latest-version', async (event) => {
    return await getLatestVersion();
  });

  // Get builds for current os
  ipcMain.handle('renderer:get-builds', async (event) => {
    return await getBuilds();
  });

  // Download update
  ipcMain.handle('renderer:download-update', async (event, name, url) => {
    return await downloadUpdate(name, url);
  });

  // Open latest release
  // NOTE @qweme32: Not used.
  ipcMain.handle('renderer:open-latest-release', (event) => {
    shell.openExternal('https://github.com/usebruno/bruno/releases/latest');
  });
};

module.exports = registerUpdaterIpc;
