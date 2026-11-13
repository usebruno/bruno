import { tildify } from '../../../utils/collection-location';

export const formatParentPath = (pathname, name) => {
  const shownPath = tildify(pathname);
  const segments = shownPath.split('/');
  if (segments.length > 1 && segments[segments.length - 1] === name) {
    segments.pop();
  }
  const rootLength = shownPath.startsWith('//') ? 4 : 2;
  if (segments.length > rootLength + 3) {
    return [...segments.slice(0, rootLength), '…', ...segments.slice(-2)].join('/');
  }
  return segments.join('/') || '/';
};
