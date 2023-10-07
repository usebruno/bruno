const _ = require('lodash');
const Store = require('electron-store');

class WindowStateStore {
  constructor() {
    this.store = new Store({
      name: 'window-state',
      clearInvalidConfig: true
    });
  }

  getBounds() {
    return this.store.get('window-bounds') || {};
  }

  setBounds(bounds) {
    this.store.set('window-bounds', bounds);
  }
}

module.exports = WindowStateStore;
