import { isOpenApiSpec } from 'utils/importers/openapi-collection';

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

export const getOpenApiSpecError = (spec) => {
  if (!isOpenApiSpec(spec)) {
    return 'The selected file is not a valid OpenAPI 3.x specification';
  }
  if (spec.swagger && String(spec.swagger).startsWith('2')) {
    return 'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.';
  }
  return null;
};
