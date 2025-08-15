const Store = require('electron-store');
const { app } = require('electron');
const path = require('path');

const getResourcesPath = () => {
  if (app.isPackaged) {
    return process.resourcesPath;
  } else { // dev
    return path.join(app.getAppPath(), "resources");
  }
};

class UserDataStore {
  constructor() {
    const cwd = getResourcesPath();
    this.store = new Store({
      name: 'user-data',
      cwd,
      clearInvalidConfig: true
    });
    console.log(`App path is: ${app.getAppPath()}`);
    console.log(`Resources path is: ${cwd}`);
    console.log(`User data file is located at: ${this.store.path}`);
  }

  setUserDataPath(newPath) {
    this.store.set('userDataPath', newPath);
  }

  getUserDataPath() {
    return this.store.get('userDataPath');
  }
}

const userDataStore = new UserDataStore();

const userDataUtil = {
  getUserDataPath: () => {
    return userDataStore.getUserDataPath();
  },
  setUserDataPath: (newPath) => {
    userDataStore.setUserDataPath(newPath);
  }
};

module.exports = { userDataUtil };
