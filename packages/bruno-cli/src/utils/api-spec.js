const path = require('path');

const getDepth = (collectionPath, pathname) => path.relative(collectionPath, pathname).split(path.sep).filter(Boolean).length;

const flattenRequests = (items, collectionPath) => items.flatMap((item) => {
  if (item.type === 'folder') {
    return flattenRequests(item.items || [], collectionPath);
  }
  return [{ ...item, depth: getDepth(collectionPath, item.pathname) }];
});

// Compares path segments by UTF-16 code unit, the order the app's collection reader lists files in on
// macOS, so the CLI's spec matches the app's on every platform
const compareByPathSegments = (first, second) => {
  const firstSegments = first.pathname.split(path.sep);
  const secondSegments = second.pathname.split(path.sep);
  for (let index = 0; index < Math.min(firstSegments.length, secondSegments.length); index++) {
    if (firstSegments[index] !== secondSegments[index]) {
      return firstSegments[index] < secondSegments[index] ? -1 : 1;
    }
  }
  return firstSegments.length - secondSegments.length;
};

const getEnvVariables = (environments) => Object.fromEntries(environments.map((environment) => [environment.name, environment.variables]));

const getCollectionVariables = (collectionRoot) => {
  const collectionVariables = {};
  (collectionRoot?.request?.vars?.req || []).forEach((variable) => {
    if (variable.enabled) collectionVariables[variable.name] = variable.value;
  });
  return collectionVariables;
};

/**
 * Shapes a collection from `createCollectionJsonFromPathname`, plus the environments from
 * `loadEnvironments`, into the collection data `brunoToOpenApi` takes. Request `depth` is the
 * number of path segments below the collection root, the same as the app's collection reader.
 * Requests are ordered by path because their order decides the order of `paths` and the
 * numbering of components in the spec.
 */
const toApiSpecCollectionData = (collection, environments) => ({
  requests: flattenRequests(collection.items, collection.pathname).sort(compareByPathSegments),
  envVariables: getEnvVariables(environments),
  collectionVariables: getCollectionVariables(collection.root)
});

module.exports = {
  toApiSpecCollectionData
};
