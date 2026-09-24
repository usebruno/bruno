const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

/**
 * Count the number of HTTP endpoints in an OpenAPI spec.
 * Returns null if the spec has no paths (e.g. spec is null/undefined).
 */
export const countEndpoints = (spec) => {
  if (!spec?.paths) return null;
  let count = 0;
  for (const path of Object.values(spec.paths)) {
    for (const key of Object.keys(path)) {
      if (HTTP_METHODS.includes(key.toLowerCase())) count++;
    }
  }
  return count;
};
