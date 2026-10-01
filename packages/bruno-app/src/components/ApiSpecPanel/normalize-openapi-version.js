import jsyaml from 'js-yaml';

const normalizeOpenApiObject = (spec) => {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return spec;

  const version = typeof spec.openapi === 'string' ? spec.openapi.trim() : '';
  if (!/^3\.2\.\d+$/.test(version)) return spec;

  return { ...spec, openapi: '3.1.0' };
};

const normalizeOpenApiVersionForSwagger = (spec) => {
  if (typeof spec !== 'string') return normalizeOpenApiObject(spec);

  let parsed;
  try {
    parsed = JSON.parse(spec);
  } catch {
    try {
      parsed = jsyaml.load(spec);
    } catch {
      return spec;
    }
  }

  const normalized = normalizeOpenApiObject(parsed);
  return normalized === parsed ? spec : normalized;
};

export default normalizeOpenApiVersionForSwagger;
