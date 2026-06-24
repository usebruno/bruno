import { DEFAULT_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_COLLAPSED } from './constants';

export const getLocalStorageSidebarWidth = () => {
  try {
    const stored = window.localStorage.getItem('bruno.leftSidebarWidth');
    return stored ? parseInt(stored, 10) : DEFAULT_SIDEBAR_WIDTH;
  } catch (err) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
};

export const getLocalStorageSidebarCollapsed = () => {
  try {
    const stored = window.localStorage.getItem('bruno.sidebarCollapsed');
    return stored !== null ? stored === 'true' : DEFAULT_SIDEBAR_COLLAPSED;
  } catch (err) {
    return DEFAULT_SIDEBAR_COLLAPSED;
  }
};

export const setLocalStorageSidebarWidth = (width) => {
  try {
    window.localStorage.setItem('bruno.leftSidebarWidth', width);
  } catch (err) { }
};

export const setLocalStorageSidebarCollapsed = (collapsed) => {
  try {
    window.localStorage.setItem('bruno.sidebarCollapsed', collapsed);
  } catch (err) { }
};

export const hasLocalStorageSidebarWidth = () => {
  try {
    return window.localStorage.getItem('bruno.leftSidebarWidth') !== null;
  } catch (err) {
    return false;
  }
};

export const hasLocalStorageSidebarCollapsed = () => {
  try {
    return window.localStorage.getItem('bruno.sidebarCollapsed') !== null;
  } catch (err) {
    return false;
  }
};
