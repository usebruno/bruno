const { customAlphabet } = require('nanoid');
const each = require('lodash/each');
const get = require('lodash/get');

/**
 * Generate a UUID
 * @returns {string} UUID
 */
const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

/**
 * Check if a URL is valid
 * @param {string} url - URL to check
 * @returns {boolean} Whether the URL is valid
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Ensure URL has proper formatting
 * @param {string} url - URL to format
 * @returns {string} Formatted URL
 */
const ensureUrl = (url) => {
  // Removing multiple slashes after the protocol if it exists, or after the beginning of the string otherwise
  return url.replace(/([^:])\/{2,}/g, '$1/');
};

/**
 * Build an empty JSON body based on schema
 * @param {object} bodySchema - Schema to build JSON body from
 * @returns {object} Empty JSON body
 */
const buildEmptyJsonBody = (bodySchema) => {
  let _jsonBody = {};
  each(bodySchema.properties || {}, (prop, name) => {
    if (prop.type === 'object') {
      _jsonBody[name] = buildEmptyJsonBody(prop);
    } else if (prop.type === 'array') {
      if (prop.items && prop.items.type === 'object') {
        _jsonBody[name] = [buildEmptyJsonBody(prop.items)];
      } else {
        _jsonBody[name] = [];
      }
    } else {
      _jsonBody[name] = '';
    }
  });
  return _jsonBody;
};

/**
 * Resolve references in OpenAPI spec
 * @param {object} spec - OpenAPI spec
 * @param {object} components - Components from OpenAPI spec
 * @param {Map} cache - Cache for resolved references
 * @returns {object} Resolved spec
 */
const resolveRefs = (spec, components = spec?.components, cache = new Map()) => {
  if (!spec || typeof spec !== 'object') {
    return spec;
  }

  if (cache.has(spec)) {
    return cache.get(spec);
  }

  if (Array.isArray(spec)) {
    return spec.map(item => resolveRefs(item, components, cache));
  }

  if ('$ref' in spec) {
    const refPath = spec.$ref;

    if (cache.has(refPath)) {
      return cache.get(refPath);
    }

    if (refPath.startsWith('#/components/')) {
      const refKeys = refPath.replace('#/components/', '').split('/');
      let ref = components;

      for (const key of refKeys) {
        if (ref && ref[key]) {
          ref = ref[key];
        } else {
          return spec;
        }
      }

      cache.set(refPath, {});
      const resolved = resolveRefs(ref, components, cache);
      cache.set(refPath, resolved);
      return resolved;
    }
    return spec;
  }

  const resolved = {};
  cache.set(spec, resolved);

  for (const [key, value] of Object.entries(spec)) {
    resolved[key] = resolveRefs(value, components, cache);
  }

  return resolved;
};

/**
 * Get default URL from server object
 * @param {object} serverObject - Server object from OpenAPI spec
 * @returns {string} Default URL
 */
const getDefaultUrl = (serverObject) => {
  let url = serverObject.url;
  if (serverObject.variables) {
    each(serverObject.variables, (variable, variableName) => {
      let sub = variable.default || (variable.enum ? variable.enum[0] : `{{${variableName}}}`);
      url = url.replace(`{${variableName}}`, sub);
    });
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * Get security schemes from OpenAPI spec
 * @param {object} apiSpec - OpenAPI spec
 * @returns {object} Security configuration
 */
const getSecurity = (apiSpec) => {
  let defaultSchemes = apiSpec.security || [];

  let securitySchemes = get(apiSpec, 'components.securitySchemes', {});
  if (Object.keys(securitySchemes) === 0) {
    return {
      supported: []
    };
  }

  return {
    supported: defaultSchemes.map((scheme) => {
      var schemeName = Object.keys(scheme)[0];
      return securitySchemes[schemeName];
    }),
    schemes: securitySchemes,
    getScheme: (schemeName) => {
      return securitySchemes[schemeName];
    }
  };
};

/**
 * Convert OpenAPI runtime expression to script
 * @param {string} expression - OpenAPI runtime expression
 * @returns {string} Script expression
 */
const openAPIRuntimeExpressionToScript = (expression) => {
  // see https://swagger.io/docs/specification/links/#runtime-expressions
  if (expression === '$response.body') {
    return 'res.body';
  } else if (expression.startsWith('$response.body#')) {
    let pointer = expression.substring(15);
    // could use https://www.npmjs.com/package/json-pointer for better support
    return `res.body${pointer.replace('/', '.')}`;
  }
  return expression;
};

module.exports = {
  uuid,
  isValidUrl,
  ensureUrl,
  buildEmptyJsonBody,
  resolveRefs,
  getDefaultUrl,
  getSecurity,
  openAPIRuntimeExpressionToScript
}; 