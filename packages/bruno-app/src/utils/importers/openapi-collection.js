import jsyaml from 'js-yaml';
import each from 'lodash/each';
import get from 'lodash/get';
import fileDialog from 'file-dialog';
import { uuid } from 'utils/common';
import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection } from './common';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        // try to load JSON
        const parsedData = JSON.parse(e.target.result);
        resolve(parsedData);
      } catch (jsonError) {
        // not a valid JSOn, try yaml
        try {
          const parsedData = jsyaml.load(e.target.result);
          resolve(parsedData);
        } catch (yamlError) {
          console.error('Error parsing the file :', jsonError, yamlError);
          reject(new BrunoError('Import collection failed'));
        }
      }
    };
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const ensureUrl = (url) => {
  let protUrl = url.startsWith('http') ? url : `http://${url}`;
  // replace any double or triple slashes
  return protUrl.replace(/([^:]\/)\/+/g, '$1');
};

const buildEmptyJsonBody = (bodySchema) => {
  let _jsonBody = {};
  each(bodySchema.properties || {}, (prop, name) => {
    if (prop.type === 'object') {
      _jsonBody[name] = buildEmptyJsonBody(prop);
      // handle arrays
    } else if (prop.type === 'array') {
      _jsonBody[name] = [];
    } else {
      _jsonBody[name] = '';
    }
  });
  return _jsonBody;
};

const transformOpenapiRequestItem = (request) => {
  let _operationObject = request.operationObject;

  let operationName = _operationObject.summary || _operationObject.operationId || _operationObject.description;
  if (!operationName) {
    operationName = `${request.method} ${request.path}`;
  }

  const brunoRequestItem = {
    uid: uuid(),
    name: operationName,
    type: 'http-request',
    request: {
      url: ensureUrl(request.global.server + '/' + request.path),
      method: request.method.toUpperCase(),
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null
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
        enabled: param.required
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

  let auth;
  // allow operation override
  if (_operationObject.security && _operationObject.security.length > 0) {
    let schemeName = Object.keys(_operationObject.security[0])[0];
    auth = request.global.security.getScheme(schemeName);
  } else if (request.global.security.supported.length > 0) {
    auth = request.global.security.supported[0];
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
    } else if (auth.type === 'apiKey' && auth.in === 'header') {
      brunoRequestItem.request.headers.push({
        uid: uuid(),
        name: auth.name,
        value: '{{apiKey}}',
        description: 'Authentication header',
        enabled: true
      });
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

  return brunoRequestItem;
};

const resolveRefs = (spec, components = spec.components, visitedItems = new Set()) => {
  if (!spec || typeof spec !== 'object') {
    return spec;
  }

  if (Array.isArray(spec)) {
    return spec.map((item) => resolveRefs(item, components, visitedItems));
  }

  if ('$ref' in spec) {
    const refPath = spec.$ref;

    if (visitedItems.has(refPath)) {
      return spec;
    } else {
      visitedItems.add(refPath);
    }

    if (refPath.startsWith('#/components/')) {
      // Local reference within components
      const refKeys = refPath.replace('#/components/', '').split('/');
      let ref = components;

      for (const key of refKeys) {
        if (ref[key]) {
          ref = ref[key];
        } else {
          // Handle invalid references gracefully?
          return spec;
        }
      }

      return resolveRefs(ref, components, visitedItems);
    } else {
      // Handle external references (not implemented here)
      // You would need to fetch the external reference and resolve it.
      // Example: Fetch and resolve an external reference from a URL.
    }
  }

  // Recursively resolve references in nested objects
  for (const prop in spec) {
    spec[prop] = resolveRefs(spec[prop], components, visitedItems);
  }

  return spec;
};

const groupRequestsByTags = (requests) => {
  let _groups = {};
  let ungrouped = [];
  each(requests, (request) => {
    let tags = request.operationObject.tags || [];
    if (tags.length > 0) {
      let tag = tags[0]; // take first tag
      if (!_groups[tag]) {
        _groups[tag] = [];
      }
      _groups[tag].push(request);
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

const getDefaultUrl = (serverObject) => {
  let url = serverObject.url;
  if (serverObject.variables) {
    each(serverObject.variables, (variable, variableName) => {
      let sub = variable.default || (variable.enum ? variable.enum[0] : `{{${variableName}}}`);
      url = url.replace(`{${variableName}}`, sub);
    });
  }
  return url;
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

const parseOpenApiCollection = (data) => {
  const brunoCollection = {
    name: '',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };

  return new Promise((resolve, reject) => {
    try {
      const collectionData = resolveRefs(data);
      if (!collectionData) {
        reject(new BrunoError('Invalid OpenAPI collection. Failed to resolve refs.'));
        return;
      }

      // Currently parsing of openapi spec is "do your best", that is
      // allows "invalid" openapi spec

      // assumes v3 if not defined. v2 no supported yet
      if (collectionData.openapi && !collectionData.openapi.startsWith('3')) {
        reject(new BrunoError('Only OpenAPI v3 is supported currently.'));
        return;
      }

      // TODO what if info.title not defined?
      brunoCollection.name = collectionData.info.title;
      let servers = collectionData.servers || [];
      let baseUrl = servers[0] ? getDefaultUrl(servers[0]) : '';
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
                path: path,
                operationObject: operationObject,
                global: {
                  server: baseUrl,
                  security: securityConfig
                }
              };
            });
        })
        .reduce((acc, val) => acc.concat(val), []); // flatten

      let [groups, ungroupedRequests] = groupRequestsByTags(allRequests);
      let brunoFolders = groups.map((group) => {
        return {
          uid: uuid(),
          name: group.name,
          type: 'folder',
          items: group.requests.map(transformOpenapiRequestItem)
        };
      });

      let ungroupedItems = ungroupedRequests.map(transformOpenapiRequestItem);
      let brunoCollectionItems = brunoFolders.concat(ungroupedItems);
      brunoCollection.items = brunoCollectionItems;
      resolve(brunoCollection);
    } catch (err) {
      console.error(err);
      reject(new BrunoError('An error occurred while parsing the OpenAPI collection'));
    }
  });
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: '.json, .yaml, .yml, application/json, application/yaml, application/x-yaml' })
      .then(readFile)
      .then(parseOpenApiCollection)
      .then(transformItemsInCollection)
      .then(hydrateSeqInCollection)
      .then(validateSchema)
      .then((collection) => resolve({ collection }))
      .catch((err) => {
        console.error(err);
        reject(new BrunoError('Import collection failed: ' + err.message));
      });
  });
};

export default importCollection;
