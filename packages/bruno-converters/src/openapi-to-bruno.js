const each = require('lodash/each');
const get = require('lodash/get');
const yaml = require('js-yaml');
const {
  uuid,
  ensureUrl,
  buildEmptyJsonBody,
  resolveRefs,
  getDefaultUrl,
  getSecurity,
  openAPIRuntimeExpressionToScript
} = require('./utils');

/**
 * Transform OpenAPI request item to Bruno request item
 * @param {object} request - OpenAPI request
 * @returns {object} Bruno request item
 */
const transformOpenapiRequestItem = (request) => {
  let _operationObject = request.operationObject;

  let operationName = _operationObject.summary || _operationObject.operationId || _operationObject.description;
  if (!operationName) {
    operationName = `${request.method} ${request.path}`;
  }

  const transformPath = (path) => {
    const segments = path.split('/');

    const transformedSegments = segments.map((segment) => {
      if (segment.match(/^\{.*\}$/)) {
        const paramName = segment.slice(1, -1);
        return `:${paramName}`;
      }
      return segment;
    });

    return transformedSegments.join('/');
  };

  // Transform the path for the URL
  const transformedPath = transformPath(request.path);
  const baseUrl = request.global.server;
  const fullUrl = ensureUrl(baseUrl + transformedPath);

  const pathParams = [];
  const urlSegments = transformedPath.split('/');
  urlSegments.forEach((segment) => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      pathParams.push({
        uid: uuid(),
        name: paramName,
        value: '',
        description: '',
        enabled: true,
        type: 'path'
      });
    }
  });

  const brunoRequestItem = {
    uid: uuid(),
    name: operationName,
    type: 'http-request',
    request: {
      url: fullUrl,
      method: request.method.toUpperCase(),
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null
      },
      headers: [],
      params: [...pathParams],
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

  return brunoRequestItem;
};

/**
 * Get path segments from a path
 * @param {string} path - Path to get segments from
 * @returns {Array} Path segments
 */
const getPathSegments = (path) => {
  return path.split('/').filter((segment) => segment);
};

/**
 * Create folder structure based on paths
 * @param {Array} paths - Paths to create folder structure from
 * @returns {Map} Folder tree
 */
const createFolderStructure = (paths) => {
  const folderTree = new Map();

  // Helper function to get or create a folder in the tree
  const getOrCreateFolder = (parentMap, folderName) => {
    if (!parentMap.has(folderName)) {
      parentMap.set(folderName, {
        name: folderName,
        subFolders: new Map(),
        requests: []
      });
    }
    return parentMap.get(folderName);
  };

  // Process each request and create folder structure
  paths.forEach((request) => {
    const segments = getPathSegments(request.path);
    let currentLevel = folderTree;

    // Create folders for each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (i === segments.length - 1) {
        const folder = getOrCreateFolder(currentLevel, segment);
        folder.requests.push(request);
      } else {
        currentLevel = getOrCreateFolder(currentLevel, segment).subFolders;
      }
    }
  });
  return folderTree;
};

/**
 * Flatten folder structure to Bruno folders
 * @param {Map} folderTree - Folder tree
 * @returns {Array} Bruno folders
 */
const flattenFolderStructure = (folderTree) => {
  const brunoFolders = [];

  const processFolderLevel = (level, parentFolder = null) => {
    for (const [folderName, folder] of level) {
      const brunoFolder = {
        uid: uuid(),
        name: folderName,
        type: 'folder',
        items: folder.requests?.map(transformOpenapiRequestItem)
      };

      if (folder.subFolders.size > 0) {
        const subFolders = [];
        processFolderLevel(folder.subFolders, subFolders);
        brunoFolder.items = [...brunoFolder.items, ...subFolders];
      }

      if (parentFolder) {
        parentFolder.push(brunoFolder);
      } else {
        brunoFolders.push(brunoFolder);
      }
    }
  };

  processFolderLevel(folderTree);
  return brunoFolders;
};

/**
 * Parse OpenAPI data to Bruno collection
 * @param {object} data - OpenAPI data
 * @returns {Promise<object>} Bruno collection
 */
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
        throw new Error('Invalid OpenAPI collection. Failed to resolve refs.');
      }

      // Currently parsing of openapi spec is "do your best", that is
      // allows "invalid" openapi spec

      // Assumes v3 if not defined. v2 is not supported yet
      if (collectionData.openapi && !collectionData.openapi.startsWith('3')) {
        throw new Error('Only OpenAPI v3 is supported currently.');
      }

      // TODO what if info.title not defined?
      brunoCollection.name = collectionData.info.title;
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

      // Create requests array from paths
      let allRequests = Object.entries(collectionData.paths)
        .map(([path, methods]) => {
          return Object.entries(methods)
            .filter(([method]) => {
              return ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(
                method.toLowerCase()
              );
            })
            .map(([method, operationObject]) => ({
              method,
              path,
              operationObject,
              global: {
                server: '{{baseUrl}}',
                security: securityConfig
              }
            }));
        })
        .flat();

      // Create folder structure based on paths
      const folderTree = createFolderStructure(allRequests);
      const brunoFolders = flattenFolderStructure(folderTree);

      brunoCollection.items = brunoFolders;
      resolve(brunoCollection);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

/**
 * Convert OpenAPI spec to Bruno collection
 * @param {object|string} data - OpenAPI spec as object or string (JSON/YAML)
 * @returns {Promise<object>} Bruno collection
 */
const convertOpenApiToBruno = async (data) => {
  try {
    // If data is a string, try to parse it as JSON or YAML
    if (typeof data === 'string') {
      try {
        // Try to parse as JSON
        data = JSON.parse(data);
      } catch (jsonError) {
        try {
          // Try to parse as YAML
          data = yaml.load(data);
        } catch (yamlError) {
          throw new Error('Failed to parse OpenAPI spec: Invalid JSON or YAML');
        }
      }
    }

    const collection = await parseOpenApiCollection(data);
    return collection;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  convertOpenApiToBruno,
  parseOpenApiCollection,
  transformOpenapiRequestItem
}; 