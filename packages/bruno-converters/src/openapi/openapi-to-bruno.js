import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid, sanitizeTag, sanitizeTags } from '../common';
import { swagger2ToBruno } from './swagger2-to-bruno';
import {
  ensureUrl,
  BODY_TYPE_HANDLERS,
  getExampleFromSchema,
  createBrunoExample,
  groupRequestsByTags,
  groupRequestsByPath
} from './openapi-common';

const getContentLevelExample = (bodyContent) => {
  if (bodyContent.example !== undefined) return bodyContent.example;
  const firstExample = Object.values(bodyContent.examples ?? {})[0];
  return firstExample?.value;
};

// Extract a representative value from a schema property (used for request body properties)
// Priority: prop.example > parentExample[propName] > prop.default > prop.enum[0] > ''
const getSchemaPropertyExampleValue = (prop, propName, parentExample = {}) => {
  if (prop.example !== undefined) return String(prop.example);
  if (parentExample[propName] !== undefined) return String(parentExample[propName]);
  if (prop.default !== undefined) return String(prop.default);
  if (prop.enum && prop.enum.length > 0) return String(prop.enum[0]);
  return '';
};

// Converts an example or default value into Bruno parameter entries.
// Respects OAS default serialization: query/cookie default to explode:true (one entry per item),
// path/header default to explode:false (comma-joined single entry).
const paramEntriesFromValue = (val, paramIn) => {
  const explodeByDefault = paramIn === 'query' || paramIn === 'cookie';
  if (Array.isArray(val) && explodeByDefault) {
    return val.map((item) => ({ value: String(item), enabled: true }));
  }
  return [{ value: String(val), enabled: true }];
};

/**
 * Extracts parameter entries based on OpenAPI parameter schema
 * For enum parameters, creates multiple entries (one per enum value)
 * Handles enum, default, constant, nullable, and array types per Swagger spec
 * @param {Object} param - The OpenAPI parameter object
 * @returns {Array} - Array of objects with value and enabled properties
 */
const getParameterEntries = (param) => {
  const schema = param.schema || {};
  const entries = [];

  // Handle enum parameters - create entry for each enum value
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    const defaultValue = schema.default !== undefined ? String(schema.default) : null;

    schema.enum.forEach((enumValue) => {
      const valueStr = String(enumValue);
      // Enable only if it matches the default value, or if it's the first value and required
      const isDefault = defaultValue !== null && valueStr === defaultValue;
      const enabled = isDefault || (defaultValue === null && schema.enum.indexOf(enumValue) === 0 && !!param.required);

      entries.push({
        value: valueStr,
        enabled: enabled
      });
    });

    return entries;
  }

  // Handle array type with items schema that has enum
  if (schema.type === 'array' && schema.items && schema.items.enum && Array.isArray(schema.items.enum) && schema.items.enum.length > 0) {
    const defaultValue = schema.items.default !== undefined ? String(schema.items.default) : null;
    const arrayDefault = schema.default !== undefined && Array.isArray(schema.default) ? schema.default : null;

    // If there's a default at array level, use it
    if (arrayDefault) {
      return paramEntriesFromValue(arrayDefault, param.in);
    }

    // Otherwise, create entries for each enum value in items
    schema.items.enum.forEach((enumValue) => {
      const valueStr = String(enumValue);
      const isDefault = defaultValue !== null && valueStr === defaultValue;
      const enabled = isDefault || (defaultValue === null && schema.items.enum.indexOf(enumValue) === 0 && !!param.required);

      entries.push({
        value: valueStr,
        enabled: enabled
      });
    });

    return entries;
  }

  // Priority 1: Top-level param examples (mutually exclusive per spec)
  if (param.example !== undefined) {
    return paramEntriesFromValue(param.example, param.in);
  }

  if (param.examples) {
    const firstExample = Object.values(param.examples)[0];
    if (firstExample?.value !== undefined) {
      return paramEntriesFromValue(firstExample.value, param.in);
    }
  }

  // Priority 2: schema.default
  if (schema.default !== undefined) {
    return paramEntriesFromValue(schema.default, param.in);
  }

  // Priority 3: schema.example
  if (schema.example !== undefined) {
    return paramEntriesFromValue(schema.example, param.in);
  }

  // Priority 4: schema.examples (OAS 3.1+)
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return paramEntriesFromValue(schema.examples[0], param.in);
  }

  // Priority 5: Array type handling (items-based fallback)
  if (schema.type === 'array' && schema.items) {
    let value;
    if (schema.items.example !== undefined) {
      value = String(schema.items.example);
    } else if (schema.items.enum && schema.items.enum.length > 0) {
      value = String(schema.items.enum[0]);
    } else if (schema.items.default !== undefined) {
      value = String(schema.items.default);
    } else {
      value = '';
    }
    return [{ value, enabled: param.required || false }];
  }

  // Priority 6: schema.minimum fallback for numeric types
  if (schema.minimum !== undefined) {
    return [
      {
        value: String(schema.minimum),
        enabled: param.required || false
      }
    ];
  }

  // Priority 7: Edge cases
  let enabled = param.required || false;
  if (schema.nullable === true && !param.required) {
    enabled = false;
  } else if (param.allowEmptyValue === true && !param.required) {
    enabled = false;
  }

  return [{ value: '', enabled }];
};

const transformOpenapiRequestItem = (request, usedNames = new Set(), options = {}) => {
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
    tags: sanitizeTags(request.operationObject.tags || [], options),
    request: {
      docs: _operationObject.description,
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

  // If the operation has its own servers, override baseUrl via request vars
  // Only the first server is used; Bruno supports a single baseUrl per request
  if (request.servers && request.servers.length > 0) {
    const serverVarPairs = extractServerVars(request.servers[0]);
    brunoRequestItem.request.vars = {
      req: serverVarPairs.map((sv) => ({
        uid: uuid(),
        name: sv.name,
        value: sv.value,
        enabled: true,
        local: false
      })),
      res: []
    };
  }

  each(_operationObject.parameters || [], (param) => {
    // Check if parameter schema is an object type with properties
    // If so, expand the properties into individual parameters
    const isObjectSchema = param.schema && param.schema.properties;

    if (isObjectSchema) {
      // Expand object schema properties into individual parameters
      const schemaExample = param.schema.example || {};

      each(param.schema.properties, (prop, propName) => {
        const isRequired = Array.isArray(param.schema.required) && param.schema.required.includes(propName);

        // Create a temporary parameter object for getParameterEntries
        // Enrich property with parent example context if property lacks its own example
        // Use child-level example only; drop parent-level example/examples to avoid
        // object-level values leaking into scalar child parameters
        const propSchema = (prop.example === undefined && schemaExample[propName] !== undefined)
          ? { ...prop, example: schemaExample[propName] }
          : prop;
        const tempParam = { ...param, example: undefined, examples: undefined, name: propName, schema: propSchema, required: isRequired };
        const entries = getParameterEntries(tempParam);

        entries.forEach((entry) => {
          if (param.in === 'query' || param.in === 'querystring') {
            brunoRequestItem.request.params.push({
              uid: uuid(),
              name: propName,
              value: entry.value,
              description: prop.description || '',
              enabled: entry.enabled,
              type: 'query'
            });
          } else if (param.in === 'path') {
            brunoRequestItem.request.params.push({
              uid: uuid(),
              name: propName,
              value: entry.value,
              description: prop.description || '',
              enabled: entry.enabled,
              type: 'path'
            });
          } else if (param.in === 'header') {
            brunoRequestItem.request.headers.push({
              uid: uuid(),
              name: propName,
              value: entry.value,
              description: prop.description || '',
              enabled: entry.enabled
            });
          }
        });
      });
    } else {
      const entries = getParameterEntries(param);

      entries.forEach((entry) => {
        if (param.in === 'query' || param.in === 'querystring') {
          brunoRequestItem.request.params.push({
            uid: uuid(),
            name: param.name,
            value: entry.value,
            description: param.description || '',
            enabled: entry.enabled,
            type: 'query'
          });
        } else if (param.in === 'path') {
          brunoRequestItem.request.params.push({
            uid: uuid(),
            name: param.name,
            value: entry.value,
            description: param.description || '',
            enabled: entry.enabled,
            type: 'path'
          });
        } else if (param.in === 'header') {
          brunoRequestItem.request.headers.push({
            uid: uuid(),
            name: param.name,
            value: entry.value,
            description: param.description || '',
            enabled: entry.enabled
          });
        }
      });
    }
  });

  // Handle explicit no-auth case where security: [] on the operation
  if (Array.isArray(_operationObject.security) && _operationObject.security.length === 0) {
    brunoRequestItem.request.auth.mode = 'inherit';
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
    const content = get(_operationObject, 'requestBody.content', {});
    const mimeType = Object.keys(content)[0];
    const bodyContent = content[mimeType] || {};
    let bodySchema = bodyContent.schema;

    if (bodySchema?.example === undefined) {
      const contentExample = getContentLevelExample(bodyContent);
      if (contentExample !== undefined) {
        bodySchema = { ...bodySchema, example: contentExample };
      }
    }

    // Normalize: lowercase (object keys may vary in case)
    const normalizedMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase() : '';

    // Find matching handler for this content type
    const handler = BODY_TYPE_HANDLERS.find((h) => h.match(normalizedMimeType));
    if (handler) {
      brunoRequestItem.request.body.mode = handler.mode;
      handler.handle(brunoRequestItem.request.body, bodySchema);
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
     * @param {number} params.statusCode - HTTP status code
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
          requestBodySchema: matchingRequestBodyExample.schema,
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
            requestBodySchema: rbExample.schema,
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
          requestBodySchema: rbExample.schema,
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
            const exampleValue = example.value !== undefined ? example.value : example;
            requestBodyExamples.push({
              key: exampleKey,
              schema: { example: exampleValue }, // Wrap in schema format for BODY_TYPE_HANDLERS
              summary: example.summary,
              description: example.description,
              contentType: contentType
            });
          });
        } else if (content.example !== undefined) {
          // Single request body example - wrap in schema-like object
          requestBodyExamples.push({
            key: null,
            schema: { example: content.example }, // Wrap in schema format for BODY_TYPE_HANDLERS
            summary: null,
            description: null,
            contentType: contentType
          });
        } else if (content.schema) {
          // Schema-based request body - pass schema directly
          requestBodyExamples.push({
            key: null,
            schema: content.schema,
            summary: null,
            description: null,
            contentType: contentType
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

// Helper function to validate $ref
const isValidRef = (ref) => {
  if (typeof ref !== 'string') {
    return false;
  }

  return ref.startsWith('#/components/');
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

  // Only treat as a JSON reference if it passes all validation checks
  const isRef = isValidRef(spec.$ref);

  if (isRef) {
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

const getDefaultUrl = (serverObject) => {
  let url = serverObject.url;
  if (serverObject.variables) {
    each(serverObject.variables, (variable, variableName) => {
      let sub = variable.default !== undefined ? variable.default : (variable.enum ? variable.enum[0] : `{{${variableName}}}`);
      url = url.replaceAll(`{${variableName}}`, sub);
    });
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

// Extract { name, value } pairs from an OpenAPI server object.
// Converts {varName} to {{varName}} for template URLs and includes variable defaults.
const extractServerVars = (server) => {
  const vars = [];
  if (server.variables && Object.keys(server.variables).length > 0) {
    let baseUrlTemplate = server.url;
    each(server.variables, (variable, variableName) => {
      baseUrlTemplate = baseUrlTemplate.replaceAll(`{${variableName}}`, `{{${variableName}}}`);
    });
    baseUrlTemplate = baseUrlTemplate.endsWith('/') ? baseUrlTemplate.slice(0, -1) : baseUrlTemplate;
    vars.push({ name: 'baseUrl', value: baseUrlTemplate });
    each(server.variables, (variable, variableName) => {
      let value = variable.default !== undefined ? variable.default : (variable.enum ? variable.enum[0] : '');
      vars.push({ name: variableName, value: String(value) });
    });
  } else {
    vars.push({ name: 'baseUrl', value: getDefaultUrl(server) });
  }
  return vars;
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

    brunoCollection.name = collectionData.info?.title?.trim() || 'Untitled Collection';

    let servers = collectionData.servers || [];

    // Create environments based on the servers
    servers.forEach((server, index) => {
      let environmentName = server.name || server.description || `Environment ${index + 1}`;
      const serverVars = extractServerVars(server);
      const variables = serverVars.map((sv) => ({
        uid: uuid(),
        name: sv.name,
        value: sv.value,
        type: 'text',
        enabled: true,
        secret: false
      }));

      brunoCollection.environments.push({
        uid: uuid(),
        name: environmentName,
        variables
      });
    });

    let securityConfig = getSecurity(collectionData);

    // Merge path-item parameters with operation parameters.
    // Operation parameters override path-item parameters with the same name+in combination.
    const mergeParams = (pathParams, operationParams) => {
      const overrides = new Set(operationParams.map((p) => `${p.name}:${p.in}`));
      const inheritedParams = pathParams.filter((p) => !overrides.has(`${p.name}:${p.in}`));
      return [...inheritedParams, ...operationParams];
    };

    let allRequests = Object.entries(collectionData.paths)
      .map(([path, pathItemObject]) => {
        // Extract path-item level parameters (per OpenAPI spec, these apply to all operations under this path)
        const pathItemParams = pathItemObject.parameters || [];

        return Object.entries(pathItemObject)
          .filter(([method, op]) => {
            return ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(
              method.toLowerCase()
            );
          })
          .map(([method, operationObject]) => {
            const mergedParams = mergeParams(pathItemParams, operationObject.parameters || []);

            return {
              method: method,
              path: path.replace(/{([^}]+)}/g, ':$1'), // Replace placeholders enclosed in curly braces with colons
              originalPath: path, // Keep original path for grouping
              operationObject: { ...operationObject, parameters: mergedParams },
              global: {
                server: '{{baseUrl}}',
                security: securityConfig
              },
              servers: operationObject.servers || pathItemObject.servers || null
            };
          });
      })
      .reduce((acc, val) => acc.concat(val), []); // flatten

    // Support both tag-based and path-based grouping
    const groupingType = options.groupBy || 'tags';

    if (groupingType === 'path') {
      brunoCollection.items = groupRequestsByPath(allRequests, transformOpenapiRequestItem, options);
    } else {
      // Default tag-based grouping
      let [groups, ungroupedRequests] = groupRequestsByTags(allRequests, options);
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
          items: group.requests.map((req) => transformOpenapiRequestItem(req, usedNames, options))
        };
      });

      let ungroupedItems = ungroupedRequests.map((req) => transformOpenapiRequestItem(req, usedNames, options));
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
    if (openApiSpecification.swagger && String(openApiSpecification.swagger).startsWith('2')) {
      return swagger2ToBruno(openApiSpecification, options);
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
