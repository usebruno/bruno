const { screen } = require('electron');
const WindowStateStore = require('../store/window-state');

const windowStateStore = new WindowStateStore();

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 768;

const loadWindowState = () => {
  const maximized = windowStateStore.getMaximized();
  const bounds = windowStateStore.getBounds();

  const positionValid = isPositionValid(bounds);
  const sizeValid = isSizeValid(bounds);

  return {
    maximized,
    x: bounds.x && positionValid ? bounds.x : undefined,
    y: bounds.y && positionValid ? bounds.y : undefined,
    width: bounds.width && sizeValid ? bounds.width : DEFAULT_WINDOW_WIDTH,
    height: bounds.height && sizeValid ? bounds.height : DEFAULT_WINDOW_HEIGHT
  };
};

const saveBounds = (window) => {
  const bounds = window.getBounds();

  windowStateStore.setBounds(bounds);
};

const saveMaximized = (isMaximized) => {
  windowStateStore.setMaximized(isMaximized);
};

const isPositionValid = (bounds) => {
  const area = getArea(bounds);

  return (
    bounds.x >= area.x &&
    bounds.y >= area.y &&
    bounds.x + bounds.width <= area.x + area.width &&
    bounds.y + bounds.height <= area.y + area.height
  );
};

const isSizeValid = (bounds) => {
  const area = getArea(bounds);

  return bounds.width <= area.width && bounds.height <= area.height;
};

const getArea = (bounds) => {
  return screen.getDisplayMatching(bounds).workArea;
};

module.exports = {
  loadWindowState,
  saveBounds,
  saveMaximized
};
