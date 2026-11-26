import { normalizePath } from 'utils/common/path';

const HOME_FOLDER = /^(?:\/Users\/[^/]+|\/home\/[^/]+|[A-Za-z]:\/Users\/[^/]+)(?=\/|$)/;

export const tildify = (pathname) => normalizePath(pathname).replace(HOME_FOLDER, '~') || pathname;
