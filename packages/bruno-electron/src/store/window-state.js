const _ = require('lodash');
const Store = require('electron-store');

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 768;

class WindowStateStore {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
  }

  getBounds() {
    return (
      this.store.get('window-bounds') || {
        x: 0,
        y: 0,
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT
      }
    );
  }

  setBounds(bounds) {
    this.store.set('window-bounds', bounds);
  }
}

module.exports = WindowStateStore;
