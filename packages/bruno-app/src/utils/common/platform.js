import trim from 'lodash/trim';
import path from 'path';

export const isElectron = () => {
  if(!window) {
    return false;
  }

  return window.ipcRenderer ? true : false;
};

export const isLocalCollection = (collection) => {
  return collection.pathname ? true : false;
};

export const resolveRequestFilename = (name) => {
  return `${trim(name)}.json`;
};

export const getSubdirectoriesFromRoot = (rootPath, pathname) => {
  if (!path.isAbsolute(pathname)) {
    throw new Error('Invalid path!');
  }
  const relativePath = path.relative(rootPath, pathname);
  return relativePath ? relativePath.split(path.sep) : [];
};

