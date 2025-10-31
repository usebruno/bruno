import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';

const normalizeDocString = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const normalized = value.replace(/\r\n/g, '\n').split('\n');

  while (normalized.length && normalized[0].trim() === '') {
    normalized.shift();
  }

  while (normalized.length && normalized[normalized.length - 1].trim() === '') {
    normalized.pop();
  }

  if (!normalized.length) {
    return '';
  }

  let minIndent = null;
  normalized.forEach((line) => {
    if (!line.trim()) {
      return;
    }
    const match = line.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    if (minIndent === null || indent < minIndent) {
      minIndent = indent;
    }
  });

  const trimBy = minIndent || 0;
  const trimmedLines = normalized.map((line) => {
    if (!line.trim()) {
      return '';
    }
    return trimBy ? line.slice(Math.min(trimBy, line.length)) : line;
  });

  return trimmedLines.join('\n');
};

const formatExternalDocs = (externalDocs) => {
  if (!externalDocs || typeof externalDocs.url !== 'string' || !externalDocs.url.trim()) {
    return '';
  }

  const label = typeof externalDocs.description === 'string' && externalDocs.description.trim()
    ? externalDocs.description.trim()
    : 'External Documentation';

  return `[${label}](${externalDocs.url.trim()})`;
};

const formatDescriptionWithExternalDocs = (description, externalDocs) => {
  const parts = [];
  const normalized = normalizeDocString(description);
  if (normalized) {
    parts.push(normalized);
  }

  const external = formatExternalDocs(externalDocs);
  if (external) {
    parts.push(external);
  }

  return parts.join('\n\n').trim();
};

const formatCollectionDocs = (info = {}) => {
  if (!info || typeof info !== 'object') {
    return '';
  }

  const sections = [];
  const description = formatDescriptionWithExternalDocs(info.description, info.externalDocs);
  if (description) {
    sections.push(description);
  }

  const metaLines = [];
  if (typeof info.version === 'string' && info.version.trim()) {
    metaLines.push(`- **Version:** ${info.version.trim()}`);
  }

  if (typeof info.termsOfService === 'string' && info.termsOfService.trim()) {
    metaLines.push(`- **Terms of Service:** ${info.termsOfService.trim()}`);
  }

  const contact = info.contact || {};
  const contactParts = [];
  if (typeof contact.name === 'string' && contact.name.trim()) {
    contactParts.push(contact.name.trim());
  }
  if (typeof contact.email === 'string' && contact.email.trim()) {
    contactParts.push(contact.email.trim());
  }
  if (typeof contact.url === 'string' && contact.url.trim()) {
    contactParts.push(contact.url.trim());
  }
  if (contactParts.length) {
    metaLines.push(`- **Contact:** ${contactParts.join(' | ')}`);
  }

  const license = info.license || {};
  const licenseParts = [];
  if (typeof license.name === 'string' && license.name.trim()) {
    licenseParts.push(license.name.trim());
  }
  if (typeof license.url === 'string' && license.url.trim()) {
    licenseParts.push(license.url.trim());
  }
  if (licenseParts.length) {
    metaLines.push(`- **License:** ${licenseParts.join(' | ')}`);
  }

  if (metaLines.length) {
    sections.push(metaLines.join('\n'));
  }

  return sections.join('\n\n').trim();
};

const ensureUrl = (url) => {
  // removing multiple slashes after the protocol if it exists, or after the beginning of the string otherwise
  return url.replace(/([^:])\/{2,}/g, '$1/');
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
      },
      docs: ''
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

  const requestDocs = formatDescriptionWithExternalDocs(_operationObject.description, _operationObject.externalDocs);
  if (requestDocs) {
    brunoRequestItem.request.docs = requestDocs;
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

const groupRequestsByTags = (requests, tagDocsMap = {}) => {
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
      requests: _groups[groupName],
      docs: tagDocsMap[groupName] || ''
    };
  });

  return [groups, ungrouped];
};

const groupRequestsByPath = (requests, pathDocs = {}) => {
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
  const buildFolderStructure = (group, parentSegments = []) => {
    // Create a new usedNames set for each folder/subfolder scope
    const localUsedNames = new Set();
    const folderItems = group.requests.map((req) => transformOpenapiRequestItem(req, localUsedNames));
    const currentSegments = [...parentSegments, group.name].filter((segment) => segment && segment.length);
    const fullPathKey = currentSegments.length ? `/${currentSegments.join('/')}` : null;

    Object.values(group.subGroups).forEach((subGroup) => {
      const subFolder = buildFolderStructure(subGroup, currentSegments);
      if (subFolder) {
        folderItems.push(subFolder);
      }
    });

    const folder = {
      uid: uuid(),
      name: group.name,
      type: 'folder',
      items: folderItems
    };

    if (fullPathKey && pathDocs[fullPathKey]) {
      folder.root = {
        docs: pathDocs[fullPathKey]
      };
    }

    return folder;
  };

  const folders = Object.values(pathGroups).map((group) => buildFolderStructure(group));

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
    const collectionDocs = formatCollectionDocs(collectionData.info);

    const tagDocsMap = {};
    each(collectionData.tags || [], (tag) => {
      if (!tag || typeof tag.name !== 'string') {
        return;
      }
      const docs = formatDescriptionWithExternalDocs(tag.description, tag.externalDocs);
      if (docs) {
        tagDocsMap[tag.name] = docs;
      }
    });

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

    const pathDocsMap = {};
    each(collectionData.paths || {}, (pathItem, pathKey) => {
      if (!pathKey || typeof pathItem !== 'object') {
        return;
      }
      const docs = normalizeDocString(pathItem?.description);
      if (docs) {
        pathDocsMap[pathKey] = docs;
      }
    });

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
      brunoCollection.items = groupRequestsByPath(allRequests, pathDocsMap);
    } else {
      // Default tag-based grouping
      let [groups, ungroupedRequests] = groupRequestsByTags(allRequests, tagDocsMap);
      let brunoFolders = groups.map((group) => {
        const folderRoot = {
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
        };

        if (group.docs) {
          folderRoot.docs = group.docs;
        }

        return {
          uid: uuid(),
          name: group.name,
          type: 'folder',
          root: folderRoot,
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

    if (collectionDocs) {
      brunoCollection.root.docs = collectionDocs;
    }

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
