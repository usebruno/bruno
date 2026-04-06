import crypto from 'crypto';

/**
 * Parse a spec string (JSON or YAML) into an object.
 * Tries JSON first, falls back to returning the string if not parseable.
 * Note: YAML parsing requires js-yaml which is not a dependency of bruno-common.
 * Callers should handle YAML parsing externally if needed.
 */
export const parseSpecJson = (content: string): any => {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

/**
 * Validate that a parsed spec object is a valid OpenAPI 3.x document.
 * Swagger 2.0 is not supported — the converter only handles OpenAPI 3.x.
 */
export const isValidOpenApiSpec = (spec: any): boolean => {
  if (!spec || typeof spec !== 'object') return false;
  if (spec.swagger) return false;
  if (spec.openapi && typeof spec.openapi === 'string' && spec.openapi.startsWith('3.')) {
    return !!(spec.paths && typeof spec.paths === 'object');
  }
  return false;
};

/**
 * Generate an MD5 hash of a parsed OpenAPI spec for quick change detection.
 */
export const generateSpecHash = (spec: any): string | null => {
  if (!spec) return null;
  return crypto.createHash('md5').update(JSON.stringify(spec)).digest('hex');
};
