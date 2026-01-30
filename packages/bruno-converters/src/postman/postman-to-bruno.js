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

/**
 * Transforms Postman descriptions to handle both legacy and new formats.
 *
 * Postman changed their description format:
 * - Legacy format: description was a simple string
 * - New format: description is an object with 'content' and 'type' properties
 *
 * This function handles both formats to ensure backward compatibility.
 */
const transformDescription = (description) => {
  if (!description) {
    return '';
  }

  if (typeof description === 'string') {
    return description;
  }

  if (typeof description === 'object' && description.hasOwnProperty('content')) {
    return description.content;
  }

  return '';
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
  const pathStr = Array.isArray(path) ? path.join('/') : path || '';
  const portStr = port ? `:${port}` : '';
  const queryStr
    = query && Array.isArray(query) && query.length > 0
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
          requestObject.script.req = postmanTranslation(event.script.exec);
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
          requestObject.script.res = postmanTranslation(event.script.exec);
        } else {
          requestObject.script.res = '';
          console.warn('Unexpected event.script.exec type', typeof event.script.exec);
        }
      }
    }
  });
};

const importCollectionLevelVariables = (variables, requestObject) => {
  const vars = variables.filter((v) => !(v.key == null && v.value == null)).map((v) => ({
    uid: uuid(),
    name: (v.key ?? '').replace(invalidVariableCharacterRegex, '_'),
    value: v.value ?? '',
    enabled: true
  }));

  requestObject.vars.req = vars;
};

export const processAuth = (auth, requestObject, isCollection = false) => {
  // As of 14/05/2025
  // When collections are set to "No Auth" in Postman, the auth object is null.
  // When folders and requests are set to "Inherit" in Postman, the auth object is null.
  // When folders and requests are set to "No Auth" in Postman, the auth object is present.

  // Handle collection-specific "No Auth"
  if (isCollection && !auth) return; // Return as requestObject is a collection and has a default mode = none

  // Handle folder/request specific "Inherit"
  if (!auth) return; // Return as requestObject is a folder/request and has a default mode = inherit

  // Handle folder/request specific "No Auth"
  if (auth.type === AUTH_TYPES.NOAUTH) {
    requestObject.auth.mode = AUTH_TYPES.NONE; // Set the mode to none
    return; // No further processing needed
  }

  let authValues = auth[auth.type] ?? [];
  if (Array.isArray(authValues)) {
    authValues = convertV21Auth(authValues);
  }

  requestObject.auth.mode = auth.type; // Set the mode based on Postman's auth type

  switch (auth.type) {
    case AUTH_TYPES.BASIC:
      requestObject.auth.basic = {
        username: authValues.username || '',
        password: authValues.password || ''
      };
      break;
    case AUTH_TYPES.BEARER:
      requestObject.auth.bearer = {
        token: authValues.token || ''
      };
      break;
    case AUTH_TYPES.AWSV4:
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
      requestObject.auth.apikey = {
        key: authValues.key || '',
        value: authValues.value?.toString() || '', // Convert the value to a string as Postman's schema does not rigidly define the type of it,
        placement: 'header' // By default we are placing the apikey values in headers!
      };
      break;
    case AUTH_TYPES.DIGEST:
      requestObject.auth.digest = {
        username: authValues.username || '',
        password: authValues.password || ''
      };
      break;
    case AUTH_TYPES.OAUTH2:
      const findValueUsingKey = (key) => authValues[key] || '';

      // Maps Postman's grant_type to the Bruno's grantType string expected in the target object
      const oauth2GrantTypeMaps = {
        authorization_code_with_pkce: 'authorization_code',
        authorization_code: 'authorization_code',
        client_credentials: 'client_credentials',
        password_credentials: 'password'
      };

      const postmanGrantType = findValueUsingKey('grant_type');
      const targetGrantType = oauth2GrantTypeMaps[postmanGrantType] || 'client_credentials'; // Default

      // Common properties for all OAuth2 grant types
      const baseOAuth2Config = {
        grantType: targetGrantType,
        accessTokenUrl: findValueUsingKey('accessTokenUrl'),
        refreshTokenUrl: findValueUsingKey('refreshTokenUrl'),
        clientId: findValueUsingKey('clientId'),
        clientSecret: findValueUsingKey('clientSecret'),
        scope: findValueUsingKey('scope'),
        state: findValueUsingKey('state'),
        tokenPlacement: findValueUsingKey('addTokenTo') === 'header' ? 'header' : 'url',
        credentialsPlacement: findValueUsingKey('client_authentication') === 'body' ? 'body' : 'basic_auth_header'
      };

      switch (postmanGrantType) {
        case 'authorization_code':
          requestObject.auth.oauth2 = {
            ...baseOAuth2Config,
            authorizationUrl: findValueUsingKey('authUrl'),
            callbackUrl: findValueUsingKey('redirect_uri'),
            pkce: false // PKCE is not used for standard authorization_code
          };
          break;
        case 'authorization_code_with_pkce':
          requestObject.auth.oauth2 = {
            ...baseOAuth2Config,
            authorizationUrl: findValueUsingKey('authUrl'),
            callbackUrl: findValueUsingKey('redirect_uri'),
            pkce: true // Explicitly set pkce to true for this grant type
          };
          break;
        case 'password_credentials':
          requestObject.auth.oauth2 = {
            ...baseOAuth2Config,
            username: findValueUsingKey('username'),
            password: findValueUsingKey('password')
          };
          break;
        case 'client_credentials':
          requestObject.auth.oauth2 = baseOAuth2Config;
          break;
        default:
          console.warn('Unexpected OAuth2 grant type after mapping:', targetGrantType);
          requestObject.auth.oauth2 = baseOAuth2Config; // Fallback to default which is Client Credentials
          break;
      }
      break;
    default:
      requestObject.auth.mode = AUTH_TYPES.NONE;
      console.warn('Unexpected auth.type:', auth.type, '- Mode set, but no specific config generated.');
      break;
  }
};

const importPostmanV2CollectionItem = (brunoParent, item, { useWorkers = false } = {}, scriptMap) => {
  brunoParent.items = brunoParent.items || [];
  const folderMap = {};
  const requestMap = {};

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
          docs: transformDescription(i.description),
          meta: {
            name: folderName
          },
          request: {
            auth: {
              mode: 'inherit',
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
      processAuth(i.auth, brunoFolderItem.root.request);

      if (i.item && i.item.length) {
        importPostmanV2CollectionItem(brunoFolderItem, i.item, { useWorkers }, scriptMap);
      }

      if (i.event) {
        if (useWorkers) {
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
      const method = i?.request?.method?.toUpperCase();
      if (!method || typeof method !== 'string' || !method.trim()) {
        console.warn('Missing or invalid request.method', method);
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
          method: method,
          auth: {
            mode: 'inherit',
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
          docs: transformDescription(i.request.description)
        }
      };

      const settings = {
        encodeUrl: i.protocolProfileBehavior?.disableUrlEncoding !== true
      };

      // Handle followRedirects setting
      if (i.protocolProfileBehavior?.followRedirects !== undefined) {
        settings.followRedirects = i.protocolProfileBehavior.followRedirects;
      }

      // Handle maxRedirects setting
      if (i.protocolProfileBehavior?.maxRedirects !== undefined) {
        settings.maxRedirects = i.protocolProfileBehavior.maxRedirects;
      }

      brunoRequestItem.settings = settings;

      brunoParent.items.push(brunoRequestItem);

      if (i.event) {
        if (useWorkers) {
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
                brunoRequestItem.request.script.req = postmanTranslation(event.script.exec);
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
                brunoRequestItem.request.script.res = postmanTranslation(event.script.exec);
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
              description: transformDescription(param.description),
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
              description: transformDescription(param.description),
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
          description: transformDescription(header.description),
          enabled: !header.disabled
        });
      });

      // Request-level auth
      processAuth(i.request.auth, brunoRequestItem.request);

      each(get(i, 'request.url.query'), (param) => {
        brunoRequestItem.request.params.push({
          uid: uuid(),
          name: param.key,
          value: param.value,
          description: transformDescription(param.description),
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
          description: transformDescription(param.description),
          type: 'path',
          enabled: true
        });
      });

      // Handle Postman examples (responses)
      if (i.response && Array.isArray(i.response)) {
        brunoRequestItem.examples = [];

        i.response.forEach((response, responseIndex) => {
          const sanitized = String(response.name ?? '').replace(/\r?\n/g, ' ').trim();
          const exampleName = sanitized || `Example ${responseIndex + 1}`;

          // Convert originalRequest to Bruno request format
          const originalRequest = response.originalRequest || {};
          const exampleUrl = constructUrl(originalRequest.url);
          const exampleMethod = originalRequest.method?.toUpperCase() || method;

          const example = {
            uid: uuid(),
            itemUid: brunoRequestItem.uid,
            name: exampleName,
            description: '',
            type: 'http-request',
            request: {
              url: exampleUrl,
              method: exampleMethod,
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
            },
            response: {
              status: response.status || '',
              statusText: response.code ? response.code.toString() : '',
              headers: [],
              body: {
                type: getBodyTypeFromContentTypeHeader(response.header),
                content: response.body || ''
              }
            }
          };

          // Convert original request headers
          if (originalRequest.header && Array.isArray(originalRequest.header)) {
            originalRequest.header.forEach((header) => {
              example.request.headers.push({
                uid: uuid(),
                name: header.key,
                value: header.value,
                description: transformDescription(header.description),
                enabled: !header.disabled
              });
            });
          }

          // Convert original request query parameters
          if (originalRequest.url && originalRequest.url.query && Array.isArray(originalRequest.url.query)) {
            originalRequest.url.query.forEach((param) => {
              example.request.params.push({
                uid: uuid(),
                name: param.key,
                value: param.value,
                description: transformDescription(param.description),
                type: 'query',
                enabled: !param.disabled
              });
            });
          }

          if (originalRequest.url && originalRequest.url.variable && Array.isArray(originalRequest.url.variable)) {
            originalRequest.url.variable.forEach((param) => {
              example.request.params.push({
                uid: uuid(),
                name: param.key,
                value: param.value ?? '',
                description: transformDescription(param.description),
                type: 'path',
                enabled: true
              });
            });
          }

          // Convert original request body
          if (originalRequest.body) {
            const bodyMode = originalRequest.body.mode;
            if (bodyMode === 'formdata') {
              example.request.body.mode = 'multipartForm';
              if (originalRequest.body.formdata && Array.isArray(originalRequest.body.formdata)) {
                originalRequest.body.formdata.forEach((param) => {
                  const isFile = param.type === 'file';
                  let value;
                  let type;

                  if (isFile) {
                    value = Array.isArray(param.src) ? param.src : typeof param.src === 'string' ? [param.src] : null;
                    type = 'file';
                  } else {
                    value = param.value;
                    type = 'text';
                  }

                  example.request.body.multipartForm.push({
                    uid: uuid(),
                    type: type,
                    name: param.key,
                    value: value,
                    description: transformDescription(param.description),
                    enabled: !param.disabled
                  });
                });
              }
            } else if (bodyMode === 'urlencoded') {
              example.request.body.mode = 'formUrlEncoded';
              if (originalRequest.body.urlencoded && Array.isArray(originalRequest.body.urlencoded)) {
                originalRequest.body.urlencoded.forEach((param) => {
                  example.request.body.formUrlEncoded.push({
                    uid: uuid(),
                    name: param.key,
                    value: param.value,
                    description: transformDescription(param.description),
                    enabled: !param.disabled
                  });
                });
              }
            } else if (bodyMode === 'raw') {
              let language = get(originalRequest, 'body.options.raw.language');
              if (!language) {
                language = searchLanguageByHeader(originalRequest.header || []);
              }
              if (language === 'json') {
                example.request.body.mode = 'json';
                example.request.body.json = originalRequest.body.raw;
              } else if (language === 'xml') {
                example.request.body.mode = 'xml';
                example.request.body.xml = originalRequest.body.raw;
              } else {
                example.request.body.mode = 'text';
                example.request.body.text = originalRequest.body.raw;
              }
            }
          }

          // Convert response headers
          if (response.header && Array.isArray(response.header)) {
            response.header.forEach((header) => {
              example.response.headers.push({
                uid: uuid(),
                name: header.key,
                value: header.value,
                description: transformDescription(header.description),
                enabled: true
              });
            });
          }

          brunoRequestItem.examples.push(example);
        });
      }

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

const getBodyTypeFromContentTypeHeader = (headers) => {
  // Check if headers is null, undefined, or not an array
  if (!headers || !Array.isArray(headers)) {
    return 'text';
  }

  const contentTypeHeader = headers.find((header) => header.key.toLowerCase() === 'content-type');
  if (contentTypeHeader) {
    const contentType = contentTypeHeader.value?.toLowerCase();
    if (contentType?.includes('application/json')) {
      return 'json';
    } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
      return 'xml';
    } else if (contentType?.includes('text/html')) {
      return 'html';
    }
  }
  return 'text';
};

const importPostmanV2Collection = async (collection, { useWorkers = false }) => {
  const brunoCollection = {
    name: collection.info.name || 'Untitled Collection',
    uid: uuid(),
    version: '1',
    items: [],
    environments: [],
    root: {
      docs: transformDescription(collection.info.description),
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
  processAuth(collection.auth, brunoCollection.root.request, true);

  // Create a single scriptMap for all items
  const scriptMap = useWorkers ? new Map() : null;

  importPostmanV2CollectionItem(brunoCollection, collection.item, { useWorkers }, scriptMap);

  // Process all scripts in a single call at the top level
  if (useWorkers && scriptMap && scriptMap.size > 0) {
    try {
      const { default: scriptTranslationWorker } = await import('../workers/postman-translator-worker');
      const translatedScripts = await scriptTranslationWorker(scriptMap);

      // Apply translated scripts to all items in the collection
      const applyScriptsToItems = (items) => {
        items.forEach((item) => {
          if (item.type === 'folder') {
            // Apply scripts to the folder
            if (translatedScripts.has(item.uid)) {
              if (!item.root.request.script) {
                item.root.request.script = {};
              }
              if (!item.root.request.tests) {
                item.root.request.tests = '';
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
              if (!item.request.tests) {
                item.request.tests = '';
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
