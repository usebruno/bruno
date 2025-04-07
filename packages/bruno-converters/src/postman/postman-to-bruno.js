import get from 'lodash/get';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';
import each from 'lodash/each';
import postmanTranslation from './postman-translations';

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
  const { protocol = 'http', host, path, port, query, hash } = url || {};
  const hostStr = Array.isArray(host) ? host.filter(Boolean).join('.') : host || '';
  const pathStr = Array.isArray(path) ? path.filter(Boolean).join('/') : path || '';
  const portStr = port ? `:${port}` : '';
  const queryStr =
    query && Array.isArray(query) && query.length > 0
      ? `?${query
          .filter((q) => q.key)
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

        if (Array.isArray(event.script.exec) && event.script.exec.length > 0) {
          requestObject.script.req = event.script.exec
            .map((line) => postmanTranslation(line))
            .join('\n');
        } else if (typeof event.script.exec === 'string') {
          requestObject.script.req = postmanTranslation(event.script.exec);
        } else {
          console.warn('Unexpected event.script.exec type', typeof event.script.exec);
        }
      }

      if (event.listen === 'test') {
        if (!requestObject.tests) {
          requestObject.tests = {};
        }

        if (Array.isArray(event.script.exec) && event.script.exec.length > 0) {
          requestObject.tests = event.script.exec
            .map((line) => postmanTranslation(line))
            .join('\n');
        } else if (typeof event.script.exec === 'string') {
          return postmanTranslation(event.script.exec);
        } else {
          console.warn('Unexpected event.script.exec type', typeof event.script.exec);
        }
      }
    }
  });
};

const importCollectionLevelVariables = (variables, requestObject) => {
  const vars = variables.map((v) => ({
    uid: uuid(),
    name: v.key,
    value: v.value,
    enabled: true
  }));

  requestObject.vars.req = vars;
};

const importPostmanV2CollectionItem = (brunoParent, item, parentAuth) => {
  brunoParent.items = brunoParent.items || [];
  const folderMap = {};
  const requestMap = {};
  const requestMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE']

  each(item, (i) => {
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
              awsv4: null
            },
            headers: [],
            script: {},
            tests: '',
            vars: {}
          }
        }
      };
      if (i.item && i.item.length) {
        importPostmanV2CollectionItem(brunoFolderItem, i.item, i.auth ?? parentAuth);
      }

      if (i.event) {
        importScriptsFromEvents(i.event, brunoFolderItem.root.request);
      }

      brunoParent.items.push(brunoFolderItem);
      folderMap[folderName] = brunoFolderItem;

    } else {
      if (i.request) {
        if(!requestMethods.includes(i?.request?.method.toUpperCase())){
          console.warn("Unexpected request.method")
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
          request: {
            url: url,
            method: i?.request?.method?.toUpperCase(),
            auth: {
              mode: 'none',
              basic: null,
              bearer: null,
              awsv4: null
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
            docs: i.request.description
          }
        };

        if (i.event) {
          i.event.forEach((event) => {
            if (event.listen === 'prerequest' && event.script && event.script.exec) {
              if (!brunoRequestItem.request.script) {
                brunoRequestItem.request.script = {};
              }
              if (Array.isArray(event.script.exec) && event.script.exec.length > 0) {
                brunoRequestItem.request.script.req = event.script.exec
                  .map((line) => postmanTranslation(line))
                  .join('\n');
              } else if (typeof event.script.exec === 'string') {
                brunoRequestItem.request.script.req = postmanTranslation(event.script.exec);
              } else {
                console.warn('Unexpected event.script.exec type', typeof event.script.exec);
              }
            }
            if (event.listen === 'test' && event.script && event.script.exec) {
              if (!brunoRequestItem.request.tests) {
                brunoRequestItem.request.tests = {};
              }
              if (Array.isArray(event.script.exec) && event.script.exec.length > 0) {
                brunoRequestItem.request.tests = event.script.exec
                  .map((line) => postmanTranslation(line))
                  .join('\n');
              } else if (typeof event.script.exec === 'string') {
                return postmanTranslation(event.script.exec);
              } else {
                console.warn('Unexpected event.script.exec type', typeof event.script.exec);
              }
            }
          });
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

        const auth = i.request.auth ?? parentAuth;
        if (auth?.[auth.type] && auth.type !== 'noauth') {
          let authValues = auth[auth.type];
          if (Array.isArray(authValues)) {
            authValues = convertV21Auth(authValues);
          }
          if (auth.type === 'basic') {
            brunoRequestItem.request.auth.mode = 'basic';
            brunoRequestItem.request.auth.basic = {
              username: authValues.username,
              password: authValues.password
            };
          } else if (auth.type === 'bearer') {
            brunoRequestItem.request.auth.mode = 'bearer';
            brunoRequestItem.request.auth.bearer = {
              token: authValues.token
            };
          } else if (auth.type === 'awsv4') {
            brunoRequestItem.request.auth.mode = 'awsv4';
            brunoRequestItem.request.auth.awsv4 = {
              accessKeyId: authValues.accessKey,
              secretAccessKey: authValues.secretKey,
              sessionToken: authValues.sessionToken,
              service: authValues.service,
              region: authValues.region,
              profileName: ''
            };
          } else if (auth.type === 'apikey'){
            brunoRequestItem.request.auth.mode = 'apikey';    
            brunoRequestItem.request.auth.apikey = {
              key: authValues.key,
              value: authValues.value?.toString(), // Convert the value to a string as Postman's schema does not rigidly define the type of it,
              placement: "header" //By default we are placing the apikey values in headers!
            }    
          } else if (auth.type === 'oauth2'){
            const findValueUsingKey = (key) => {
              return auth?.oauth2?.find(v => v?.key == key)?.value || ''
            }
            const oauth2GrantTypeMaps = {
              'authorization_code_with_pkce': 'authorization_code',
              'authorization_code': 'authorization_code',
              'client_credentials': 'client_credentials',
              'password_credentials': 'password_credentials'
            }
            const grantType = oauth2GrantTypeMaps[findValueUsingKey('grant_type')] || 'authorization_code';
            if (grantType) {
              brunoRequestItem.request.auth.mode = 'oauth2';
              switch(grantType) {
                case 'authorization_code':
                  brunoRequestItem.request.auth.oauth2 = {
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
                  break;
                case 'password_credentials':
                  brunoRequestItem.request.auth.oauth2 = {
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
                  break;
                case 'client_credentials':
                  brunoRequestItem.request.auth.oauth2 = {
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
                  break;
              }
            }
          }
        }

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

        brunoParent.items.push(brunoRequestItem);
        requestMap[requestName] = brunoRequestItem;
      }
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

const importPostmanV2Collection = (collection) => {
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
          awsv4: null
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

  if (collection?.variable){
    importCollectionLevelVariables(collection.variable, brunoCollection.root.request);
  }

  importPostmanV2CollectionItem(brunoCollection, collection.item, collection.auth);

  return brunoCollection;
};

const parsePostmanCollection = (collection) => {
  try {
    let schema = get(collection, 'info.schema');

    let v2Schemas = [
      'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      'https://schema.postman.com/json/collection/v2.0.0/collection.json',
      'https://schema.postman.com/json/collection/v2.1.0/collection.json'
    ];

    if (v2Schemas.includes(schema)) {
      return importPostmanV2Collection(collection);
    }

    throw new Error('Unknown postman schema');
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      throw err;
    }

    throw new Error('Unable to parse the postman collection json file');
  }
};

const postmanToBruno = (postmanCollection) => {
    try {
      const parsedPostmanCollection = parsePostmanCollection(postmanCollection);
      const transformedCollection = transformItemsInCollection(parsedPostmanCollection);
      const hydratedCollection = hydrateSeqInCollection(transformedCollection);
      const validatedCollection = validateSchema(hydratedCollection);
      return ({ collection: validatedCollection });
    } catch(err) {
      console.log(err);
      throw new Error('Import collection failed');
    }
};

export default postmanToBruno;