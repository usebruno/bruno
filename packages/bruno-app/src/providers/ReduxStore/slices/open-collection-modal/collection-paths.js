import { normalizePath } from 'utils/common/path';
import { isWindowsOS } from 'utils/common/platform';

export const toPathKey = (pathname) => {
  const key = normalizePath(pathname);
  return isWindowsOS() ? key.toLowerCase() : key;
};

export const getFolderName = (pathname) => {
  const segments = normalizePath(pathname).split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : pathname;
};
