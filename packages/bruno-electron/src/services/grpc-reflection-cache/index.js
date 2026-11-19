const { getStatements } = require('../sqlite');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');

/**
 * Methods discovered by server reflection, kept per url so a request pane can list them again —
 * and a cold process can rebuild their serializers — without asking the server a second time.
 * The cache is only ever replaced by a newer reflection of the same url; it is never invalidated
 * on its own, so a user refreshing methods is what makes it current.
 */
const readReflectionCache = (url) => {
  if (!url) return null;

  try {
    const row = getStatements().execute('get_grpc_reflection_cache', { url });
    if (!row) return null;

    const methods = safeParseJSON(row.methods);
    const descriptors = safeParseJSON(row.descriptors);
    if (!Array.isArray(methods) || !Array.isArray(descriptors)) return null;

    return { methods, descriptors, fetchedAt: row.fetched_at };
  } catch (err) {
    console.warn('failed to read the gRPC reflection cache: ', err);
    return null;
  }
};

const writeReflectionCache = ({ url, methods, descriptors }) => {
  if (!url) return;

  try {
    getStatements().execute('upsert_grpc_reflection_cache', {
      url,
      methods: safeStringifyJSON(methods),
      descriptors: safeStringifyJSON(descriptors)
    });
  } catch (err) {
    console.warn('failed to write the gRPC reflection cache: ', err);
  }
};

const readReflectionDescriptors = (url) => readReflectionCache(url)?.descriptors ?? null;

module.exports = {
  readReflectionCache,
  writeReflectionCache,
  readReflectionDescriptors
};
