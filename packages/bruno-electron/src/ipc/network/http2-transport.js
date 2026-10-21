const { preferencesUtil } = require('../../store/preferences');

/**
 * Resolve the HTTP version using request, collection, then app settings.
 * Unset or 'inherit' values fall back to the next level.
 */
const resolveRequestedHttpVersion = (request, collectionHttpVersion) => {
  const perRequest = request && request.settings && request.settings.httpVersion;
  if (perRequest && perRequest !== 'inherit') {
    return perRequest;
  }
  if (collectionHttpVersion && collectionHttpVersion !== 'inherit') {
    return collectionHttpVersion;
  }
  return preferencesUtil.getHttpVersion();
};

module.exports = { resolveRequestedHttpVersion };
