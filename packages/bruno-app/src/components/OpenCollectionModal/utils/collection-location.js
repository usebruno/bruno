import { normalizePath } from 'utils/common/path';
import { getFolderName, toPathKey } from 'providers/ReduxStore/slices/open-collection-modal/collection-paths';

const HOME_FOLDER = /^(?:\/Users\/[^/]+|\/home\/[^/]+|[A-Za-z]:\/Users\/[^/]+)(?=\/|$)/;

export const tildify = (pathname) => normalizePath(pathname).replace(HOME_FOLDER, '~') || pathname;

const isInsideFolder = (folderPath, pathname) => {
  const folderKey = toPathKey(folderPath);
  return Boolean(folderKey) && toPathKey(pathname).startsWith(`${folderKey}/`);
};

export const getLocationInFolders = (folderPaths, pathname) => {
  const folderPath = folderPaths.find((folder) => isInsideFolder(folder, pathname));
  return folderPath ? normalizePath(pathname).slice(normalizePath(folderPath).length + 1) : getFolderName(pathname);
};
