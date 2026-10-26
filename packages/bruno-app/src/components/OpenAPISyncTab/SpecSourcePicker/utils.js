import { isHttpUrl } from 'utils/url/index';
import { findApiSpecByPathname } from 'utils/api-specs';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const getOpenApiSpecError = (spec) => {
  if (isPlainObject(spec) && spec.swagger) {
    return 'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.';
  }
  const isOpenApi3 = isPlainObject(spec)
    && typeof spec.openapi === 'string'
    && spec.openapi.startsWith('3.')
    && isPlainObject(spec.paths);
  return isOpenApi3 ? null : 'The selected spec is not a valid OpenAPI 3.x specification';
};

export const isSpecSourceReady = (mode, value, workspaceSpecs) => {
  const source = (value || '').trim();
  if (mode === 'url') {
    return isHttpUrl(source);
  }
  if (mode === 'workspace') {
    return Boolean(findApiSpecByPathname(workspaceSpecs, source));
  }
  return Boolean(source);
};
