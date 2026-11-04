import each from 'lodash/each';
import isPlainObject from 'lodash/isPlainObject';
import {
  resolveSchemaComposition,
  cycleKeyOf,
  hasSchemaComposition,
  hasSchemaAlternatives,
  usesComposition,
  withoutComposition,
  allowedDefault,
  isExampleCopy,
  resetSchemaCompositionState,
  followPlaceholder
} from './schema-composition';
import { uuid, sanitizeTag } from '../common';

// Content type patterns for matching MIME type variants
// These patterns handle structured types with many variants (e.g., application/ld+json, application/vnd.api+json)
// MIME types can contain: letters, numbers, hyphens, dots, and plus signs
export const CONTENT_TYPE_PATTERNS = {
  // Matches: application/json, application/ld+json, application/vnd.api+json, text/json, etc.
  JSON: /^[\w\-.+]+\/([\w\-.+]+\+)?json$/,
  // Matches: application/xml, text/xml, application/atom+xml, application/rss+xml, etc.
  XML: /^[\w\-.+]+\/([\w\-.+]+\+)?xml$/,
  // Matches: text/html
  HTML: /^[\w\-.+]+\/([\w\-.+]+\+)?html$/
};

// An item's name is what the import writers turn into its filename, by appending the
// format extension and running the result through the filesystem sanitizer. That
// sanitizer trims trailing dots and spaces at end-of-string only.
export const normalizeItemName = (name) => {
  return name
    .replace(/[\r\n\s]+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');
};

export const ensureUrl = (url) => {
  // removing multiple slashes after the protocol if it exists, or after the beginning of the string otherwise
  return url.replace(/([^:])\/{2,}/g, '$1/');
};

export const getStatusText = (statusCode) => {
  const statusTexts = {
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',
    103: 'Early Hints',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status',
    208: 'Already Reported',
    226: 'IM Used',
    300: 'Multiple Choice',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    306: 'unused',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: 'I\'m a teapot',
    421: 'Misdirected Request',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required'
  };
  return statusTexts[statusCode] || 'Unknown';
};

/**
 * Determines the body type based on content-type from OpenAPI spec
 * Uses pattern matching to handle various MIME type variants (e.g., application/ld+json, application/vnd.api+json)
 * @param {string} contentType - The content-type from OpenAPI spec (object key, e.g., "application/json")
 * @returns {string} - The body type (json, xml, html, text)
 */
export const getBodyTypeFromContentType = (contentType) => {
  if (!contentType || typeof contentType !== 'string') {
    return 'text';
  }

  // Normalize: lowercase (object keys may vary in case, but shouldn't have parameters or whitespace)
  const normalizedContentType = contentType.toLowerCase();

  if (CONTENT_TYPE_PATTERNS.JSON.test(normalizedContentType)) {
    return 'json';
  } else if (CONTENT_TYPE_PATTERNS.XML.test(normalizedContentType)) {
    return 'xml';
  } else if (CONTENT_TYPE_PATTERNS.HTML.test(normalizedContentType)) {
    return 'html';
  }

  return 'text';
};

export const getExpandableObjectSchema = (param) => {
  const schema = param.schema;
  if (!schema || typeof schema !== 'object') {
    return null;
  }
  const keptWhole = param.in !== 'header' && param.in !== 'path' && hasSchemaAlternatives(schema);
  if (hasSchemaComposition(schema) && !keptWhole) {
    const resolved = resolveSchemaComposition(schema);
    if (resolved && resolved.properties) {
      return resolved;
    }
  }
  return schema.properties ? schema : null;
};

// Max values generated under composition per body, so linked models can't make a body huge.
const EXAMPLE_VALUE_LIMIT = 5000;

// Composition depths tried in order, deepest first, until the body fits under the limit above.
// If none fits, the last depth is used and values past the limit are left empty.
const COMPOSITION_DEPTH_STEPS = [32, 6, 4, 3, 2, 1];

class ExampleTooLarge extends Error {}

const exampleBudgets = new WeakMap();

const newFittedDepthSteps = () => ({ json: new WeakMap(), xml: new WeakMap(), example: new WeakMap() });

let fittedDepthSteps = newFittedDepthSteps();

export const resetExampleGenerationState = () => {
  resetSchemaCompositionState();
  fittedDepthSteps = newFittedDepthSteps();
};

const countValue = (visited) => {
  const budget = exampleBudgets.get(visited);
  if (budget.compositionDepth === 0) return true;
  budget.values += 1;
  if (budget.values <= EXAMPLE_VALUE_LIMIT) return true;
  if (budget.truncate) return false;
  throw new ExampleTooLarge();
};

const deeperInComposition = (visited, generate, fallback) => {
  const budget = exampleBudgets.get(visited);
  if (budget.compositionDepth >= budget.depthLimit) {
    return fallback();
  }
  budget.compositionDepth += 1;
  try {
    return generate();
  } finally {
    budget.compositionDepth -= 1;
  }
};

const withResolvedSchema = (givenSchema, visited, generate) => {
  const rawSchema = exampleBudgets.get(visited).compositionDepth > 0 ? followPlaceholder(givenSchema) : givenSchema;
  if (!hasSchemaComposition(rawSchema)) {
    return generate(rawSchema);
  }
  return deeperInComposition(
    visited,
    () => generate(resolveSchemaComposition(rawSchema)),
    () => generate(withoutComposition(rawSchema))
  );
};

const generateFromRoot = (rawSchema, kind, generate) => {
  const fitted = fittedDepthSteps[kind];
  const isCacheable = Boolean(rawSchema) && typeof rawSchema === 'object';
  const firstStep = (isCacheable && fitted.get(rawSchema)) || 0;
  for (let step = firstStep; step < COMPOSITION_DEPTH_STEPS.length; step += 1) {
    const visited = new Map();
    exampleBudgets.set(visited, { values: 0, depthLimit: COMPOSITION_DEPTH_STEPS[step], compositionDepth: 0 });
    try {
      const value = withResolvedSchema(rawSchema, visited, (schema) => generate(schema, visited));
      if (isCacheable && step > 0) fitted.set(rawSchema, step);
      return value;
    } catch (error) {
      if (!(error instanceof ExampleTooLarge)) throw error;
    }
  }
  const visited = new Map();
  exampleBudgets.set(visited, { values: 0, depthLimit: COMPOSITION_DEPTH_STEPS[COMPOSITION_DEPTH_STEPS.length - 1], compositionDepth: 0, truncate: true });
  if (isCacheable) fitted.set(rawSchema, COMPOSITION_DEPTH_STEPS.length);
  return withResolvedSchema(rawSchema, visited, (schema) => generate(schema, visited));
};

const primitiveDefaultFor = (schema) => {
  if (schema.type === 'integer' || schema.type === 'number') return allowedDefault(schema, 0);
  if (schema.type === 'boolean') return allowedDefault(schema, false);
  return allowedDefault(schema, '');
};

/**
 * Gets a default value for a schema based on its type, format, and constraints
 * Prioritizes: explicit example > enum first value > format-specific example > type default
 * @param {Object} schema - The OpenAPI schema object
 * @param {Map} visited - Map to track circular references
 * @returns {*} - The default value for the schema
 */
const defaultValueFor = (schema, visited) => {
  if (!schema || typeof schema !== 'object') {
    return '';
  }

  // Check for explicit example first
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Check for enum and use first value
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  // Handle different types
  if (schema.type === 'object' || schema.properties) {
    return buildEmptyJsonBody(schema, visited);
  }

  if (schema.type === 'array') {
    // Check for array-level example
    if (schema.example !== undefined) {
      return schema.example;
    }

    if (schema.items) {
      return withResolvedSchema(schema.items, visited, (items) => defaultArrayFor(schema, items, visited));
    }
    return [];
  }

  return primitiveDefaultFor(schema);
};

const getDefaultValueForSchema = (rawSchema, visited) => {
  if (!isExampleCopy(rawSchema) && !countValue(visited)) return '';
  return withResolvedSchema(rawSchema, visited, (schema) => defaultValueFor(schema, visited));
};

const withCycleGuard = (visited, key, onLoop, build) => {
  if (visited.has(key)) return onLoop();
  visited.set(key, true);
  try {
    return build();
  } finally {
    visited.delete(key);
  }
};

const nestsItself = (arraySchema) => {
  const seen = new Set();
  for (let items = arraySchema.items; isPlainObject(items) && items.type === 'array' && !seen.has(items); items = items.items) {
    if (items === arraySchema) return true;
    seen.add(items);
  }
  return false;
};

const defaultArrayFor = (arraySchema, items, visited) => {
  if (!items || typeof items !== 'object') {
    return [];
  }
  if (items.type === 'object' || items.properties) {
    return [buildEmptyJsonBody(items, visited)];
  }
  if (items.example !== undefined) {
    return Array.isArray(items.example) ? items.example : [items.example];
  }
  const itemsOf = () => {
    const itemDefault = getDefaultValueForSchema(items, visited);
    return itemDefault !== '' && itemDefault !== 0 && itemDefault !== false ? [itemDefault] : [];
  };
  const guarded = exampleBudgets.get(visited).compositionDepth > 0 || nestsItself(arraySchema);
  return guarded ? withCycleGuard(visited, cycleKeyOf(arraySchema), () => [], itemsOf) : itemsOf();
};

/**
 * Builds XML string from OpenAPI schema
 * @param {Object} rawBodySchema - The OpenAPI schema object
 * @returns {string} - XML string
 */
export const buildXmlBody = (rawBodySchema) => generateFromRoot(rawBodySchema, 'xml', (bodySchema, visited) => {
  if (!bodySchema) return '';

  // String example = raw XML, return as-is
  if (typeof bodySchema.example === 'string') {
    return bodySchema.example;
  }

  const exampleValues = typeof bodySchema.example === 'object' ? bodySchema.example : null;
  const exampleChoosesAlternative = Boolean(exampleValues) && rawBodySchema.example !== undefined && hasSchemaAlternatives(rawBodySchema);
  const properties = exampleChoosesAlternative ? undefined : bodySchema.properties;

  if (!properties && !exampleValues) return '';

  const rootName = bodySchema.xml?.name || 'root';

  // Build a single XML element
  const buildElement = (name, rawProp, givenValue, indent = '  ') => {
    const copied = givenValue === undefined && isExampleCopy(rawProp);
    const withinBudget = givenValue !== undefined || copied || countValue(visited);
    return withResolvedSchema(rawProp || {}, visited, (prop) => {
      const xmlName = prop.xml?.name || name;

      if (prop.xml?.attribute) return null;

      const value = copied ? prop.example : givenValue;

      const element = (children) => {
        const shown = children.filter(Boolean);
        return `${indent}<${xmlName}>${shown.length ? '\n' + shown.join('\n') + '\n' + indent : ''}</${xmlName}>`;
      };

      if (!withinBudget) return element([]);

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return element(Object.entries(value).map(([k, v]) => buildElement(k, prop.properties?.[k] || {}, v, indent + '  ')));
      }

      if (prop.type === 'object' || prop.properties) {
        return withCycleGuard(visited, cycleKeyOf(prop), () => element([]), () =>
          element(Object.entries(prop.properties || {}).map(([k, p]) => buildElement(k, p, undefined, indent + '  '))));
      }

      const content = value != null ? String(value) : String(allowedDefault(prop, '') ?? '');
      return `${indent}<${xmlName}>${content}</${xmlName}>`;
    });
  };

  // Collect attributes
  const attributes = Object.entries(properties || {})
    .map(([name, p]) => [name, resolveSchemaComposition(p)])
    .filter(([, p]) => p?.xml?.attribute)
    .map(([name, p]) => `${p.xml?.name || name}="${exampleValues?.[name] ?? ''}"`);

  // Build child elements
  const entries = properties
    ? Object.entries(properties).map(([k, p]) => [k, p, exampleValues?.[k]])
    : Object.entries(exampleValues || {}).map(([k, v]) => [k, {}, v]);

  const children = entries
    .map(([name, prop, value]) => buildElement(name, prop, value))
    .filter(Boolean);

  const attrStr = attributes.length ? ' ' + attributes.join(' ') : '';
  const childrenStr = children.length ? '\n' + children.join('\n') + '\n' : '';

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}${attrStr}>${childrenStr}</${rootName}>`;
});

const buildEmptyJsonBody = (bodySchema, visited) => {
  if (!bodySchema || typeof bodySchema !== 'object') {
    return {};
  }

  return withCycleGuard(visited, cycleKeyOf(bodySchema), () => ({}), () => {
    const _jsonBody = {};
    each(bodySchema.properties || {}, (prop, name) => {
      _jsonBody[name] = getDefaultValueForSchema(prop, visited);
    });

    const additional = bodySchema.additionalProperties;
    const forbidsEverything = additional && typeof additional.not === 'object' && additional.not !== null && Object.keys(additional.not).length === 0;
    if (additional && typeof additional === 'object' && !Array.isArray(additional) && !forbidsEverything && usesComposition(additional)) {
      let index = 1;
      while (Object.hasOwn(_jsonBody, `additionalProp${index}`)) index += 1;
      deeperInComposition(visited, () => {
        _jsonBody[`additionalProp${index}`] = getDefaultValueForSchema(additional, visited);
      }, () => {});
    }

    return _jsonBody;
  });
};

const formValue = (value, inherited) => (value === undefined || value === null || (inherited && isPlainObject(value)) ? '' : String(value));

const formFieldsOf = (rawBodySchema) => {
  const bodySchema = resolveSchemaComposition(rawBodySchema);
  if (isPlainObject(bodySchema.example)) {
    const inherited = rawBodySchema.example === undefined;
    return Object.entries(bodySchema.example).map(([name, value]) => ({ name, prop: {}, value: formValue(value, inherited) }));
  }
  return Object.entries(bodySchema.properties || {}).map(([name, rawProp]) => {
    const prop = resolveSchemaComposition(rawProp) || {};
    const inherited = rawProp?.example === undefined && rawProp?.default === undefined;
    return { name, prop, value: formValue(prop.example ?? prop.default ?? allowedDefault(prop, ''), inherited) };
  });
};

const textExample = (rawSchema) => {
  const example = resolveSchemaComposition(rawSchema)?.example;
  const inherited = rawSchema?.example === undefined;
  return example === undefined || (inherited && isPlainObject(example)) ? '' : String(example);
};

/**
 * Body type handlers for different content types
 * Each handler has:
 * - match: function to test if this handler should process the mime type
 * - mode: the Bruno body mode to set
 * - handle: function to populate the body content
 */
export const BODY_TYPE_HANDLERS = [
  {
    match: (mimeType) => CONTENT_TYPE_PATTERNS.JSON.test(mimeType),
    mode: 'json',
    handle: (body, rawBodySchema) => {
      if (rawBodySchema) {
        const value = generateFromRoot(rawBodySchema, 'json', (bodySchema, visited) => {
          if (bodySchema.example !== undefined) {
            return bodySchema.example;
          }
          if (bodySchema.type === 'array') {
            return bodySchema.items ? [getDefaultValueForSchema(bodySchema.items, visited)] : [];
          }
          return buildEmptyJsonBody(bodySchema, visited);
        });
        body.json = JSON.stringify(value, null, 2);
      }
    }
  },
  {
    match: (mimeType) => mimeType === 'application/x-www-form-urlencoded',
    mode: 'formUrlEncoded',
    handle: (body, rawBodySchema) => {
      if (!rawBodySchema) return;
      formFieldsOf(rawBodySchema).forEach(({ name, prop, value }) => {
        body.formUrlEncoded.push({
          uid: uuid(),
          name,
          value,
          description: prop.description || '',
          enabled: true
        });
      });
    }
  },
  {
    match: (mimeType) => mimeType === 'multipart/form-data',
    mode: 'multipartForm',
    handle: (body, rawBodySchema) => {
      if (!rawBodySchema) return;
      formFieldsOf(rawBodySchema).forEach(({ name, prop, value }) => {
        const isFileField = prop.type === 'string' && prop.format === 'binary';
        body.multipartForm.push({
          uid: uuid(),
          type: isFileField ? 'file' : 'text',
          name,
          value: isFileField ? [] : value,
          description: prop.description || '',
          enabled: true
        });
      });
    }
  },
  {
    match: (mimeType) => CONTENT_TYPE_PATTERNS.XML.test(mimeType) || mimeType === 'application/xml',
    mode: 'xml',
    handle: (body, bodySchema) => {
      body.xml = buildXmlBody(bodySchema);
    }
  },
  {
    match: (mimeType) => mimeType === 'application/sparql-query',
    mode: 'sparql',
    handle: (body, bodySchema) => {
      // Use example from schema if available
      body.sparql = textExample(bodySchema);
    }
  },
  {
    match: (mimeType) => mimeType?.startsWith('text/') || ['application/octet-stream', '*/*'].includes(mimeType),
    mode: 'text',
    handle: (body, bodySchema) => {
      // Use example from schema if available
      body.text = textExample(bodySchema);
    }
  }
];

const exampleArrayFor = (items, visited) => {
  if (!items || typeof items !== 'object') {
    return [];
  }
  if (items.type === 'object' || items.properties) {
    return [buildEmptyJsonBody(items, visited)];
  }
  return ['integer', 'number', 'boolean', 'string'].includes(items.type) ? [primitiveDefaultFor(items)] : [];
};

/**
 * Extracts or generates an example value from an OpenAPI schema
 * Handles objects, arrays, primitives, and explicit examples
 * @param {Object} rawSchema - The OpenAPI schema object
 * @returns {*} - The example value (object, array, or primitive)
 */
export const getExampleFromSchema = (rawSchema) => generateFromRoot(rawSchema, 'example', (schema, visited) => {
  if (!schema || typeof schema !== 'object') {
    return '';
  }

  // Check for explicit example first
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Handle different schema types
  if (schema.type === 'object' || (schema.properties && !schema.type)) {
    // Handle object type or schema with properties (even if type is not explicitly set)
    return buildEmptyJsonBody(schema, visited);
  } else if (schema.type === 'array') {
    if (schema.items) {
      return withResolvedSchema(schema.items, visited, (items) => exampleArrayFor(items, visited));
    }
    return [];
  } else {
    // For primitive types, use default values
    return primitiveDefaultFor(schema);
  }
});

/**
 * Populates request body in Bruno example from schema
 * Reuses BODY_TYPE_HANDLERS for consistent body generation
 * @param {Object} params - Parameters object
 * @param {Object} params.body - The Bruno request body object to populate
 * @param {Object} params.bodySchema - The OpenAPI schema for the request body
 * @param {string} params.contentType - Content type (e.g., 'application/json', 'application/ld+json')
 */
export const populateRequestBody = ({ body, bodySchema, contentType }) => {
  if (!contentType || typeof contentType !== 'string') return;

  // Normalize: lowercase (content types from OpenAPI spec object keys may vary in case)
  const normalizedContentType = contentType.toLowerCase();

  // Find matching handler and use it (same as main request body)
  const handler = BODY_TYPE_HANDLERS.find((h) => h.match(normalizedContentType));
  if (handler) {
    body.mode = handler.mode;

    // Clear arrays for form-based content types to avoid duplicates
    // (since the body was deep-copied from the main request)
    if (normalizedContentType === 'application/x-www-form-urlencoded') {
      body.formUrlEncoded = [];
    } else if (normalizedContentType === 'multipart/form-data') {
      body.multipartForm = [];
    }

    handler.handle(body, bodySchema);
  }
};

/**
 * Creates a Bruno example from OpenAPI example data
 * @param {Object} params - Parameters object
 * @param {Object} params.brunoRequestItem - The base Bruno request item
 * @param {*} params.exampleValue - The example value (object, array, or primitive)
 * @param {string} params.exampleName - Name of the example
 * @param {string} params.exampleDescription - Description of the example
 * @param {number} params.statusCode - HTTP status code (for response examples)
 * @param {string} params.contentType - Content type (e.g., 'application/json')
 * @param {Object} [params.requestBodySchema] - Optional request body schema to populate in the example
 * @param {string} [params.requestBodyContentType] - Optional request body content type
 * @returns {Object} Bruno example object
 */
export const createBrunoExample = ({ brunoRequestItem, exampleValue, exampleName, exampleDescription, statusCode, contentType, requestBodySchema = null, requestBodyContentType = null }) => {
  const sanitized = String(exampleName ?? '').replace(/\r?\n/g, ' ').trim();
  const name = sanitized || `${statusCode} Response`;
  const numericStatus = Number(statusCode);
  const safeStatus = Number.isFinite(numericStatus) ? numericStatus : null;
  // Deep copy the body to avoid shared references
  const bodyCopy = {
    mode: brunoRequestItem.request.body.mode,
    json: brunoRequestItem.request.body.json,
    text: brunoRequestItem.request.body.text,
    xml: brunoRequestItem.request.body.xml,
    sparql: brunoRequestItem.request.body.sparql || null,
    formUrlEncoded: (brunoRequestItem.request.body.formUrlEncoded || []).map((item) => ({ ...item })),
    multipartForm: (brunoRequestItem.request.body.multipartForm || []).map((item) => ({
      ...item,
      value: Array.isArray(item.value) ? [...item.value] : item.value
    }))
  };

  const responseBodyType = getBodyTypeFromContentType(contentType);
  const responseBodyContent = responseBodyType === 'xml' && exampleValue !== null && typeof exampleValue === 'object'
    ? buildXmlBody({ example: exampleValue })
    : typeof exampleValue === 'object'
      ? JSON.stringify(exampleValue, null, 2)
      : exampleValue;

  const brunoExample = {
    uid: uuid(),
    itemUid: brunoRequestItem.uid,
    name,
    description: exampleDescription,
    type: 'http-request',
    request: {
      url: brunoRequestItem.request.url,
      method: brunoRequestItem.request.method,
      headers: [...brunoRequestItem.request.headers],
      params: [...brunoRequestItem.request.params],
      body: bodyCopy
    },
    response: {
      status: safeStatus,
      statusText: safeStatus ? getStatusText(safeStatus) : null,
      headers: contentType ? [
        {
          uid: uuid(),
          name: 'Content-Type',
          value: contentType,
          description: '',
          enabled: true
        }
      ] : [],
      body: {
        type: responseBodyType,
        content: responseBodyContent
      }
    }
  };

  // Populate request body from schema if provided (reuses BODY_TYPE_HANDLERS)
  if (requestBodySchema !== null) {
    populateRequestBody({ body: brunoExample.request.body, bodySchema: requestBodySchema, contentType: requestBodyContentType });
  }

  return brunoExample;
};

/**
 * Groups requests by their first tag
 * @param {Array} requests - Array of parsed request objects
 * @param {Object} options - Sanitization options (forwarded to sanitizeTag)
 * @returns {Array} Tuple of [tagGroups, ungroupedRequests]
 */
export const groupRequestsByTags = (requests, options = {}) => {
  let _groups = {};
  let ungrouped = [];
  each(requests, (request) => {
    let tags = request.operationObject.tags || [];
    if (tags.length > 0) {
      let tag = sanitizeTag(tags[0].trim(), options); // take first tag, trim whitespace, and sanitize

      if (tag) {
        if (!_groups[tag]) {
          _groups[tag] = [];
        }
        _groups[tag].push(request);
      } else {
        ungrouped.push(request);
      }
    } else {
      ungrouped.push(request);
    }
  });

  let groups = Object.keys(_groups).map((groupName) => {
    return {
      name: groupName,
      requests: _groups[groupName]
    };
  });

  return [groups, ungrouped];
};

/**
 * Coerces a value into a string.
 * The spec is unvalidated, so a description can arrive as any YAML type. A bad
 * value is dropped rather than failing the whole import.
 * @param {*} value - A value straight off the parsed spec
 * @returns {string} The value, or '' when it isn't a usable string
 */
export const toSpecString = (value) => (typeof value === 'string' ? value : '');

/**
 * Builds a lookup of tag description keyed by sanitized tag name.
 * Folders are named from the sanitized first tag (see groupRequestsByTags), so the
 * spec's top-level tags[] descriptions are keyed the same way to line up with folder names.
 * @param {Array} tags - The spec's top-level tags array (each { name, description })
 * @param {Object} options - Sanitization options (forwarded to sanitizeTag)
 * @returns {Object} Map of sanitized tag name -> description
 */
export const getTagDescriptions = (tags, options = {}) => {
  const descriptions = Object.create(null);
  each(tags || [], (tag) => {
    if (tag && typeof tag === 'object' && typeof tag.name === 'string') {
      const docs = toSpecString(tag.description);
      const key = sanitizeTag(tag.name, options);
      if (key && docs) {
        descriptions[key] = docs;
      }
    }
  });
  return descriptions;
};

/**
 * Groups requests by URL path segments and builds nested folder structures
 * @param {Array} requests - Array of parsed request objects
 * @param {Function} transformFn - Function to transform a request into a Bruno item: (request, usedNames, options) => brunoItem
 * @param {Object} options - Import options
 * @returns {Array} Array of Bruno folder items
 */
export const groupRequestsByPath = (requests, transformFn, options = {}) => {
  const pathGroups = {};

  // Group requests by their path segments
  requests.forEach((request) => {
    // Use original path for grouping to preserve {id} format
    const pathToUse = request.originalPath || request.path;
    const pathSegments = pathToUse.split('/').filter((segment) => segment !== '');

    if (pathSegments.length === 0) {
      // Handle root path or paths with only parameters
      const groupName = 'Root';
      if (!pathGroups[groupName]) {
        pathGroups[groupName] = {
          name: groupName,
          requests: [],
          subGroups: {}
        };
      }
      pathGroups[groupName].requests.push(request);
      return;
    }

    // Use the first segment as the main group
    let groupName = pathSegments[0];

    if (!pathGroups[groupName]) {
      pathGroups[groupName] = {
        name: groupName,
        requests: [],
        subGroups: {}
      };
    }

    // If there's only one meaningful segment, add to main group
    if (pathSegments.length <= 1) {
      pathGroups[groupName].requests.push(request);
    } else {
      // For deeper paths, create sub-groups
      let currentGroup = pathGroups[groupName];
      for (let i = 1; i < pathSegments.length; i++) {
        let subGroupName = pathSegments[i];

        if (!currentGroup.subGroups[subGroupName]) {
          currentGroup.subGroups[subGroupName] = {
            name: subGroupName,
            requests: [],
            subGroups: {}
          };
        }
        currentGroup = currentGroup.subGroups[subGroupName];
      }
      currentGroup.requests.push(request);
    }
  });

  // Convert the nested structure to Bruno folder format
  const buildFolderStructure = (group) => {
    // Create a new usedNames set for each folder/subfolder scope
    const localUsedNames = new Set();
    const items = group.requests.map((req) => transformFn(req, localUsedNames, options));

    // Add sub-folders
    const subFolders = [];
    Object.values(group.subGroups).forEach((subGroup) => {
      const subFolderItems = buildFolderStructure(subGroup);
      if (subFolderItems.length > 0) {
        subFolders.push({
          uid: uuid(),
          name: subGroup.name,
          type: 'folder',
          root: {
            request: {
              auth: { mode: 'inherit', basic: null, bearer: null, digest: null, apikey: null, oauth2: null }
            },
            meta: { name: subGroup.name }
          },
          items: subFolderItems
        });
      }
    });

    return [...items, ...subFolders];
  };

  const folders = Object.values(pathGroups).map((group) => ({
    uid: uuid(),
    name: group.name,
    type: 'folder',
    root: {
      request: {
        auth: { mode: 'inherit', basic: null, bearer: null, digest: null, apikey: null, oauth2: null }
      },
      meta: { name: group.name }
    },
    items: buildFolderStructure(group)
  }));

  return folders;
};
