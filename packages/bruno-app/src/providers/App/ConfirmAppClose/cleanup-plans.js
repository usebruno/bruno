import { getRelativePathWithinBasePath } from 'utils/common/path';

const SUPPORTED_REQUEST_TYPES = new Set(['http-request', 'graphql-request']);

const flattenItems = (items = []) => items.flatMap((item) => [item, ...flattenItems(item.items || [])]);

export const buildCleanupPlans = (collections = []) => collections.flatMap((collection) => {
  const config = collection.brunoConfig?.onExit;
  if (!config?.enabled) return [];

  const showReminder = config.showReminder !== false;
  const requestPaths = Array.isArray(config.requestPaths)
    ? Array.from(new Set(config.requestPaths.filter((requestPath) => typeof requestPath === 'string')))
    : [];
  const itemsByPath = new Map(flattenItems(collection.items)
    .filter((item) => item.pathname)
    .map((item) => [getRelativePathWithinBasePath(collection.pathname, item.pathname, true), item]));
  const requests = [];
  const missingRequestPaths = [];

  requestPaths.forEach((requestPath) => {
    const request = itemsByPath.get(requestPath);
    if (request && SUPPORTED_REQUEST_TYPES.has(request.type)) requests.push(request);
    else missingRequestPaths.push(requestPath);
  });

  if (!showReminder && !requestPaths.length) return [];

  return [{
    collectionUid: collection.uid,
    collectionName: collection.name,
    showReminder,
    reminderMessage: typeof config.reminderMessage === 'string' ? config.reminderMessage : '',
    requests,
    missingRequestPaths
  }];
});
