const { openApiToBruno } = require('@usebruno/converters');
const { buildSpecItemsMap, compareRequestFields, normalizeUrlPath } = require('@usebruno/common/sync');

/**
 * Compare an OpenAPI spec against a Bruno collection and produce a drift report.
 *
 * @param {Object} spec - Parsed OpenAPI 3.x spec object
 * @param {Object} collection - Bruno collection loaded from disk (from createCollectionJsonFromPathname)
 * @param {Object} options - { groupBy: 'tags'|'path' }
 * @returns {Object} Drift report
 */
const computeDrift = (spec, collection, options = {}) => {
  const { groupBy = 'tags' } = options;

  // Convert spec to Bruno collection format
  const specAsCollection = openApiToBruno(spec, { groupBy });

  // Build endpoint maps
  const specItems = buildSpecItemsMap(specAsCollection.items || []);
  const collectionItems = buildSpecItemsMap(collection.items || []);

  const missing = [];
  const stale = [];
  const modified = [];
  const inSync = [];

  // Check spec items against collection
  for (const [id, specItem] of specItems) {
    const collectionItem = collectionItems.get(id);

    if (!collectionItem) {
      const [method, path] = id.split(':');
      missing.push({
        method,
        path: path || '/',
        name: specItem.name || `${method} ${path}`
      });
    } else {
      const { hasDiff, changes } = compareRequestFields(specItem.request, collectionItem.request);
      const [method, path] = id.split(':');
      const entry = {
        method,
        path: path || '/',
        name: collectionItem.name || specItem.name || `${method} ${path}`,
        filePath: collectionItem.pathname
      };

      if (hasDiff) {
        modified.push({ ...entry, changes: changes.join(', ') });
      } else {
        inSync.push(entry);
      }
    }
  }

  // Check collection items not in spec (stale)
  for (const [id, collectionItem] of collectionItems) {
    if (!specItems.has(id)) {
      const [method, path] = id.split(':');
      stale.push({
        method,
        path: path || '/',
        name: collectionItem.name || `${method} ${path}`,
        filePath: collectionItem.pathname
      });
    }
  }

  const total = missing.length + stale.length + modified.length + inSync.length;

  return {
    summary: {
      total,
      inSync: inSync.length,
      missing: missing.length,
      stale: stale.length,
      modified: modified.length
    },
    missing,
    stale,
    modified,
    inSync
  };
};

module.exports = { computeDrift };
