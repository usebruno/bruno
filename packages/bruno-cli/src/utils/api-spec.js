const path = require('path');

const getDepth = (collectionPath, pathname) => path.relative(collectionPath, pathname).split(path.sep).filter(Boolean).length;

const flattenRequests = (items, collectionPath) => items.flatMap((item) => {
  if (item.type === 'folder') {
    return flattenRequests(item.items || [], collectionPath);
  }
  return [{ ...item, depth: getDepth(collectionPath, item.pathname) }];
});

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
 */
const toApiSpecCollectionData = (collection, environments) => ({
  requests: flattenRequests(collection.items, collection.pathname),
  envVariables: getEnvVariables(environments),
  collectionVariables: getCollectionVariables(collection.root)
});

module.exports = {
  toApiSpecCollectionData
};
