const _ = require('lodash');
const path = require('path');
const { ipcMain, shell, app } = require('electron');
const axios = require('axios');

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
    return false;
  }

  let data = response.data;

  cache.latest = {
    version: data.tag_name,
    url: data.html_url,
    body: data.body,
    assets: data.assets.map((val) => {
      return {
        ...parseName(val.name),
        download: val.browser_download_url
      };
    })
  };

  return cache.latest;
}

const registerUpdaterIpc = () => {
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

  ipcMain.handle('renderer:open-latest-release', (event) => {
    shell.openExternal('https://github.com/usebruno/bruno/releases/latest');
  });
};

module.exports = registerUpdaterIpc;
