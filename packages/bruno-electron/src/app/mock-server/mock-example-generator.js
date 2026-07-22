const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { openApiToBruno } = require('@usebruno/converters');
const { parseRequest, stringifyRequestViaWorker } = require('@usebruno/filestore');
const { searchForRequestFiles, getCollectionFormat, writeFile } = require('../../utils/filesystem');
const { normalizeUrlPath } = require('./mock-server-routing');
const { loadCollectionOpenApiSpec } = require('./mock-spec-loader');

let faker;
try {
  const fakerModule = require('@faker-js/faker');
  faker = fakerModule.faker || fakerModule;
} catch {
  faker = null;
}

const fakerInt = (min, max) => {
  if (!faker) return 1;
  if (faker.number?.int) return faker.number.int({ min, max });
  if (faker.datatype?.number) return faker.datatype.number({ min, max });
  return 1;
};

const fakerFloat = (min, max) => {
  if (!faker) return 1;
  if (faker.number?.float) return faker.number.float({ min, max, fractionDigits: 2 });
  if (faker.datatype?.float) return faker.datatype.float({ min, max, precision: 0.01 });
  return 1;
};

const fakerBoolean = () => {
  if (!faker) return true;
  if (faker.datatype?.boolean) return faker.datatype.boolean();
  return true;
};

const fakerUuid = () => {
  if (!faker) return '00000000-0000-4000-8000-000000000000';
  if (faker.string?.uuid) return faker.string.uuid();
  if (faker.datatype?.uuid) return faker.datatype.uuid();
  return '00000000-0000-4000-8000-000000000000';
};

const fakerWords = () => {
  if (!faker) return 'string';
  if (faker.lorem?.words) {
    let words = '';
    try {
      words = faker.lorem.words({ min: 1, max: 3 });
    } catch {
      words = '';
    }
    if (!words) {
      words = faker.lorem.words(2);
    }
    return words || 'string';
  }
  if (faker.lorem?.word) return faker.lorem.word();
  return 'string';
};

const buildSpecItemsMap = (collectionItems) => {
  const map = new Map();

  const flatten = (items) => {
    for (const item of items || []) {
      if (item.type === 'folder' && item.items) {
        flatten(item.items);
        continue;
      }

      if (!item.request) continue;

      const method = item.request.method?.toUpperCase() || 'GET';
      const urlPath = normalizeUrlPath(item.request.url);
      map.set(`${method}:${urlPath}`, item);
    }
  };

  flatten(collectionItems);
  return map;
};

const schemaToExample = (schema, spec = null, depth = 0, refStack = new Set()) => {
  if (!schema || depth > 8) return null;

  const resolvedSchema = spec ? resolveOpenApiSchema(spec, schema, refStack) : schema;
  if (!resolvedSchema) return null;

  if (resolvedSchema.example !== undefined) return resolvedSchema.example;
  if (resolvedSchema.default !== undefined) return resolvedSchema.default;
  if (Array.isArray(resolvedSchema.enum) && resolvedSchema.enum.length) return resolvedSchema.enum[0];

  const type = Array.isArray(resolvedSchema.type) ? resolvedSchema.type[0] : resolvedSchema.type;

  if (type === 'object' || resolvedSchema.properties) {
    const result = {};
    for (const [key, value] of Object.entries(resolvedSchema.properties || {})) {
      result[key] = schemaToExample(value, spec, depth + 1, refStack);
    }
    return result;
  }

  if (type === 'array') {
    const itemCount = Math.max(resolvedSchema.minItems || 2, 1);
    const items = [];
    for (let i = 0; i < Math.min(itemCount, 5); i += 1) {
      items.push(schemaToExample(resolvedSchema.items || {}, spec, depth + 1, new Set(refStack)));
    }
    return items;
  }

  return generatePrimitiveExample(resolvedSchema, type);
};

const resolveOpenApiRef = (spec, ref) => {
  if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) {
    return null;
  }

  return ref.slice(2).split('/').reduce((current, segment) => {
    if (current == null) {
      return null;
    }
    return current[segment];
  }, spec);
};

const resolveOpenApiSchema = (spec, schema, refStack = new Set()) => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (schema.$ref) {
    if (!spec || refStack.has(schema.$ref)) {
      return null;
    }

    refStack.add(schema.$ref);
    const target = resolveOpenApiRef(spec, schema.$ref);
    return resolveOpenApiSchema(spec, target, refStack);
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length) {
    let merged = { type: 'object', properties: {}, required: [] };

    for (const part of schema.allOf) {
      const resolved = resolveOpenApiSchema(spec, part, new Set(refStack));
      if (!resolved) {
        continue;
      }

      if (resolved.properties) {
        merged.properties = { ...merged.properties, ...resolved.properties };
        merged.required = [...merged.required, ...(resolved.required || [])];
      }

      if (resolved.type && !merged.type) {
        merged.type = resolved.type;
      }

      if (resolved.items && !merged.items) {
        merged.items = resolved.items;
      }
    }

    return merged;
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
    return resolveOpenApiSchema(spec, schema.oneOf[0], refStack);
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    return resolveOpenApiSchema(spec, schema.anyOf[0], refStack);
  }

  return schema;
};

const generatePrimitiveExample = (schema, type) => {
  if (type === 'integer') {
    const min = typeof schema.minimum === 'number' ? schema.minimum : 1;
    const max = typeof schema.maximum === 'number' ? schema.maximum : 100;
    return fakerInt(min, max);
  }

  if (type === 'number') {
    const min = typeof schema.minimum === 'number' ? schema.minimum : 1;
    const max = typeof schema.maximum === 'number' ? schema.maximum : 100;
    return fakerFloat(min, max);
  }

  if (type === 'boolean') {
    return fakerBoolean();
  }

  if (type === 'string') {
    if (schema.format === 'date-time' && faker) return faker.date.recent().toISOString();
    if (schema.format === 'date' && faker) return faker.date.recent().toISOString().slice(0, 10);
    if (schema.format === 'email' && faker) return faker.internet.email();
    if (schema.format === 'uuid') return fakerUuid();
    if (schema.format === 'uri' && faker) return faker.internet.url();
    if (schema.format === 'password' && faker) return faker.internet.password();
    return fakerWords();
  }

  return null;
};

const getResponseBodyFromSpecItem = (specItem) => {
  if (specItem?.examples?.length) {
    const example = specItem.examples[0];
    return {
      status: Number(example.response?.status) || 200,
      statusText: example.response?.statusText || 'OK',
      headers: example.response?.headers || [],
      body: example.response?.body || { type: 'json', content: '{}' }
    };
  }

  return {
    status: 200,
    statusText: 'OK',
    headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }],
    body: { type: 'json', content: '{}' }
  };
};

const createDefaultExample = (parsedRequest) => {
  const method = parsedRequest.request?.method || 'GET';
  const url = parsedRequest.request?.url || '/';

  return {
    uid: uuidv4(),
    name: '200 OK',
    type: 'http-request',
    request: {
      method,
      url
    },
    response: {
      status: 200,
      statusText: 'OK',
      headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }],
      body: {
        type: 'json',
        content: '{}'
      }
    }
  };
};

const cloneExamplesFromSpecItem = (specItem, parsedRequest) => {
  if (!specItem?.examples?.length) {
    return [createDefaultExample(parsedRequest)];
  }

  return specItem.examples.map((example) => ({
    ...example,
    uid: example.uid || uuidv4(),
    request: {
      method: example.request?.method || parsedRequest.request?.method || 'GET',
      url: example.request?.url || parsedRequest.request?.url || '/'
    }
  }));
};

const shouldSkipRequestFile = (basename, relativePath) => {
  if (basename === 'collection.bru' || basename === 'folder.bru') return true;
  if (basename === 'opencollection.yml' || basename === 'folder.yml') return true;

  const relDir = path.dirname(relativePath);
  return relDir === 'environments' || relDir.startsWith(`environments${path.sep}`)
    || relDir === 'mocks' || relDir.startsWith(`mocks${path.sep}`);
};

const ensureMockExamples = async (collectionPath, brunoConfig) => {
  const format = getCollectionFormat(collectionPath);
  const spec = await loadCollectionOpenApiSpec(collectionPath, brunoConfig);
  let specItemsMap = new Map();

  if (spec) {
    const groupBy = brunoConfig?.openapi?.[0]?.groupBy || 'tags';
    const brunoFromSpec = openApiToBruno(spec, { groupBy });
    specItemsMap = buildSpecItemsMap(brunoFromSpec.items || []);
  }

  let filesUpdated = 0;
  let examplesGenerated = 0;
  const files = searchForRequestFiles(collectionPath, collectionPath);

  for (const filePath of files) {
    const basename = path.basename(filePath);
    const relativePath = path.relative(collectionPath, filePath);
    if (shouldSkipRequestFile(basename, relativePath)) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    let parsed;
    try {
      parsed = parseRequest(content, { format });
    } catch {
      continue;
    }

    if (!parsed?.request) continue;
    if (parsed?.examples?.length) continue;

    const requestType = parsed.type || 'http-request';
    if (requestType !== 'http-request' && requestType !== 'http') continue;

    const method = parsed.request.method?.toUpperCase() || 'GET';
    const routeId = `${method}:${normalizeUrlPath(parsed.request.url)}`;
    const specItem = specItemsMap.get(routeId);

    parsed.examples = cloneExamplesFromSpecItem(specItem, parsed);
    examplesGenerated += parsed.examples.length;

    const updatedContent = await stringifyRequestViaWorker(parsed, { format });
    await writeFile(filePath, updatedContent);
    filesUpdated += 1;
  }

  return { filesUpdated, examplesGenerated, specLoaded: Boolean(spec) };
};

module.exports = {
  ensureMockExamples,
  schemaToExample,
  resolveOpenApiSchema,
  createDefaultExample
};
