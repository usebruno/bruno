const path = require('node:path');

/**
 * A source declared in body:openapi belongs to the request file, so its
 * relative path is resolved from the directory containing that file. The
 * collection path remains the fallback for callers without request context.
 */
const resolveOpenApiBodySourcePath = ({ collectionPath, requestPath, sourceUrl }) => {
  if (!sourceUrl || path.isAbsolute(sourceUrl) || path.win32.isAbsolute(sourceUrl)) return sourceUrl;

  const basePath = requestPath ? path.dirname(requestPath) : collectionPath;
  return basePath ? path.resolve(basePath, sourceUrl) : sourceUrl;
};

module.exports = { resolveOpenApiBodySourcePath };
