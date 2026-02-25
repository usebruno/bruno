const Store = require('electron-store');

/**
 * The app snapshot is stored in the electron store 'app-snapshot.json'.
 * This stores the user's session state including workspaces, collections,
 * tabs, and DevTools state for restoration on app restart.
 */

class AppSnapshotStore {
  constructor() {
    this.store = new Store({
      name: 'app-snapshot',
      clearInvalidConfig: true
    });
  }

  getSnapshot() {
    return this.store.get('snapshot') || null;
  }

  saveSnapshot(snapshot) {
    this.store.set('snapshot', snapshot);
    this.store.set('lastSaved', Date.now());
  }
}

const appSnapshotStore = new AppSnapshotStore();

const getAppSnapshot = () => {
  return appSnapshotStore.getSnapshot();
};

const saveAppSnapshot = (snapshot) => {
  return appSnapshotStore.saveSnapshot(snapshot);
};

module.exports = {
  getAppSnapshot,
  saveAppSnapshot
};
