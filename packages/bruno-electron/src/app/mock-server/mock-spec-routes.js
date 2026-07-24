const { schemaToExample } = require('./mock-example-generator');
const { v4: uuidv4 } = require('uuid');

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

const sortStatusCodes = (statusCodes = []) => (
  [...statusCodes].sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }

    return String(a).localeCompare(String(b));
  })
);

const pickResponseContent = (response = {}) => (
  response.content?.['application/json']
  || response.content?.['text/plain']
  || Object.values(response.content || {})[0]
  || null
);

const pickResponse = (responses = {}) => {
  const statusCodes = sortStatusCodes(Object.keys(responses).filter((code) => code !== 'default'));
  const preferred = statusCodes.find((code) => String(code).startsWith('2')) || statusCodes[0];

  if (!preferred) {
    return { status: 200, statusText: 'OK', content: null };
  }

  const response = responses[preferred] || {};

  return {
    status: Number(preferred) || 200,
    statusText: response.description || 'OK',
    content: pickResponseContent(response)
  };
};

const listOperationResponses = (responses = {}) => {
  const statusCodes = sortStatusCodes(Object.keys(responses).filter((code) => code !== 'default'));

  return statusCodes.map((statusCode) => {
    const response = responses[statusCode] || {};

    return {
      status: Number(statusCode) || 200,
      statusText: response.description || '',
      content: pickResponseContent(response)
    };
  });
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

const buildResponseBody = (content, spec, { generateFromSchema = false } = {}) => {
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

  if (!generateFromSchema) {
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

const buildResponseHeaders = (body) => ([{
  uid: uuidv4(),
  name: 'Content-Type',
  value: body.type === 'json' ? 'application/json' : 'text/plain',
  description: '',
  enabled: true
}]);

const buildMockResponseRecord = ({
  operation,
  method,
  routePath,
  pickedResponse,
  body,
  statusSuffix = null
}) => {
  const baseName = operation.summary || operation.operationId || `${method.toUpperCase()} ${routePath}`;
  const statusLabel = pickedResponse.statusText
    ? `${pickedResponse.status} ${pickedResponse.statusText}`
    : String(pickedResponse.status);
  const name = statusSuffix === null
    ? baseName
    : `${baseName} (${statusLabel})`;

  return {
    uid: uuidv4(),
    name,
    description: operation.description || '',
    copiedFrom: {
      exampleName: null,
      requestPathname: 'openapi-spec'
    },
    request: {
      url: routePath,
      method: method.toUpperCase(),
      headers: [],
      params: [],
      body: {
        mode: 'none'
      }
    },
    response: {
      status: pickedResponse.status,
      statusText: pickedResponse.statusText || 'OK',
      headers: buildResponseHeaders(body),
      body
    },
    rules: {
      operator: 'AND',
      conditions: []
    }
  };
};

const buildRouteMapFromSpec = (spec, options = {}) => {
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
      const operationResponses = listOperationResponses(operation.responses);

      routeMap.set(routeKey, operationResponses.map((pickedResponse) => {
        const body = buildResponseBody(pickedResponse.content, spec, options);

        return {
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
        };
      }));
    }
  }

  return routeMap;
};

const buildMockResponsesFromSpec = (spec, options = {}) => {
  const responses = [];
  if (!spec?.paths) {
    return responses;
  }

  for (const [rawPath, pathItem] of Object.entries(spec.paths)) {
    const routePath = convertOpenApiPath(rawPath);

    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) {
        continue;
      }

      const operationResponses = listOperationResponses(operation.responses);
      const useStatusSuffix = operationResponses.length > 1;

      for (const pickedResponse of operationResponses) {
        const body = buildResponseBody(pickedResponse.content, spec, options);

        responses.push(buildMockResponseRecord({
          operation,
          method,
          routePath,
          pickedResponse,
          body,
          statusSuffix: useStatusSuffix ? pickedResponse.status : null
        }));
      }
    }
  }

  return responses;
};

module.exports = {
  buildRouteMapFromSpec,
  buildMockResponsesFromSpec,
  convertOpenApiPath,
  listOperationResponses,
  buildResponseBody
};
