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

const PREFERRED_MEDIA_TYPES = ['application/json', 'text/plain', 'application/xml'];

const isJsonMediaType = (mediaType) => /[/+]json\b/i.test(mediaType || '');

const pickMediaType = (mediaTypes = []) => (
  PREFERRED_MEDIA_TYPES.find((mediaType) => mediaTypes.includes(mediaType)) || mediaTypes[0]
);

const pickSwagger2ResponseContent = (response, produces) => {
  const exampleMediaType = pickMediaType(Object.keys(response.examples || {}));
  const example = exampleMediaType ? response.examples[exampleMediaType] : undefined;
  if (example === undefined && !response.schema) {
    return null;
  }

  return { example, schema: response.schema, mediaType: exampleMediaType || pickMediaType(produces) };
};

const pickResponseContent = (response = {}, produces = []) => {
  const mediaType = pickMediaType(Object.keys(response.content || {}));
  if (mediaType) {
    return { ...response.content[mediaType], mediaType };
  }

  return pickSwagger2ResponseContent(response, produces);
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

const listOperationResponses = (responses = {}, produces = []) => {
  const statusCodes = sortStatusCodes(Object.keys(responses).filter((code) => code !== 'default'));

  return statusCodes.map((statusCode) => {
    const response = responses[statusCode] || {};

    return {
      status: Number(statusCode) || 200,
      statusText: response.description || '',
      content: pickResponseContent(response, produces)
    };
  });
};

const isJsonText = (text) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

// Strings stay as-is for text/XML media types. Under a JSON media type they must be valid
// JSON on the wire, so plain strings are encoded while strings that already hold JSON are kept.
const serializeExample = (example, mediaType) => {
  if (typeof example === 'string' && (!isJsonMediaType(mediaType) || isJsonText(example))) {
    return {
      type: isJsonMediaType(mediaType) ? 'json' : 'text',
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
    return serializeExample(content.example, content.mediaType);
  }

  if (content?.examples && typeof content.examples === 'object') {
    const firstExample = Object.values(content.examples)[0];
    if (firstExample?.value !== undefined) {
      return serializeExample(firstExample.value, content.mediaType);
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

  return serializeExample(schemaToExample(content.schema, spec), content.mediaType);
};

// A JSON body keeps a JSON-family media type (e.g. application/problem+json) but never takes a
// non-JSON one: schemas declared only as XML are still generated as JSON.
const buildResponseHeaders = (body, mediaType) => ([{
  uid: uuidv4(),
  name: 'Content-Type',
  value: body.type === 'json'
    ? (isJsonMediaType(mediaType) ? mediaType : 'application/json')
    : mediaType || 'text/plain',
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
      headers: buildResponseHeaders(body, pickedResponse.content?.mediaType),
      body
    },
    rules: {
      operator: 'AND',
      conditions: []
    }
  };
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

      const produces = [operation.produces, spec.produces].find(Array.isArray) || [];
      const operationResponses = listOperationResponses(operation.responses, produces);
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
  buildMockResponsesFromSpec,
  convertOpenApiPath,
  listOperationResponses,
  buildResponseBody
};
