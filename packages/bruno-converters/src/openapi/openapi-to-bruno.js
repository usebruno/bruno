import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';

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

const getBodyTypeFromContentType = (contentType) => {
  if (contentType?.includes('application/json')) {
    return 'json';
  } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
    return 'xml';
  } else if (contentType?.includes('text/html')) {
    return 'html';
  }
  return 'text';
};

const getBodyModeFromContentType = (contentType) => {
  if (contentType?.includes('application/json')) {
    return 'json';
  } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
    return 'xml';
  } else if (contentType?.includes('text/plain')) {
    return 'text';
  } else if (contentType?.includes('application/x-www-form-urlencoded')) {
    return 'formUrlEncoded';
  } else if (contentType?.includes('multipart/form-data')) {
    return 'multipartForm';
  }
  return 'none';
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
    if (prop.type === 'object') {
      _jsonBody[name] = buildEmptyJsonBody(prop, visited);
    } else if (prop.type === 'array') {
      if (prop.items && prop.items.type === 'object') {
        _jsonBody[name] = [buildEmptyJsonBody(prop.items, visited)];
      } else {
        _jsonBody[name] = [];
      }
    } else if (prop.type === 'integer') {
      _jsonBody[name] = 0;
    } else if (prop.type === 'boolean') {
      _jsonBody[name] = false;
    } else {
      _jsonBody[name] = '';
    }
  });
  return _jsonBody;
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
    if (mimeType === 'application/json') {
      brunoRequestItem.request.body.mode = 'json';
      if (bodySchema && bodySchema.type === 'object') {
        let _jsonBody = buildEmptyJsonBody(bodySchema);
        brunoRequestItem.request.body.json = JSON.stringify(_jsonBody, null, 2);
      }
      if (bodySchema && bodySchema.type === 'array') {
        brunoRequestItem.request.body.json = JSON.stringify([buildEmptyJsonBody(bodySchema.items)], null, 2);
      }
    } else if (mimeType === 'application/x-www-form-urlencoded') {
      brunoRequestItem.request.body.mode = 'formUrlEncoded';
      if (bodySchema && bodySchema.type === 'object') {
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
    } else if (mimeType === 'multipart/form-data') {
      brunoRequestItem.request.body.mode = 'multipartForm';
      if (bodySchema && bodySchema.type === 'object') {
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
    } else if (mimeType === 'text/plain') {
      brunoRequestItem.request.body.mode = 'text';
      brunoRequestItem.request.body.text = '';
    } else if (mimeType === 'text/xml') {
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

  // Helper function to extract example value from various OpenAPI formats
  const extractExampleValue = (content, schema) => {
    // Priority order:
    // 1. content.examples (multiple examples)
    // 2. content.example (single example)
    // 3. schema.example (example in schema)
    // 4. Build from schema.properties.*.example (examples in properties)

    if (content.examples) {
      return { type: 'examples', data: content.examples };
    }

    if (content.example !== undefined) {
      return { type: 'example', data: content.example };
    }

    if (schema && schema.example !== undefined) {
      return { type: 'example', data: schema.example };
    }

    // Try to build example from property-level examples
    if (schema && schema.type === 'object' && schema.properties) {
      const exampleFromProperties = {};
      let hasAnyExample = false;

      each(schema.properties, (prop, propName) => {
        if (prop.example !== undefined) {
          exampleFromProperties[propName] = prop.example;
          hasAnyExample = true;
        } else if (prop.type === 'object' && prop.properties) {
          // Recursively build nested objects
          const nested = {};
          let hasNestedExample = false;
          each(prop.properties, (nestedProp, nestedPropName) => {
            if (nestedProp.example !== undefined) {
              nested[nestedPropName] = nestedProp.example;
              hasNestedExample = true;
            }
          });
          if (hasNestedExample) {
            exampleFromProperties[propName] = nested;
            hasAnyExample = true;
          }
        } else if (prop.type === 'array' && prop.items && prop.items.example !== undefined) {
          exampleFromProperties[propName] = [prop.items.example];
          hasAnyExample = true;
        }
      });

      if (hasAnyExample) {
        return { type: 'example', data: exampleFromProperties };
      }
    }

    // Try to build example from array items
    if (schema && schema.type === 'array' && schema.items) {
      if (schema.items.example !== undefined) {
        return { type: 'example', data: [schema.items.example] };
      }
      if (schema.items.type === 'object' && schema.items.properties) {
        const itemExample = {};
        let hasAnyExample = false;
        each(schema.items.properties, (prop, propName) => {
          if (prop.example !== undefined) {
            itemExample[propName] = prop.example;
            hasAnyExample = true;
          }
        });
        if (hasAnyExample) {
          return { type: 'example', data: [itemExample] };
        }
      }
    }

    return null;
  };

  // Handle OpenAPI examples from responses and request body
  if (_operationObject.responses || _operationObject.requestBody) {
    const examples = [];

    // Handle response examples
    if (_operationObject.responses) {
      Object.entries(_operationObject.responses).forEach(([statusCode, response]) => {
        if (response.content) {
          Object.entries(response.content).forEach(([contentType, content]) => {
            const exampleData = extractExampleValue(content, content.schema);

            if (exampleData) {
              if (exampleData.type === 'examples') {
                // Multiple examples
                Object.entries(exampleData.data).forEach(([exampleKey, example]) => {
                  const exampleValue = example.value !== undefined ? example.value : example;
                  const exampleName = example.summary || exampleKey || `${statusCode} Response`;
                  const exampleDescription = example.description || '';

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
                      headers: [
                        {
                          uid: uuid(),
                          name: 'Content-Type',
                          value: contentType,
                          description: '',
                          enabled: true
                        }
                      ],
                      body: {
                        type: getBodyTypeFromContentType(contentType),
                        content: typeof exampleValue === 'object' ? JSON.stringify(exampleValue, null, 2) : String(exampleValue)
                      }
                    }
                  };

                  examples.push(brunoExample);
                });
              } else {
                // Single example
                const brunoExample = {
                  uid: uuid(),
                  itemUid: brunoRequestItem.uid,
                  name: `${statusCode} Response`,
                  description: '',
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
                    headers: [
                      {
                        uid: uuid(),
                        name: 'Content-Type',
                        value: contentType,
                        description: '',
                        enabled: true
                      }
                    ],
                    body: {
                      type: getBodyTypeFromContentType(contentType),
                      content: typeof exampleData.data === 'object' ? JSON.stringify(exampleData.data, null, 2) : String(exampleData.data)
                    }
                  }
                };

                examples.push(brunoExample);
              }
            }
          });
        }
      });
    }

    // Handle request body examples
    if (_operationObject.requestBody && _operationObject.requestBody.content) {
      Object.entries(_operationObject.requestBody.content).forEach(([contentType, content]) => {
        const exampleData = extractExampleValue(content, content.schema);

        if (exampleData) {
          if (exampleData.type === 'examples') {
            // Multiple examples
            Object.entries(exampleData.data).forEach(([exampleKey, example]) => {
              const exampleValue = example.value !== undefined ? example.value : example;
              const exampleName = example.summary || exampleKey || 'Request Example';
              const exampleDescription = example.description || '';

              const bodyMode = getBodyModeFromContentType(contentType);
              const requestBody = {
                mode: bodyMode
              };

              // Set the appropriate body content based on mode
              if (bodyMode === 'json') {
                requestBody.json = typeof exampleValue === 'object' ? JSON.stringify(exampleValue, null, 2) : String(exampleValue);
              } else if (bodyMode === 'xml') {
                requestBody.xml = typeof exampleValue === 'string' ? exampleValue : JSON.stringify(exampleValue);
              } else if (bodyMode === 'text') {
                requestBody.text = String(exampleValue);
              }

              const brunoExample = {
                uid: uuid(),
                itemUid: brunoRequestItem.uid,
                name: exampleName,
                description: exampleDescription,
                type: 'http-request',
                request: {
                  url: brunoRequestItem.request.url,
                  method: brunoRequestItem.request.method,
                  headers: [
                    ...brunoRequestItem.request.headers,
                    {
                      uid: uuid(),
                      name: 'Content-Type',
                      value: contentType,
                      description: '',
                      enabled: true
                    }
                  ],
                  params: [...brunoRequestItem.request.params],
                  body: requestBody
                }
              };

              examples.push(brunoExample);
            });
          } else {
            // Single example
            const bodyMode = getBodyModeFromContentType(contentType);
            const requestBody = {
              mode: bodyMode
            };

            // Set the appropriate body content based on mode
            if (bodyMode === 'json') {
              requestBody.json = typeof exampleData.data === 'object' ? JSON.stringify(exampleData.data, null, 2) : String(exampleData.data);
            } else if (bodyMode === 'xml') {
              requestBody.xml = typeof exampleData.data === 'string' ? exampleData.data : JSON.stringify(exampleData.data);
            } else if (bodyMode === 'text') {
              requestBody.text = String(exampleData.data);
            }

            const brunoExample = {
              uid: uuid(),
              itemUid: brunoRequestItem.uid,
              name: 'Request Example',
              description: '',
              type: 'http-request',
              request: {
                url: brunoRequestItem.request.url,
                method: brunoRequestItem.request.method,
                headers: [
                  ...brunoRequestItem.request.headers,
                  {
                    uid: uuid(),
                    name: 'Content-Type',
                    value: contentType,
                    description: '',
                    enabled: true
                  }
                ],
                params: [...brunoRequestItem.request.params],
                body: requestBody
              }
            };

            examples.push(brunoExample);
          }
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
            },
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
          oauth2: null,
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
          auth: collectionAuth,
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
    if(typeof openApiSpecification !== 'object') {
      openApiSpecification = jsyaml.load(openApiSpecification);
    }

    const collection = parseOpenApiCollection(openApiSpecification, options);
    const transformedCollection = transformItemsInCollection(collection);
    const hydratedCollection = hydrateSeqInCollection(transformedCollection);
    const validatedCollection = validateSchema(hydratedCollection);
    return validatedCollection
  } catch (err) {
    console.error('Error converting OpenAPI to Bruno:', err);
    if (!(err instanceof Error)) {
      throw new Error('Unknown error');
    }
    throw err;
  }
};

export default openApiToBruno;
