const Store = require('electron-store');

class ElectronStoreWrapper {
  constructor({ name, clearInvalidConfig }) {
    this.store = new Store({
      name,
      clearInvalidConfig
    });
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  delete(key) {
    this.store.delete(key);
  }
}

module.exports = ElectronStoreWrapper;
