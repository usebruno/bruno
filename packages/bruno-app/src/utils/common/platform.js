import trim from 'lodash/trim';
import path from 'path';
import platform from 'platform';

export const isElectron = () => {
  if (!window) {
    return false;
  }

  return window.ipcRenderer ? true : false;
};

export const resolveRequestFilename = (name) => {
  return `${trim(name)}.bru`;
};

export const getSubdirectoriesFromRoot = (rootPath, pathname) => {

  const relativePath = path.relative(rootPath, pathname);
  return relativePath ? relativePath.split(path.sep) : [];
};


export const isWindowsPath = (pathname) => {

  if (!isWindowsOS()) {
    return false;
  }

  // Check for Windows drive letter format (e.g., "C:\")
  const hasDriveLetter = /^[a-zA-Z]:\\/.test(pathname);
  
  // Check for UNC path format (e.g., "\\server\share") a.k.a. network path || WSL path
  const isUNCPath = pathname.startsWith('\\\\');

  return hasDriveLetter || isUNCPath;
};


export const getDirectoryName = (pathname) => {
  return isWindowsPath(pathname) ? path.win32.dirname(pathname) : path.dirname(pathname);
};

export const isWindowsOS = () => {
  const os = platform.os;
  const osFamily = os.family.toLowerCase();

  return osFamily.includes('windows');
};


export const brunoPath = isWindowsOS() ? path.win32 : path.posix;

export const isMacOS = () => {
  const os = platform.os;
  const osFamily = os.family.toLowerCase();

  return osFamily.includes('os x');
};

export const getAppInstallDate = () => {
  let dateString = localStorage.getItem('bruno.installedOn');

  if (!dateString) {
    dateString = new Date().toISOString();
    localStorage.setItem('bruno.installedOn', dateString);
  }

  const date = new Date(dateString);
  return date;
};
