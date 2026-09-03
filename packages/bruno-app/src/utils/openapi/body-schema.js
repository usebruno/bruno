import jsyaml from 'js-yaml';

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

const decodePointerToken = (token) => token.replace(/~1/g, '/').replace(/~0/g, '~');

const resolvePointer = (document, ref) => {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  return ref
    .slice(2)
    .split('/')
    .map(decodePointerToken)
    .reduce((value, key) => value?.[key], document);
};

const mergeAllOfObjectShape = (schemas) => schemas.reduce((result, schema) => ({
  properties: { ...(result.properties || {}), ...(schema.properties || {}) },
  required: [...new Set([...(result.required || []), ...(schema.required || [])])]
}), {});

const dereferenceSchema = (schema, document, resolving = new Set()) => {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map((entry) => dereferenceSchema(entry, document, resolving));

  if (schema.$ref) {
    if (resolving.has(schema.$ref)) return {};
    const resolved = resolvePointer(document, schema.$ref);
    if (!resolved) return { ...schema };
    const nextResolving = new Set(resolving).add(schema.$ref);
    return {
      ...dereferenceSchema(resolved, document, nextResolving),
      ...dereferenceSchema(Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref')), document, nextResolving)
    };
  }

  const result = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, dereferenceSchema(value, document, resolving)])
  );

  if (Array.isArray(result.allOf)) {
    const { allOf, ...schemaWithoutAllOf } = result;
    const objectShape = mergeAllOfObjectShape(allOf);
    const properties = { ...(objectShape.properties || {}), ...(schemaWithoutAllOf.properties || {}) };
    const required = [...new Set([...(objectShape.required || []), ...(schemaWithoutAllOf.required || [])])];
    return {
      ...schemaWithoutAllOf,
      allOf,
      ...(Object.keys(properties).length ? { properties } : {}),
      ...(required.length ? { required } : {})
    };
  }

  if (result.nullable === true && typeof result.type === 'string') {
    result.type = [result.type, 'null'];
  }

  return result;
};

const normalizeRequestPath = (url = '') => {
  const withoutVariables = String(url).replace(/\{\{[^}]+}}/g, '');
  const withoutOrigin = withoutVariables.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '');
  return (withoutOrigin.split(/[?#]/)[0] || '/')
    .replace(/:([A-Za-z0-9_-]+)/g, '{$1}')
    .replace(/\/{2,}/g, '/');
};

const findOperation = (document, { operationId, method, url }) => {
  const normalizedMethod = String(method || '').toLowerCase();
  const normalizedPath = normalizeRequestPath(url);

  for (const [path, pathItem] of Object.entries(document.paths || {})) {
    for (const [candidateMethod, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(candidateMethod) || !operation || typeof operation !== 'object') continue;
      if (operationId && operation.operationId === operationId) {
        return { operation, path, method: candidateMethod, pathItem };
      }
      if (!operationId && candidateMethod === normalizedMethod && normalizeRequestPath(path) === normalizedPath) {
        return { operation, path, method: candidateMethod, pathItem };
      }
    }
  }

  return null;
};

export const parseOpenApiDocument = (content) => {
  if (content && typeof content === 'object') return content;
  return jsyaml.load(String(content || ''));
};

export const listOpenApiOperations = (document) => {
  const operations = [];

  for (const [path, pathItem] of Object.entries(document?.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== 'object') continue;
      operations.push({
        operationId: operation.operationId || null,
        method,
        path,
        summary: operation.summary || operation.description || ''
      });
    }
  }

  return operations;
};

export const resolveOpenApiOperation = (document, contract, request) => {
  if (!document?.openapi?.startsWith?.('3.')) {
    throw new Error('The source is not an OpenAPI 3.x specification');
  }

  const operationId = contract?.operationId;
  const descriptor = findOperation(document, {
    operationId,
    method: request?.method,
    url: request?.url
  });
  if (!descriptor) {
    throw new Error(operationId
      ? `OpenAPI operation "${operationId}" was not found`
      : 'No OpenAPI operation matches the current method and URL');
  }

  return descriptor;
};

export const createOpenApiOperationDocument = (document, descriptor) => {
  if (!descriptor?.operation || !descriptor?.path || !descriptor?.method) return null;

  const sharedPathFields = Object.fromEntries(
    Object.entries(descriptor.pathItem || {}).filter(([key]) => !HTTP_METHODS.has(key))
  );
  const operationDocument = {
    openapi: document.openapi,
    info: document.info,
    paths: {
      [descriptor.path]: {
        ...sharedPathFields,
        [descriptor.method]: descriptor.operation
      }
    }
  };

  for (const key of ['jsonSchemaDialect', 'servers', 'security', 'tags', 'externalDocs', 'components']) {
    if (document[key] !== undefined) operationDocument[key] = document[key];
  }

  return operationDocument;
};

export const resolveOpenApiBodySchema = (document, contract, request) => {
  const descriptor = resolveOpenApiOperation(document, contract, request);
  const { operation } = descriptor;

  const requestBody = operation.requestBody?.$ref
    ? resolvePointer(document, operation.requestBody.$ref)
    : operation.requestBody;
  const content = requestBody?.content || {};
  const contentType = Object.keys(content).find((type) => type === 'application/json')
    || Object.keys(content).find((type) => type.split(';')[0].trim() === 'application/json')
    || Object.keys(content).find((type) => type.split(';')[0].trim().endsWith('+json'));

  if (!contentType) {
    throw new Error('The OpenAPI operation does not define a JSON request body');
  }
  if (!content[contentType]?.schema) {
    throw new Error(`The OpenAPI ${contentType} request body does not define a schema`);
  }

  return {
    schema: dereferenceSchema(content[contentType].schema, document),
    operationId: operation.operationId || contract?.operationId || null,
    contentType,
    descriptor
  };
};
