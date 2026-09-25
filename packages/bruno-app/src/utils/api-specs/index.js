import { normalizePath } from 'utils/common/path';
import { isWindowsOS } from 'utils/common/platform';

export const API_SPEC_TAB_TYPE = 'api-spec';

const API_SPEC_TAB_UID_PREFIX = 'api-spec::';

export const getApiSpecPathKey = (pathname) => {
  const normalizedPathname = normalizePath(pathname);
  if (!normalizedPathname) return '';
  return isWindowsOS() ? normalizedPathname.toLowerCase() : normalizedPathname;
};

export const getApiSpecTabUid = (collectionUid, pathname) => {
  const pathKey = getApiSpecPathKey(pathname);
  return collectionUid && pathKey ? `${API_SPEC_TAB_UID_PREFIX}${collectionUid}::${pathKey}` : null;
};

export const findApiSpecByPathname = (apiSpecs, pathname) => {
  const pathKey = getApiSpecPathKey(pathname);
  if (!pathKey || !Array.isArray(apiSpecs)) {
    return null;
  }

  return apiSpecs.find((apiSpec) => getApiSpecPathKey(apiSpec?.pathname) === pathKey) || null;
};

export const isApiSpecTab = (tab) => tab?.type === API_SPEC_TAB_TYPE;

export const isApiSpecTabForPathname = (tab, pathname) => {
  if (!isApiSpecTab(tab)) {
    return false;
  }

  const pathKey = getApiSpecPathKey(pathname);
  return Boolean(pathKey) && getApiSpecPathKey(tab.apiSpecPathname) === pathKey;
};

export const hasUnsavedApiSpecChanges = (apiSpec) =>
  Boolean(apiSpec) && typeof apiSpec.draft === 'string' && apiSpec.draft !== apiSpec.raw;
