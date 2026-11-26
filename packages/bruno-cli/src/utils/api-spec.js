/**
 * This file exists because the current implementation of the `brunoToOpenapi` is moved from `@usebruno/app`
 * to `@usebruno/converters` and the scope of the ticket `BRU-3523` is to have the same implementation of
 * `brunoToOpenApi` currently present in the app.
 *
 * This file fills the gap between current implementation of [createCollectionJsonFromPathname](https://github.com/usebruno/bruno/blob/main/packages/bruno-cli/src/utils/collection.js#L41-L42)
 * and the data returned by [readCollectionForApiSpec](https://github.com/usebruno/bruno/blob/main/packages/bruno-electron/src/utils/collection-reader.js#L31),
 * which is the original data passed into the `brunoToOpenApi` exporter, before migration.
 *
 * @author @vasharma05-bruno
 */

const path = require('path');
const { getAllRequestsInFolder } = require('./collection');

const DENIED_FOLDERS = new Set(['node_modules', '.git', '.svn', '.hg', '.bruno']);
const GLOB_METACHARACTERS = /[*?[\]{}]/;

const toPosixPath = (relativePath) => relativePath.split(path.sep).join('/');

const isIgnored = (relativePathPosix, ignorePatterns) => ignorePatterns.some((pattern) => {
  const posixPattern = toPosixPath(pattern);
  if (GLOB_METACHARACTERS.test(posixPattern)) {
    return path.matchesGlob(relativePathPosix, posixPattern);
  }
  const folder = posixPattern.replace(/\/+$/, '');
  return Boolean(folder) && (relativePathPosix === folder || relativePathPosix.startsWith(`${folder}/`));
});

const isInDeniedFolder = (relativePath) => path.dirname(relativePath).split(path.sep).some((segment) => DENIED_FOLDERS.has(segment));

const isReadByApp = (relativePath, ignorePatterns) =>
  !isInDeniedFolder(relativePath) && !isIgnored(toPosixPath(relativePath), ignorePatterns);

// Node lists a folder's entries in byte order on macOS and Linux, so the app reads requests and
// environments in this order there
const compareByCharacterCodes = (first, second) => {
  if (first === second) return 0;
  return first < second ? -1 : 1;
};

const compareByPathSegments = (first, second) => {
  const firstSegments = first.split(path.sep);
  const secondSegments = second.split(path.sep);
  for (let index = 0; index < Math.min(firstSegments.length, secondSegments.length); index++) {
    if (firstSegments[index] !== secondSegments[index]) {
      return compareByCharacterCodes(firstSegments[index], secondSegments[index]);
    }
  }
  return firstSegments.length - secondSegments.length;
};

const getRequests = (collection) => {
  const ignorePatterns = collection.brunoConfig?.ignore || [];
  return getAllRequestsInFolder(collection.items)
    .map((item) => ({ item, relativePath: path.relative(collection.pathname, item.pathname) }))
    .filter(({ relativePath }) => isReadByApp(relativePath, ignorePatterns))
    .sort((first, second) => compareByPathSegments(first.relativePath, second.relativePath))
    .map(({ item, relativePath }) => ({ ...item, depth: relativePath.split(path.sep).filter(Boolean).length }));
};

const getEnvVariables = (environments) => Object.fromEntries(
  [...environments]
    .sort((first, second) => compareByCharacterCodes(first.name, second.name))
    .map((environment) => [environment.name, environment.variables])
);

const getCollectionVariables = (collectionRoot) => {
  const collectionVariables = {};
  (collectionRoot?.request?.vars?.req || []).forEach((variable) => {
    if (variable.enabled) collectionVariables[variable.name] = variable.value;
  });
  return collectionVariables;
};

/**
 * Shapes a collection from `createCollectionJsonFromPathname`, plus the environments from
 * `loadEnvironments`, into the data format returned by
 * [readCollectionForApiSpec](https://github.com/usebruno/bruno/blob/main/packages/bruno-electron/src/utils/collection-reader.js#L31)
 *
 * This function will be removed, after the `brunoToOpenapi` is refactored to accept a unified Collection
 * structured object. Currently the refactor stands out of current scope to the change.
 *
 * @author vasharma05-bruno
 */
const toApiSpecCollectionData = (collection, environments) => ({
  requests: getRequests(collection),
  envVariables: getEnvVariables(environments),
  collectionVariables: getCollectionVariables(collection.root)
});

module.exports = {
  toApiSpecCollectionData
};
