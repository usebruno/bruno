export const SPEC_PREVIEW_ERRORS = {
  EMPTY: 'Unable to render preview: No API definition provided.',
  INVALID_YAML_JSON: 'Unable to render preview: content is not a valid YAML or JSON.',
  INVALID_OPENAPI: 'Unable to render preview: content is not a valid OpenAPI specification.',
  TIMEOUT: 'Preview timed out. The spec may be too large or contain unsupported content.'
} as const;
