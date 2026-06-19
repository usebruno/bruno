const { schemaToExample } = require('./mock-example-generator');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

const convertOpenApiPath = (path) => {
  let converted = (path || '/').replace(/{([^}]+)}/g, ':$1');
  if (!converted.startsWith('/')) {
    converted = `/${converted}`;
  }
  if (converted.length > 1 && converted.endsWith('/')) {
    converted = converted.slice(0, -1);
  }

  return converted.replace(/\/+/g, '/');
};

const pickResponse = (responses = {}) => {
  const statusCodes = Object.keys(responses).sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });

  const preferred = statusCodes.find((code) => code.startsWith('2')) || statusCodes[0];
  if (!preferred) {
    return { status: 200, statusText: 'OK', content: null };
  }

  const response = responses[preferred] || {};
  const content = response.content?.['application/json']
    || response.content?.['text/plain']
    || Object.values(response.content || {})[0];

  return {
    status: Number(preferred) || 200,
    statusText: response.description || 'OK',
    content: content || null
  };
};

const serializeExample = (example) => {
  if (typeof example === 'string') {
    return {
      type: 'text',
      content: example
    };
  }

  return {
    type: 'json',
    content: JSON.stringify(example ?? {}, null, 2)
  };
};

const buildResponseBody = (content, spec) => {
  if (content?.example !== undefined) {
    return serializeExample(content.example);
  }

  if (content?.examples && typeof content.examples === 'object') {
    const firstExample = Object.values(content.examples)[0];
    if (firstExample?.value !== undefined) {
      return serializeExample(firstExample.value);
    }
  }

  if (!content?.schema) {
    return {
      type: 'json',
      content: '{}'
    };
  }

  const example = schemaToExample(content.schema, spec);
  const resolvedType = content.schema?.type;
  const bodyType = resolvedType === 'string' ? 'text' : 'json';

  return {
    type: bodyType,
    content: bodyType === 'json'
      ? JSON.stringify(example ?? {}, null, 2)
      : String(example ?? '')
  };
};

const buildRouteMapFromSpec = (spec) => {
  const routeMap = new Map();
  if (!spec?.paths) {
    return routeMap;
  }

  for (const [rawPath, pathItem] of Object.entries(spec.paths)) {
    const routePath = convertOpenApiPath(rawPath);

    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) {
        continue;
      }

      const routeKey = `${method.toUpperCase()} ${routePath}`;
      const pickedResponse = pickResponse(operation.responses);
      const body = buildResponseBody(pickedResponse.content, spec);

      routeMap.set(routeKey, [{
        exampleName: operation.operationId || `${method.toUpperCase()} ${routePath}`,
        sourceFile: 'openapi-spec',
        requestItemName: operation.summary || operation.operationId || routePath,
        response: {
          status: pickedResponse.status,
          statusText: pickedResponse.statusText,
          headers: [{
            name: 'Content-Type',
            value: body.type === 'json' ? 'application/json' : 'text/plain'
          }],
          body
        }
      }]);
    }
  }

  return routeMap;
};

module.exports = {
  buildRouteMapFromSpec,
  convertOpenApiPath
};
