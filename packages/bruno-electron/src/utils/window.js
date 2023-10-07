const WindowStateStore = require('../store/window-state');

const windowStateStore = new WindowStateStore();

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 768;

const loadWindowState = () => {
  const bounds = windowStateStore.getBounds();

  return {
    x: bounds.x || undefined,
    y: bounds.y || undefined,
    width: bounds.width || DEFAULT_WINDOW_WIDTH,
    height: bounds.height || DEFAULT_WINDOW_HEIGHT
  };
};

const saveWindowState = (window) => {
  const bounds = window.getBounds();

  windowStateStore.setBounds(bounds);
};

module.exports = {
  loadWindowState,
  saveWindowState
};
