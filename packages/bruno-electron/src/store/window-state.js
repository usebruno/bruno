const Store = require('electron-store');

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 768;

const DEFAULT_MAXIMIZED = false;

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

  getMaximized() {
    return this.store.get('maximized') || DEFAULT_MAXIMIZED;
  }

  setMaximized(isMaximized) {
    this.store.set('maximized', isMaximized);
  }

  getThemeMode() {
    return this.store.get('themeMode') || 'system';
  }

  setThemeMode(mode) {
    this.store.set('themeMode', mode);
  }

  getThemeBg() {
    return this.store.get('themeBg') || '#ffffff';
  }

  setThemeBg(bg) {
    this.store.set('themeBg', bg);
  }
}

module.exports = WindowStateStore;
