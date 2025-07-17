import get from 'lodash/get';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';
import each from 'lodash/each';
import postmanTranslation from './postman-translations';
import { invalidVariableCharacterRegex } from '../constants/index';  

const AUTH_TYPES = Object.freeze({
  BASIC: 'basic',
  BEARER: 'bearer',
  AWSV4: 'awsv4',
  APIKEY: 'apikey',
  DIGEST: 'digest',
  OAUTH2: 'oauth2',
  NOAUTH: 'noauth',
  NONE: 'none'
});

const parseGraphQLRequest = (graphqlSource) => {
  try {
    let queryResultObject = {
      query: '',
      variables: ''
    };

    if (typeof graphqlSource === 'string') {
      graphqlSource = JSON.parse(graphqlSource);
    }

    if (graphqlSource.hasOwnProperty('variables') && graphqlSource.variables !== '') {
      queryResultObject.variables = graphqlSource.variables;
    }

    if (graphqlSource.hasOwnProperty('query') && graphqlSource.query !== '') {
      queryResultObject.query = graphqlSource.query;
    }

    return queryResultObject;
  } catch (e) {
    return {
      query: '',
      variables: ''
    };
  }
};

const isItemAFolder = (item) => {
  return !item.request;
};

const convertV21Auth = (array) => {
  return array.reduce((accumulator, currentValue) => {
    accumulator[currentValue.key] = currentValue.value;
    return accumulator;
  }, {});
};

const constructUrlFromParts = (url) => {
  if (!url) return '';
  
  const { protocol = 'http', host, path, port, query, hash } = url || {};
  const hostStr = Array.isArray(host) ? host.filter(Boolean).join('.') : host || '';
  const pathStr = Array.isArray(path) ? path.filter(Boolean).join('/') : path || '';
  const portStr = port ? `:${port}` : '';
  const queryStr =
    query && Array.isArray(query) && query.length > 0
      ? `?${query
          .filter((q) => q && q.key)
          .map((q) => `${q.key}=${q.value || ''}`)
          .join('&')}`
      : '';
  const urlStr = `${protocol}://${hostStr}${portStr}${pathStr ? `/${pathStr}` : ''}${queryStr}`;
  return urlStr;
};

const constructUrl = (url) => {
  if (!url) return '';

  if (typeof url === 'string') {
    return url;
  }

  if (typeof url === 'object') {
    const { raw } = url;

    if (raw && typeof raw === 'string') {
      // If the raw URL contains url-fragments remove it
      if (raw.includes('#')) {
        return raw.split('#')[0]; // Returns the part of raw URL without the url-fragment part.
      }
      return raw;
    }

    // If no raw value exists, construct the URL from parts
    return constructUrlFromParts(url);
  }

  return '';
};

const importScriptsFromEvents = (events, requestObject) => {
  events.forEach((event) => {
    if (event.script && event.script.exec) {
      if (event.listen === 'prerequest') {
        if (!requestObject.script) {
          requestObject.script = {};
        }

        if (event.script.exec && event.script.exec.length > 0) {
          requestObject.script.req = postmanTranslation(event.script.exec)
        } else {
          requestObject.script.req = '';
          console.warn('Unexpected event.script.exec type', typeof event.script.exec);
        }
      }

      if (event.listen === 'test') {
        if (!requestObject.script) {
          requestObject.script = {};
        }

        if (event.script.exec && event.script.exec.length > 0) {
          requestObject.script.res = postmanTranslation(event.script.exec)
        } else {
          requestObject.script.res = '';
          console.warn('Unexpected event.script.exec type', typeof event.script.exec);
        }
      }
    }
  });
};

const importCollectionLevelVariables = (variables, requestObject) => {
  const vars = variables.filter(v => !(v.key == null && v.value == null)).map((v) => ({
    uid: uuid(),
    name: (v.key ?? '').replace(invalidVariableCharacterRegex, '_'),
    value: v.value ?? '',
    enabled: true
  }));

  requestObject.vars.req = vars;
};

export const processAuth = (auth, requestObject) => {
  if (!auth || !auth.type || auth.type === AUTH_TYPES.NOAUTH) {
    return;
  }

  let authValues = auth[auth.type];

  if(!authValues) {
    console.warn('Unexpected auth.type, auth object doesn\'t have the key', auth.type);
    requestObject.auth.mode = auth.type;
    authValues = {};
  }

  if (Array.isArray(authValues)) {
    authValues = convertV21Auth(authValues);
  }

  switch (auth.type) {
    case AUTH_TYPES.BASIC:
      requestObject.auth.mode = AUTH_TYPES.BASIC;
      requestObject.auth.basic = {
        username: authValues.username || '',
        password: authValues.password || ''
      };
      break;
    case AUTH_TYPES.BEARER:
      requestObject.auth.mode = AUTH_TYPES.BEARER;
      requestObject.auth.bearer = {
        token: authValues.token || ''
      };
      break;
    case AUTH_TYPES.AWSV4:
      requestObject.auth.mode = AUTH_TYPES.AWSV4;
      requestObject.auth.awsv4 = {
        accessKeyId: authValues.accessKey || '',
        secretAccessKey: authValues.secretKey || '',
        sessionToken: authValues.sessionToken || '',
        service: authValues.service || '',
        region: authValues.region || '',
        profileName: ''
      };
      break;
    case AUTH_TYPES.APIKEY:
      requestObject.auth.mode = AUTH_TYPES.APIKEY;
      requestObject.auth.apikey = {
        key: authValues.key || '',
        value: authValues.value?.toString() || '', // Convert the value to a string as Postman's schema does not rigidly define the type of it,
        placement: 'header' //By default we are placing the apikey values in headers!
      };
      break;
    case AUTH_TYPES.DIGEST:
      requestObject.auth.mode = AUTH_TYPES.DIGEST;
      requestObject.auth.digest = {
        username: authValues.username || '',
        password: authValues.password || ''
      };
      break;
    case AUTH_TYPES.OAUTH2:
      const findValueUsingKey = (key) => {
        return authValues[key] || '';
      };
      const oauth2GrantTypeMaps = {
        authorization_code_with_pkce: 'authorization_code',
        authorization_code: 'authorization_code',
        client_credentials: 'client_credentials',
        password_credentials: 'password_credentials'
      };
      const grantType = oauth2GrantTypeMaps[findValueUsingKey('grant_type')] || 'authorization_code';

      requestObject.auth.mode = AUTH_TYPES.OAUTH2;
      if (grantType === 'authorization_code') {
        requestObject.auth.oauth2 = {
          grantType: 'authorization_code',
          authorizationUrl: findValueUsingKey('authUrl'),
          callbackUrl: findValueUsingKey('redirect_uri'),
          accessTokenUrl: findValueUsingKey('accessTokenUrl'),
          refreshTokenUrl: findValueUsingKey('refreshTokenUrl'),
          clientId: findValueUsingKey('clientId'),
          clientSecret: findValueUsingKey('clientSecret'),
          scope: findValueUsingKey('scope'),
          state: findValueUsingKey('state'),
          pkce: Boolean(findValueUsingKey('grant_type') == 'authorization_code_with_pkce'),
          tokenPlacement: findValueUsingKey('addTokenTo') == 'header' ? 'header' : 'url',
          credentialsPlacement: findValueUsingKey('client_authentication') == 'body' ? 'body' : 'basic_auth_header'
        };
      } else if (grantType === 'password_credentials') {
        requestObject.auth.oauth2 = {
          grantType: 'password',
          accessTokenUrl: findValueUsingKey('accessTokenUrl'),
          refreshTokenUrl: findValueUsingKey('refreshTokenUrl'),
          username: findValueUsingKey('username'),
          password: findValueUsingKey('password'),
          clientId: findValueUsingKey('clientId'),
          clientSecret: findValueUsingKey('clientSecret'),
          scope: findValueUsingKey('scope'),
          state: findValueUsingKey('state'),
          tokenPlacement: findValueUsingKey('addTokenTo') == 'header' ? 'header' : 'url',
          credentialsPlacement: findValueUsingKey('client_authentication') == 'body' ? 'body' : 'basic_auth_header'
        };
      } else if (grantType === 'client_credentials') {
        requestObject.auth.oauth2 = {
          grantType: 'client_credentials',
          accessTokenUrl: findValueUsingKey('accessTokenUrl'),
          refreshTokenUrl: findValueUsingKey('refreshTokenUrl'),
          clientId: findValueUsingKey('clientId'),
          clientSecret: findValueUsingKey('clientSecret'),
          scope: findValueUsingKey('scope'),
          state: findValueUsingKey('state'),
          tokenPlacement: findValueUsingKey('addTokenTo') == 'header' ? 'header' : 'url',
          credentialsPlacement: findValueUsingKey('client_authentication') == 'body' ? 'body' : 'basic_auth_header'
        };
      }
      break;
    default:
      requestObject.auth.mode = AUTH_TYPES.NONE;
      console.warn('Unexpected auth.type', auth.type);
  }
};

const importPostmanV2CollectionItem = (brunoParent, item, parentAuth, { useWorkers = false } = {}, scriptMap)=> {
  brunoParent.items = brunoParent.items || [];
  const folderMap = {};
  const requestMap = {};
  const requestMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE']

  item.forEach((i, index) => {
    if (isItemAFolder(i)) {
      const baseFolderName = i.name || 'Untitled Folder';
      let folderName = baseFolderName;
      let count = 1;

      while (folderMap[folderName]) {
        folderName = `${baseFolderName}_${count}`;
        count++;
      }

      const brunoFolderItem = {
        uid: uuid(),
        name: folderName,
        type: 'folder',
        items: [],
        seq: index + 1,
        root: {
          docs: i.description || '',
          meta: {
            name: folderName
          },
          request: {
            auth: {
              mode: 'none',
              basic: null,
              bearer: null,
              awsv4: null,
              apikey: null,
              oauth2: null,
              digest: null
            },
            headers: [],
            script: {},
            tests: '',
            vars: {}
          }
        }
      };

      brunoParent.items.push(brunoFolderItem);

      // Folder level auth
      if (i.auth) {
        processAuth(i.auth, brunoFolderItem.root.request);
      } else if (parentAuth) {
        // Inherit parent auth if folder doesn't define its own
        processAuth(parentAuth, brunoFolderItem.root.request);
      }

      if (i.item && i.item.length) {
         importPostmanV2CollectionItem(brunoFolderItem, i.item, i.auth ?? parentAuth, { useWorkers }, scriptMap);
      }

      if (i.event) {
        if(useWorkers) {
          scriptMap.set(brunoFolderItem.uid, {
            events: i.event,
            request: brunoFolderItem.root.request
          });
        } else {
          importScriptsFromEvents(i.event, brunoFolderItem.root.request);
        }
      }

      folderMap[folderName] = brunoFolderItem;

    } else if (i.request) {
      if (!requestMethods.includes(i?.request?.method.toUpperCase())) {
        console.warn('Unexpected request.method', i?.request?.method);
        return;
      }

      const baseRequestName = i.name || 'Untitled Request';
      let requestName = baseRequestName;
      let count = 1;

      while (requestMap[requestName]) {
        requestName = `${baseRequestName}_${count}`;
        count++;
      }

      const url = constructUrl(i.request.url);

      const brunoRequestItem = {
        uid: uuid(),
        name: requestName,
        type: 'http-request',
        seq: index + 1, 
        request: {
          url: url,
          method: i?.request?.method?.toUpperCase(),
          auth: {
            mode: 'none',
            basic: null,
            bearer: null,
            awsv4: null,
            apikey: null,
            oauth2: null,
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
          },
          docs: i.request.description || ''
        }
      };

      const settings = {
        encodeUrl: i.protocolProfileBehavior?.disableUrlEncoding !== true
      }

      brunoRequestItem.settings = settings;

      brunoParent.items.push(brunoRequestItem);

      if (i.event) {
        if(useWorkers) {
            scriptMap.set(brunoRequestItem.uid, {
            events: i.event,
            request: brunoRequestItem.request
          });
        } else {
          i.event.forEach((event) => {
            if (event.listen === 'prerequest' && event.script && event.script.exec) {
              if (!brunoRequestItem.request?.script) {
                brunoRequestItem.request.script = {};
              }
              if (event.script.exec && event.script.exec.length > 0) {
                brunoRequestItem.request.script.req = postmanTranslation(event.script.exec)
              } else {
                brunoRequestItem.request.script.req = '';
                console.warn('Unexpected event.script.exec type', typeof event.script.exec);
              }
            }
            if (event.listen === 'test' && event.script && event.script.exec) {
              if (!brunoRequestItem.request?.script) {
                brunoRequestItem.request.script = {};
              }
              if (event.script.exec && event.script.exec.length > 0) {
                brunoRequestItem.request.script.res = postmanTranslation(event.script.exec)
              } else {
                brunoRequestItem.request.script.res = '';
                console.warn('Unexpected event.script.exec type', typeof event.script.exec);
              }
            }

          });
        }
      }

      const bodyMode = get(i, 'request.body.mode');
      if (bodyMode) {
        if (bodyMode === 'formdata') {
          brunoRequestItem.request.body.mode = 'multipartForm';

          each(i.request.body.formdata, (param) => {
            const isFile = param.type === 'file';
            let value;
            let type;

            if (isFile) {
              // If param.src is an array, keep it as it is.
              // If param.src is a string, convert it into an array with a single element.
              value = Array.isArray(param.src) ? param.src : typeof param.src === 'string' ? [param.src] : null;
              type = 'file';
            } else {
              value = param.value;
              type = 'text';
            }

            brunoRequestItem.request.body.multipartForm.push({
              uid: uuid(),
              type: type,
              name: param.key,
              value: value,
              description: param.description,
              enabled: !param.disabled
            });
          });
        }

        if (bodyMode === 'urlencoded') {
          brunoRequestItem.request.body.mode = 'formUrlEncoded';
          each(i.request.body.urlencoded, (param) => {
            brunoRequestItem.request.body.formUrlEncoded.push({
              uid: uuid(),
              name: param.key,
              value: param.value,
              description: param.description,
              enabled: !param.disabled
            });
          });
        }

        if (bodyMode === 'raw') {
          let language = get(i, 'request.body.options.raw.language');
          if (!language) {
            language = searchLanguageByHeader(i.request.header);
          }
          if (language === 'json') {
            brunoRequestItem.request.body.mode = 'json';
            brunoRequestItem.request.body.json = i.request.body.raw;
          } else if (language === 'xml') {
            brunoRequestItem.request.body.mode = 'xml';
            brunoRequestItem.request.body.xml = i.request.body.raw;
          } else {
            brunoRequestItem.request.body.mode = 'text';
            brunoRequestItem.request.body.text = i.request.body.raw;
          }
        }
      }

      if (bodyMode === 'graphql') {
        brunoRequestItem.type = 'graphql-request';
        brunoRequestItem.request.body.mode = 'graphql';
        brunoRequestItem.request.body.graphql = parseGraphQLRequest(i.request.body.graphql);
      }

      each(i.request.header, (header) => {
        brunoRequestItem.request.headers.push({
          uid: uuid(),
          name: header.key,
          value: header.value,
          description: header.description,
          enabled: !header.disabled
        });
      });

      // Handle request-level auth or inherit from parent
      const auth = i.request.auth ?? parentAuth;
      processAuth(auth, brunoRequestItem.request);

      each(get(i, 'request.url.query'), (param) => {
        brunoRequestItem.request.params.push({
          uid: uuid(),
          name: param.key,
          value: param.value,
          description: param.description,
          type: 'query',
          enabled: !param.disabled
        });
      });

      each(get(i, 'request.url.variable', []), (param) => {
        if (!param.key) {
          // If no key, skip this iteration and discard the param
          return;
        }

        brunoRequestItem.request.params.push({
          uid: uuid(),
          name: param.key,
          value: param.value ?? '',
          description: param.description ?? '',
          type: 'path',
          enabled: true
        });
      });

      requestMap[requestName] = brunoRequestItem;
    }
  });
};

  
const searchLanguageByHeader = (headers) => {
  let contentType;
  each(headers, (header) => {
    if (header.key.toLowerCase() === 'content-type' && !header.disabled) {
      if (typeof header.value == 'string' && /^[\w\-]+\/([\w\-]+\+)?json/.test(header.value)) {
        contentType = 'json';
      } else if (typeof header.value == 'string' && /^[\w\-]+\/([\w\-]+\+)?xml/.test(header.value)) {
        contentType = 'xml';
      }
      return false;
    }
  });
  return contentType;
};

const importPostmanV2Collection = async (collection, { useWorkers = false }) => {
  const brunoCollection = {
    name: collection.info.name || 'Untitled Collection',
    uid: uuid(),
    version: '1',
    items: [],
    environments: [],
    root: {
      docs: collection.info.description || '',
      meta: {
        name: collection.info.name || 'Untitled Collection'
      },
      request: {
        auth: {
          mode: 'none',
          basic: null,
          bearer: null,
          awsv4: null,
          apikey: null,
          oauth2: null,
          digest: null
        },
        headers: [],
        script: {},
        tests: '',
        vars: {}
      }
    }
  };

  if (collection.event) {
    importScriptsFromEvents(collection.event, brunoCollection.root.request);
  }

  if (collection?.variable) {
    importCollectionLevelVariables(collection.variable, brunoCollection.root.request);
  }

  // Collection level auth
  processAuth(collection.auth, brunoCollection.root.request);

  // Create a single scriptMap for all items
  const scriptMap = useWorkers ? new Map() : null;
  
  importPostmanV2CollectionItem(brunoCollection, collection.item, collection.auth, { useWorkers }, scriptMap);
  
  // Process all scripts in a single call at the top level
  if (useWorkers && scriptMap && scriptMap.size > 0) {
    try {
      const { default: scriptTranslationWorker } = await import('../workers/postman-translator-worker');    
      const translatedScripts = await scriptTranslationWorker(scriptMap);
      
      // Apply translated scripts to all items in the collection
      const applyScriptsToItems = (items) => {
        items.forEach(item => {
          if (item.type === 'folder') {
            // Apply scripts to the folder
            if (translatedScripts.has(item.uid)) {
              if (!item.root.request.script) {
                item.root.request.script = {};
              }
              
              const script = translatedScripts.get(item.uid).request?.script?.req;
              const tests = translatedScripts.get(item.uid).request?.script?.res;
              
              item.root.request.script.req = script && script.length > 0 ? script : '';
              item.root.request.script.res = tests && tests.length > 0 ? tests : '';
            }
            
            // Recursively apply to nested items
            if (item.items && item.items.length > 0) {
              applyScriptsToItems(item.items);
            }
          } else {
            if (translatedScripts.has(item.uid)) {
              if (!item.request.script) {
                item.request.script = {};
              }
              
              const script = translatedScripts.get(item.uid).request?.script?.req;
              const tests = translatedScripts.get(item.uid).request?.script?.res;
              
              item.request.script.req = script && script.length > 0 ? script : '';
              item.request.script.res = tests && tests.length > 0 ? tests : '';
            }
          }
        });
      };
      
      applyScriptsToItems(brunoCollection.items);
      
    } catch (error) {
      console.error('Error in script translation worker:', error);
    } finally {
      scriptMap.clear();
    }
  }
  
  return brunoCollection;
};


const parsePostmanCollection = async (collection, { useWorkers = false }) => {
  try {
    let schema = get(collection, 'info.schema');

    let v2Schemas = [
      'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      'https://schema.postman.com/json/collection/v2.0.0/collection.json',
      'https://schema.postman.com/json/collection/v2.1.0/collection.json'
    ];

    if (v2Schemas.includes(schema)) {
      return await importPostmanV2Collection(collection, { useWorkers });
    }

    throw new Error('Unsupported Postman schema version. Only Postman Collection v2.0 and v2.1 are supported.');
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      throw err;
    }

    throw new Error('Invalid Postman collection format. Please check your JSON file.');
  }
};

const postmanToBruno = async (postmanCollection, { useWorkers = false } = {}) => {
  try {

    const parsedPostmanCollection = await parsePostmanCollection(postmanCollection, { useWorkers });
    const transformedCollection = transformItemsInCollection(parsedPostmanCollection);
    const hydratedCollection = hydrateSeqInCollection(transformedCollection);
    const validatedCollection = validateSchema(hydratedCollection);
    return validatedCollection;
  } catch (err) {
    console.log(err);
    throw new Error(`Import collection failed: ${err.message}`);
  }
};

export default postmanToBruno;