/**
 * SwaggerUI (swagger-ui-react) supports Swagger 2.0 and OpenAPI 3.0.x / 3.1.x.
 * When an OpenAPI specification specifies a newer 3.x version (such as 3.2.0, 3.2.1),
 * SwaggerUI rejects it as an unsupported version. Normalizing the version field to 3.1.0
 * allows SwaggerUI to parse and render the document seamlessly.
 */
export const normalizeSpecForSwagger = (spec) => {
  if (!spec) return spec;

  if (typeof spec === 'string') {
    return spec.replace(/(["']?openapi["']?\s*:\s*["']?)3\.[2-9]\d*(?:\.\d+)?([^"'\n\r]*["']?)/i, '$13.1.0$2');
  }

  if (typeof spec === 'object' && spec !== null) {
    if (typeof spec.openapi === 'string' && /^3\.([2-9]|\d{2,})(\.|$)/.test(spec.openapi)) {
      return {
        ...spec,
        openapi: '3.1.0'
      };
    }
  }

  return spec;
};
