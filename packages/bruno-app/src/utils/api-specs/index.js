import { getAbsoluteFilePath, normalizePath } from 'utils/common/path';
import { isWindowsOS } from 'utils/common/platform';
import { isHttpUrl } from 'utils/url';

export const API_SPEC_TAB_TYPE = 'api-spec';

const API_SPEC_TAB_UID_PREFIX = 'api-spec::';

// Paths are compared ignoring letter case on Windows only. specPathKey in bruno-electron
// (utils/workspace-config) follows the same rule, so change both together.
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

const isCollectionInWorkspace = (workspace, collection) =>
  (workspace?.collections || []).some((entry) => normalizePath(entry.path) === normalizePath(collection.pathname));

const syncsFromSpec = (collection, specPathKey) =>
  (collection.brunoConfig?.openapi || []).some(({ sourceUrl } = {}) => {
    if (!sourceUrl || isHttpUrl(sourceUrl)) return false;
    return getApiSpecPathKey(getAbsoluteFilePath(collection.pathname, sourceUrl)) === specPathKey;
  });

export const countCollectionsSyncingFromSpec = (collections, workspace, specPathname) => {
  const specPathKey = getApiSpecPathKey(specPathname);
  if (!specPathKey || !Array.isArray(collections)) return 0;

  return collections.filter(
    (collection) => isCollectionInWorkspace(workspace, collection) && syncsFromSpec(collection, specPathKey)
  ).length;
};
