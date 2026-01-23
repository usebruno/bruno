import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';

// Content type patterns for matching MIME type variants
// These patterns handle structured types with many variants (e.g., application/ld+json, application/vnd.api+json)
// MIME types can contain: letters, numbers, hyphens, dots, and plus signs
const CONTENT_TYPE_PATTERNS = {
  // Matches: application/json, application/ld+json, application/vnd.api+json, text/json, etc.
  // Pattern: type/([base]+)?suffix where suffix is json
  JSON: /^[\w\-.+]+\/([\w\-.+]+\+)?json$/,
  // Matches: application/xml, text/xml, application/atom+xml, application/rss+xml, application/xhtml+xml, etc.
  // Pattern: type/([base]+)?suffix where suffix is xml
  XML: /^[\w\-.+]+\/([\w\-.+]+\+)?xml$/,
  // Matches: text/html
  // Pattern: type/([base]+)?suffix where suffix is html
  HTML: /^[\w\-.+]+\/([\w\-.+]+\+)?html$/
};

const ensureUrl = (url) => {
  // removing multiple slashes after the protocol if it exists, or after the beginning of the string otherwise
  return url.replace(/([^:])\/{2,}/g, '$1/');
};

const getStatusText = (statusCode) => {
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
const getBodyTypeFromContentType = (contentType) => {
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

const buildEmptyJsonBody = (bodySchema, visited = new Map()) => {
  // Check for circular references
  if (visited.has(bodySchema)) {
    return {};
  }

  // Add this schema to visited map
  visited.set(bodySchema, true);

  let _jsonBody = {};
  each(bodySchema.properties || {}, (prop, name) => {
    if (prop.type === 'object' || prop.properties) {
      _jsonBody[name] = buildEmptyJsonBody(prop, visited);
    } else if (prop.type === 'array') {
      if (prop.items && (prop.items.type === 'object' || prop.items.properties)) {
        _jsonBody[name] = [buildEmptyJsonBody(prop.items, visited)];
      } else {
        _jsonBody[name] = [];
      }
    } else if (prop.type === 'integer' || prop.type === 'number') {
      _jsonBody[name] = 0;
    } else if (prop.type === 'boolean') {
      _jsonBody[name] = false;
    } else {
      _jsonBody[name] = '';
    }
  });
  return _jsonBody;
};

/**
 * Extracts or generates an example value from an OpenAPI schema
 * Handles objects, arrays, primitives, and explicit examples
 * @param {Object} schema - The OpenAPI schema object
 * @returns {*} - The example value (object, array, or primitive)
 */
const getExampleFromSchema = (schema) => {
  // Check for explicit example first
  if (schema.example !== undefined) {
    return schema.example;
  }

  // Handle different schema types
  if (schema.type === 'object' || (schema.properties && !schema.type)) {
    // Handle object type or schema with properties (even if type is not explicitly set)
    return buildEmptyJsonBody(schema);
  } else if (schema.type === 'array') {
    if (schema.items) {
      // If items are objects (either by type or by having properties), create array with one example object
      if (schema.items.type === 'object' || schema.items.properties) {
        return [buildEmptyJsonBody(schema.items)];
      }
      // For primitive array items, return array with default value
      if (schema.items.type === 'integer' || schema.items.type === 'number') {
        return [0];
      } else if (schema.items.type === 'boolean') {
        return [false];
      } else if (schema.items.type === 'string') {
        return [''];
      }
    }
    return [];
  } else {
    // For primitive types, use default values
    if (schema.type === 'integer' || schema.type === 'number') {
      return 0;
    } else if (schema.type === 'boolean') {
      return false;
    }
    return '';
  }
};

/**
 * Populates request body in Bruno example from a value
 * Uses pattern matching to handle various MIME type variants
 * @param {Object} params - Parameters object
 * @param {Object} params.body - The Bruno request body object to populate
 * @param {*} params.requestBodyValue - The request body value to set
 * @param {string} params.contentType - Content type (e.g., 'application/json', 'application/ld+json')
 */
const populateRequestBody = ({ body, requestBodyValue, contentType }) => {
  if (!requestBodyValue || !contentType || typeof contentType !== 'string') return;

  // Normalize: lowercase (content types from OpenAPI spec object keys may vary in case)
  const normalizedContentType = contentType.toLowerCase();

  if (CONTENT_TYPE_PATTERNS.JSON.test(normalizedContentType)) {
    body.mode = 'json';
    body.json = typeof requestBodyValue === 'object' ? JSON.stringify(requestBodyValue, null, 2) : requestBodyValue;
  } else if (normalizedContentType === 'application/x-www-form-urlencoded') {
    body.mode = 'formUrlEncoded';
    // Handle form data if needed
  } else if (normalizedContentType === 'multipart/form-data') {
    body.mode = 'multipartForm';
    // Handle multipart form data if needed
  } else if (normalizedContentType === 'text/plain') {
    body.mode = 'text';
    body.text = typeof requestBodyValue === 'object' ? JSON.stringify(requestBodyValue) : String(requestBodyValue);
  } else if (CONTENT_TYPE_PATTERNS.XML.test(normalizedContentType)) {
    body.mode = 'xml';
    body.xml = typeof requestBodyValue === 'object' ? JSON.stringify(requestBodyValue) : String(requestBodyValue);
  }
};

/**
 * Creates a Bruno example from OpenAPI example data
 * @param {Object} params - Parameters object
 * @param {Object} params.brunoRequestItem - The base Bruno request item
 * @param {*} params.exampleValue - The example value (object, array, or primitive)
 * @param {string} params.exampleName - Name of the example
 * @param {string} params.exampleDescription - Description of the example
 * @param {string|number} params.statusCode - HTTP status code (for response examples)
 * @param {string} params.contentType - Content type (e.g., 'application/json')
 * @param {*} [params.requestBodyValue] - Optional request body value to populate in the example
 * @param {string} [params.requestBodyContentType] - Optional request body content type
 * @returns {Object} Bruno example object
 */
const createBrunoExample = ({ brunoRequestItem, exampleValue, exampleName, exampleDescription, statusCode, contentType, requestBodyValue = null, requestBodyContentType = null }) => {
  const brunoExample = {
    uid: uuid(),
    itemUid: brunoRequestItem.uid,
    name: exampleName,
    description: exampleDescription,
    type: 'http-request',
    request: {
      url: brunoRequestItem.request.url,
      method: brunoRequestItem.request.method,
      headers: [...brunoRequestItem.request.headers],
      params: [...brunoRequestItem.request.params],
      body: { ...brunoRequestItem.request.body }
    },
    response: {
      status: String(statusCode),
      statusText: getStatusText(statusCode),
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
        type: getBodyTypeFromContentType(contentType),
        content: typeof exampleValue === 'object' ? JSON.stringify(exampleValue, null, 2) : exampleValue
      }
    }
  };

  // Populate request body if provided
  if (requestBodyValue !== null) {
    populateRequestBody({ body: brunoExample.request.body, requestBodyValue, contentType: requestBodyContentType });
  }

  return brunoExample;
};

const transformOpenapiRequestItem = (request, usedNames = new Set()) => {
  let _operationObject = request.operationObject;

  let operationName = _operationObject.summary || _operationObject.operationId || _operationObject.description;
  if (!operationName) {
    operationName = `${request.method} ${request.path}`;
  }

  // Sanitize operation name to prevent Bruno parsing issues
  if (operationName) {
    // Replace line breaks and normalize whitespace
    operationName = operationName.replace(/[\r\n\s]+/g, ' ').trim();
  }
  if (usedNames.has(operationName)) {
    // Make name unique to prevent filename collisions
    // Try adding method info first
    let uniqueName = `${operationName} (${request.method.toUpperCase()})`;

    // If still not unique, add counter
    let counter = 1;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${operationName} (${counter})`;
      counter++;
    }

    operationName = uniqueName;
  }
  usedNames.add(operationName);

  // replace OpenAPI links in path by Bruno variables
  let path = request.path.replace(/{([a-zA-Z]+)}/g, `{{${_operationObject.operationId}_$1}}`);

  const brunoRequestItem = {
    uid: uuid(),
    name: operationName,
    type: 'http-request',
    request: {
      url: ensureUrl(request.global.server + path),
      method: request.method.toUpperCase(),
      auth: {
        mode: 'inherit',
        basic: null,
        bearer: null,
        digest: null,
        apikey: null,
        oauth2: null
      },
      headers: [],
      params: [],
      body: {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: []
      },
      script: {
        res: null
      }
    }
  };

  each(_operationObject.parameters || [], (param) => {
    // Check if parameter schema is an object type with properties
    // If so, expand the properties into individual parameters
    const isObjectSchema = param.schema && param.schema.properties;

    if (isObjectSchema) {
      // Expand object schema properties into individual parameters
      each(param.schema.properties, (prop, propName) => {
        const isRequired = Array.isArray(param.schema.required) && param.schema.required.includes(propName);

        if (param.in === 'query') {
          brunoRequestItem.request.params.push({
            uid: uuid(),
            name: propName,
            value: '',
            description: prop.description || '',
            enabled: isRequired,
            type: 'query'
          });
        } else if (param.in === 'path') {
          brunoRequestItem.request.params.push({
            uid: uuid(),
            name: propName,
            value: '',
            description: prop.description || '',
            enabled: isRequired,
            type: 'path'
          });
        } else if (param.in === 'header') {
          brunoRequestItem.request.headers.push({
            uid: uuid(),
            name: propName,
            value: '',
            description: prop.description || '',
            enabled: isRequired
          });
        }
      });
    } else {
      if (param.in === 'query') {
        brunoRequestItem.request.params.push({
          uid: uuid(),
          name: param.name,
          value: '',
          description: param.description || '',
          enabled: param.required,
          type: 'query'
        });
      } else if (param.in === 'path') {
        brunoRequestItem.request.params.push({
          uid: uuid(),
          name: param.name,
          value: '',
          description: param.description || '',
          enabled: param.required,
          type: 'path'
        });
      } else if (param.in === 'header') {
        brunoRequestItem.request.headers.push({
          uid: uuid(),
          name: param.name,
          value: '',
          description: param.description || '',
          enabled: param.required
        });
      }
    }
  });

  // Handle explicit no-auth case where security: [] on the operation
  if (Array.isArray(_operationObject.security) && _operationObject.security.length === 0) {
    brunoRequestItem.request.auth.mode = 'inherit';
    return brunoRequestItem;
  }

  let auth = null;
  if (_operationObject.security && _operationObject.security.length > 0) {
    const schemeName = Object.keys(_operationObject.security[0])[0];
    auth = request.global.security.getScheme(schemeName);
  }

  if (auth) {
    if (auth.type === 'http' && auth.scheme === 'basic') {
      brunoRequestItem.request.auth.mode = 'basic';
      brunoRequestItem.request.auth.basic = {
        username: '{{username}}',
        password: '{{password}}'
      };
    } else if (auth.type === 'http' && auth.scheme === 'bearer') {
      brunoRequestItem.request.auth.mode = 'bearer';
      brunoRequestItem.request.auth.bearer = {
        token: '{{token}}'
      };
    } else if (auth.type === 'http' && auth.scheme === 'digest') {
      brunoRequestItem.request.auth.mode = 'digest';
      brunoRequestItem.request.auth.digest = {
        username: '{{username}}',
        password: '{{password}}'
      };
    } else if (auth.type === 'apiKey') {
      const apikeyConfig = {
        key: auth.name,
        value: '{{apiKey}}',
        placement: auth.in === 'query' ? 'queryparams' : 'header'
      };
      brunoRequestItem.request.auth.mode = 'apikey';
      brunoRequestItem.request.auth.apikey = apikeyConfig;

      if (auth.in === 'header' || auth.in === 'cookie') {
        brunoRequestItem.request.headers.push({
          uid: uuid(),
          name: auth.name,
          value: '{{apiKey}}',
          description: auth.description || '',
          enabled: true
        });
      } else if (auth.in === 'query') {
        brunoRequestItem.request.params.push({
          uid: uuid(),
          name: auth.name,
          value: '{{apiKey}}',
          description: auth.description || '',
          enabled: true,
          type: 'query'
        });
      }
    } else if (auth.type === 'oauth2') {
      // Determine flow (grant type)
      let flows = auth.flows || {};
      let grantType = 'client_credentials';
      if (flows.authorizationCode) {
        grantType = 'authorization_code';
      } else if (flows.implicit) {
        grantType = 'implicit';
      } else if (flows.password) {
        grantType = 'password';
      } else if (flows.clientCredentials) {
        grantType = 'client_credentials';
      }

      let flowConfig = {};
      switch (grantType) {
        case 'authorization_code':
          flowConfig = flows.authorizationCode || {};
          break;
        case 'implicit':
          flowConfig = flows.implicit || {};
          break;
        case 'password':
          flowConfig = flows.password || {};
          break;
        case 'client_credentials':
        default:
          flowConfig = flows.clientCredentials || {};
          break;
      }

      brunoRequestItem.request.auth.mode = 'oauth2';
      brunoRequestItem.request.auth.oauth2 = {
        grantType: grantType,
        authorizationUrl: flowConfig.authorizationUrl || '{{oauth_authorize_url}}',
        accessTokenUrl: flowConfig.tokenUrl || '{{oauth_token_url}}',
        refreshTokenUrl: flowConfig.refreshUrl || '{{oauth_refresh_url}}',
        callbackUrl: '{{oauth_callback_url}}',
        clientId: '{{oauth_client_id}}',
        clientSecret: '{{oauth_client_secret}}',
        scope: Array.isArray(flowConfig.scopes) ? flowConfig.scopes.join(' ') : Object.keys(flowConfig.scopes || {}).join(' '),
        state: '{{oauth_state}}',
        credentialsPlacement: 'header',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        autoFetchToken: false,
        autoRefreshToken: true
      };
    }
  }

  // TODO: handle allOf/anyOf/oneOf
  if (_operationObject.requestBody) {
    let content = get(_operationObject, 'requestBody.content', {});
    let mimeType = Object.keys(content)[0];
    let body = content[mimeType] || {};
    let bodySchema = body.schema;

    // Normalize: lowercase (object keys may vary in case)
    const normalizedMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase() : '';

    if (CONTENT_TYPE_PATTERNS.JSON.test(normalizedMimeType)) {
      brunoRequestItem.request.body.mode = 'json';
      if (bodySchema && (bodySchema.type === 'object' || bodySchema.properties)) {
        let _jsonBody = buildEmptyJsonBody(bodySchema);
        brunoRequestItem.request.body.json = JSON.stringify(_jsonBody, null, 2);
      }
      if (bodySchema && bodySchema.type === 'array') {
        brunoRequestItem.request.body.json = JSON.stringify([buildEmptyJsonBody(bodySchema.items)], null, 2);
      }
    } else if (normalizedMimeType === 'application/x-www-form-urlencoded') {
      brunoRequestItem.request.body.mode = 'formUrlEncoded';
      if (bodySchema && (bodySchema.type === 'object' || bodySchema.properties)) {
        each(bodySchema.properties || {}, (prop, name) => {
          brunoRequestItem.request.body.formUrlEncoded.push({
            uid: uuid(),
            name: name,
            value: '',
            description: prop.description || '',
            enabled: true
          });
        });
      }
    } else if (normalizedMimeType === 'multipart/form-data') {
      brunoRequestItem.request.body.mode = 'multipartForm';
      if (bodySchema && (bodySchema.type === 'object' || bodySchema.properties)) {
        each(bodySchema.properties || {}, (prop, name) => {
          brunoRequestItem.request.body.multipartForm.push({
            uid: uuid(),
            type: 'text',
            name: name,
            value: '',
            description: prop.description || '',
            enabled: true
          });
        });
      }
    } else if (normalizedMimeType === 'text/plain') {
      brunoRequestItem.request.body.mode = 'text';
      brunoRequestItem.request.body.text = '';
    } else if (CONTENT_TYPE_PATTERNS.XML.test(normalizedMimeType)) {
      brunoRequestItem.request.body.mode = 'xml';
      brunoRequestItem.request.body.xml = '';
    }
  }

  // build the extraction scripts from responses that have links
  // https://swagger.io/docs/specification/links/
  let script = [];
  each(_operationObject.responses || [], (response, responseStatus) => {
    if (Object.hasOwn(response, 'links')) {
      // only extract if the status code matches the response
      script.push(`if (res.status === ${responseStatus}) {`);
      each(response.links, (link) => {
        each(link.parameters || [], (expression, parameter) => {
          let value = openAPIRuntimeExpressionToScript(expression);
          script.push(`  bru.setVar('${link.operationId}_${parameter}', ${value});`);
        });
      });
      script.push(`}`);
    }
  });
  if (script.length > 0) {
    brunoRequestItem.request.script.res = script.join('\n');
  }

  // Handle OpenAPI examples from responses and request body
  if (_operationObject.responses) {
    const examples = [];

    // Extract request body examples if they exist
    // Unified structure: all request body data is stored as examples with contentType
    const requestBodyExamples = [];

    /**
     * Helper function to create examples with appropriate request body handling
     * @param {Object} params - Parameters object
     * @param {*} params.responseExampleValue - The response example value
     * @param {string} params.exampleName - Name of the example
     * @param {string} params.exampleDescription - Description of the example
     * @param {string|number} params.statusCode - HTTP status code
     * @param {string} params.responseContentType - Response content type
     * @param {string} [params.responseExampleKey] - Optional response example key for matching
     */
    const createExamplesWithRequestBody = ({ responseExampleValue, exampleName, exampleDescription, statusCode, responseContentType, responseExampleKey = null }) => {
      const requestBodyExamplesWithKeys = requestBodyExamples.filter((rb) => rb.key !== null);
      const requestBodyExamplesWithoutKeys = requestBodyExamples.filter((rb) => rb.key === null);

      // Check if there's a matching request body example by key
      const matchingRequestBodyExample = responseExampleKey
        ? requestBodyExamplesWithKeys.find((rb) => rb.key === responseExampleKey)
        : null;

      if (matchingRequestBodyExample) {
        // Use the matching request body example
        examples.push(createBrunoExample({
          brunoRequestItem,
          exampleValue: responseExampleValue,
          exampleName,
          exampleDescription,
          statusCode,
          contentType: responseContentType,
          requestBodyValue: matchingRequestBodyExample.value,
          requestBodyContentType: matchingRequestBodyExample.contentType
        }));
      } else if (requestBodyExamplesWithKeys.length > 0) {
        // No match found, create all combinations with request body examples that have keys
        requestBodyExamplesWithKeys.forEach((rbExample) => {
          const combinedExampleName = `${exampleName} (${rbExample.summary || rbExample.key})`;
          const combinedExampleDescription = exampleDescription || rbExample.description || '';
          examples.push(createBrunoExample({
            brunoRequestItem,
            exampleValue: responseExampleValue,
            exampleName: combinedExampleName,
            exampleDescription: combinedExampleDescription,
            statusCode,
            contentType: responseContentType,
            requestBodyValue: rbExample.value,
            requestBodyContentType: rbExample.contentType
          }));
        });
      } else if (requestBodyExamplesWithoutKeys.length > 0) {
        // Single example or schema - use the first one for all response examples
        const rbExample = requestBodyExamplesWithoutKeys[0];
        examples.push(createBrunoExample({
          brunoRequestItem,
          exampleValue: responseExampleValue,
          exampleName,
          exampleDescription,
          statusCode,
          contentType: responseContentType,
          requestBodyValue: rbExample.value,
          requestBodyContentType: rbExample.contentType
        }));
      } else {
        // No request body, create example without request body
        examples.push(createBrunoExample({
          brunoRequestItem,
          exampleValue: responseExampleValue,
          exampleName,
          exampleDescription,
          statusCode,
          contentType: responseContentType
        }));
      }
    };

    if (_operationObject.requestBody && _operationObject.requestBody.content) {
      Object.entries(_operationObject.requestBody.content).forEach(([contentType, content]) => {
        if (content.examples) {
          // Multiple request body examples
          Object.entries(content.examples).forEach(([exampleKey, example]) => {
            requestBodyExamples.push({
              key: exampleKey,
              value: example.value !== undefined ? example.value : example,
              summary: example.summary,
              description: example.description,
              contentType: contentType
            });
          });
        } else if (content.example !== undefined) {
          // Single request body example - convert to unified structure
          requestBodyExamples.push({
            key: null, // No key for single example
            value: content.example,
            summary: null,
            description: null,
            contentType: contentType
          });
        } else if (content.schema) {
          // Schema-based request body - convert to unified structure
          requestBodyExamples.push({
            key: null, // No key for schema
            value: getExampleFromSchema(content.schema),
            summary: null,
            description: null,
            contentType: contentType,
            isSchema: true
          });
        }
      });
    }

    // Handle response examples
    if (_operationObject.responses) {
      Object.entries(_operationObject.responses).forEach(([statusCode, response]) => {
        if (response.content) {
          Object.entries(response.content).forEach(([contentType, content]) => {
            // Handle examples (plural) - multiple named examples
            if (content.examples) {
              Object.entries(content.examples).forEach(([exampleKey, example]) => {
                const exampleName = example.summary || exampleKey || `${statusCode} Response`;
                const exampleDescription = example.description || '';
                const exampleValue = example.value !== undefined ? example.value : example;

                createExamplesWithRequestBody({
                  responseExampleValue: exampleValue,
                  exampleName,
                  exampleDescription,
                  statusCode,
                  responseContentType: contentType,
                  responseExampleKey: exampleKey
                });
              });
            } else if (content.example !== undefined) {
              // Handle example (singular) at content level
              const exampleName = `${statusCode} Response`;
              const exampleDescription = response.description || '';

              createExamplesWithRequestBody({
                responseExampleValue: content.example,
                exampleName,
                exampleDescription,
                statusCode,
                responseContentType: contentType
              });
            } else if (content.schema) {
              // Handle schema - extract or generate example from schema
              const exampleValue = getExampleFromSchema(content.schema);
              const exampleName = `${statusCode} Response`;
              const exampleDescription = response.description || '';

              createExamplesWithRequestBody({
                responseExampleValue: exampleValue,
                exampleName,
                exampleDescription,
                statusCode,
                responseContentType: contentType
              });
            }
          });
        } else {
          // Handle responses without content (e.g., 204 No Content)
          const exampleName = `${statusCode} Response`;
          const exampleDescription = response.description || '';

          createExamplesWithRequestBody({
            responseExampleValue: '',
            exampleName,
            exampleDescription,
            statusCode,
            responseContentType: null
          });
        }
      });
    }

    // Only add examples array if there are examples
    if (examples.length > 0) {
      brunoRequestItem.examples = examples;
    }
  }

  return brunoRequestItem;
};

const resolveRefs = (spec, components = spec?.components, cache = new Map()) => {
  if (!spec || typeof spec !== 'object') {
    return spec;
  }

  if (cache.has(spec)) {
    return cache.get(spec);
  }

  if (Array.isArray(spec)) {
    return spec.map((item) => resolveRefs(item, components, cache));
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

const groupRequestsByTags = (requests) => {
  let _groups = {};
  let ungrouped = [];
  each(requests, (request) => {
    let tags = request.operationObject.tags || [];
    if (tags.length > 0) {
      let tag = tags[0].trim(); // take first tag and trim whitespace

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

const groupRequestsByPath = (requests) => {
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
    const items = group.requests.map((req) => transformOpenapiRequestItem(req, localUsedNames));

    // Add sub-folders
    const subFolders = [];
    Object.values(group.subGroups).forEach((subGroup) => {
      const subFolderItems = buildFolderStructure(subGroup);
      if (subFolderItems.length > 0) {
        subFolders.push({
          uid: uuid(),
          name: subGroup.name,
          type: 'folder',
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
    items: buildFolderStructure(group)
  }));

  return folders;
};

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

const getSecurity = (apiSpec) => {
  let defaultSchemes = apiSpec.security || [];
  let securitySchemes = get(apiSpec, 'components.securitySchemes', {});

  const hasSchemes = Object.keys(securitySchemes).length > 0;

  return {
    supported: hasSchemes
      ? defaultSchemes
          .map((scheme) => securitySchemes[Object.keys(scheme)[0]])
          .filter(Boolean)
      : [],
    schemes: securitySchemes,
    getScheme: (schemeName) => securitySchemes[schemeName]
  };
};

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

export const parseOpenApiCollection = (data, options = {}) => {
  const usedNames = new Set();
  const brunoCollection = {
    name: '',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };
  try {
    const collectionData = resolveRefs(data);
    if (!collectionData) {
      throw new Error('Invalid OpenAPI collection. Failed to resolve refs.');
      return;
    }

    // Currently parsing of openapi spec is "do your best", that is
    // allows "invalid" openapi spec

    // Assumes v3 if not defined. v2 is not supported yet
    if (collectionData.openapi && !collectionData.openapi.startsWith('3')) {
      throw new Error('Only OpenAPI v3 is supported currently.');
      return;
    }

    brunoCollection.name = collectionData.info?.title?.trim() || 'Untitled Collection';

    let servers = collectionData.servers || [];

    // Create environments based on the servers
    servers.forEach((server, index) => {
      let baseUrl = getDefaultUrl(server);
      let environmentName = server.description ? server.description : `Environment ${index + 1}`;

      brunoCollection.environments.push({
        uid: uuid(),
        name: environmentName,
        variables: [
          {
            uid: uuid(),
            name: 'baseUrl',
            value: baseUrl,
            type: 'text',
            enabled: true,
            secret: false
          }
        ]
      });
    });

    let securityConfig = getSecurity(collectionData);

    let allRequests = Object.entries(collectionData.paths)
      .map(([path, methods]) => {
        return Object.entries(methods)
          .filter(([method, op]) => {
            return ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(
              method.toLowerCase()
            );
          })
          .map(([method, operationObject]) => {
            return {
              method: method,
              path: path.replace(/{([^}]+)}/g, ':$1'), // Replace placeholders enclosed in curly braces with colons
              originalPath: path, // Keep original path for grouping
              operationObject: operationObject,
              global: {
                server: '{{baseUrl}}',
                security: securityConfig
              }
            };
          });
      })
      .reduce((acc, val) => acc.concat(val), []); // flatten

    // Support both tag-based and path-based grouping
    const groupingType = options.groupBy || 'tags';

    if (groupingType === 'path') {
      brunoCollection.items = groupRequestsByPath(allRequests);
    } else {
      // Default tag-based grouping
      let [groups, ungroupedRequests] = groupRequestsByTags(allRequests);
      let brunoFolders = groups.map((group) => {
        return {
          uid: uuid(),
          name: group.name,
          type: 'folder',
          root: {
            request: {
              auth: {
                mode: 'inherit',
                basic: null,
                bearer: null,
                digest: null,
                apikey: null,
                oauth2: null
              }
            },
            meta: {
              name: group.name
            }
          },
          items: group.requests.map((req) => transformOpenapiRequestItem(req, usedNames))
        };
      });

      let ungroupedItems = ungroupedRequests.map((req) => transformOpenapiRequestItem(req, usedNames));
      let brunoCollectionItems = brunoFolders.concat(ungroupedItems);
      brunoCollection.items = brunoCollectionItems;
    }

    // Determine collection-level authentication based on global security requirements
    const buildCollectionAuth = (scheme) => {
      const authTemplate = {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null,
        apikey: null,
        oauth2: null
      };

      if (!scheme) return authTemplate;

      if (scheme.type === 'http' && scheme.scheme === 'basic') {
        return {
          ...authTemplate,
          mode: 'basic',
          basic: {
            username: '{{username}}',
            password: '{{password}}'
          }
        };
      } else if (scheme.type === 'http' && scheme.scheme === 'bearer') {
        return {
          ...authTemplate,
          mode: 'bearer',
          bearer: {
            token: '{{token}}'
          }
        };
      } else if (scheme.type === 'http' && scheme.scheme === 'digest') {
        return {
          ...authTemplate,
          mode: 'digest',
          digest: {
            username: '{{username}}',
            password: '{{password}}'
          }
        };
      } else if (scheme.type === 'apiKey') {
        return {
          ...authTemplate,
          mode: 'apikey',
          apikey: {
            key: scheme.name,
            value: '{{apiKey}}',
            placement: scheme.in === 'query' ? 'queryparams' : 'header'
          }
        };
      } else if (scheme.type === 'oauth2') {
        let flows = scheme.flows || {};
        let grantType = 'client_credentials';
        if (flows.authorizationCode) {
          grantType = 'authorization_code';
        } else if (flows.implicit) {
          grantType = 'implicit';
        } else if (flows.password) {
          grantType = 'password';
        }
        const flowConfig = grantType === 'authorization_code' ? flows.authorizationCode || {} : grantType === 'implicit' ? flows.implicit || {} : grantType === 'password' ? flows.password || {} : flows.clientCredentials || {};

        return {
          ...authTemplate,
          mode: 'oauth2',
          oauth2: {
            grantType,
            authorizationUrl: flowConfig.authorizationUrl || '{{oauth_authorize_url}}',
            accessTokenUrl: flowConfig.tokenUrl || '{{oauth_token_url}}',
            refreshTokenUrl: flowConfig.refreshUrl || '{{oauth_refresh_url}}',
            callbackUrl: '{{oauth_callback_url}}',
            clientId: '{{oauth_client_id}}',
            clientSecret: '{{oauth_client_secret}}',
            scope: Array.isArray(flowConfig.scopes) ? flowConfig.scopes.join(' ') : Object.keys(flowConfig.scopes || {}).join(' '),
            state: '{{oauth_state}}',
            credentialsPlacement: 'header',
            tokenPlacement: 'header',
            tokenHeaderPrefix: 'Bearer',
            autoFetchToken: false,
            autoRefreshToken: true
          }
        };
      }
      return authTemplate;
    };

    let collectionAuth = buildCollectionAuth(securityConfig.supported[0]);

    brunoCollection.root = {
      request: {
        auth: collectionAuth
      },
      meta: {
        name: brunoCollection.name
      }
    };

    return brunoCollection;
  } catch (err) {
    if (!(err instanceof Error)) {
      throw new Error('Unknown error');
    }
    throw err;
  }
};

export const openApiToBruno = (openApiSpecification, options = {}) => {
  try {
    if (typeof openApiSpecification !== 'object') {
      openApiSpecification = jsyaml.load(openApiSpecification);
    }

    const collection = parseOpenApiCollection(openApiSpecification, options);
    const transformedCollection = transformItemsInCollection(collection);
    const hydratedCollection = hydrateSeqInCollection(transformedCollection);
    const validatedCollection = validateSchema(hydratedCollection);
    return validatedCollection;
  } catch (err) {
    console.error('Error converting OpenAPI to Bruno:', err);
    if (!(err instanceof Error)) {
      throw new Error('Unknown error');
    }
    throw err;
  }
};

export default openApiToBruno;
