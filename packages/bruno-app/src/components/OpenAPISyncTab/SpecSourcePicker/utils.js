import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { isHttpUrl } from 'utils/url/index';
import { findApiSpecByPathname } from 'utils/api-specs';

export const getOpenApiSpecError = (spec) => {
  if (!isOpenApiSpec(spec)) {
    return 'The selected spec is not a valid OpenAPI 3.x specification';
  }
  if (spec.swagger && String(spec.swagger).startsWith('2')) {
    return 'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.';
  }
  return null;
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
