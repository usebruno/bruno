import {cloneDeep, isEqual, sortBy, filter, map, isString, findIndex, find, each, get } from 'lodash';
import { uuid } from 'utils/common';
import { buildPersistedEnvVariables } from 'utils/environments';
import { sortByNameThenSequence } from 'utils/common/index';
import path from 'utils/common/path';
import { isRequestTagsIncluded } from '@usebruno/common';

const replaceTabsWithSpaces = (str, numSpaces = 2) => {
  if (!str || !str.length || !isString(str)) {
    return '';
  }

  return str.replaceAll('\t', ' '.repeat(numSpaces));
};

export const addDepth = (items = []) => {
  const depth = (itms, initialDepth) => {
    each(itms, (i) => {
      i.depth = initialDepth;

      if (i.items && i.items.length) {
        depth(i.items, initialDepth + 1);
      }
    });
  };

  depth(items, 1);
};

export const collapseAllItemsInCollection = (collection) => {
  collection.collapsed = true;

  const collapseItem = (items) => {
    each(items, (i) => {
      i.collapsed = true;

      if (i.items && i.items.length) {
        collapseItem(i.items);
      }
    });
  };

  collapseItem(collection.items);
};

export const sortItems = (collection) => {
  const sort = (obj) => {
    if (obj.items && obj.items.length) {
      obj.items = sortBy(obj.items, 'type');
    }

    each(obj.items, (i) => sort(i));
  };

  sort(collection);
};

export const flattenItems = (items = []) => {
  const flattenedItems = [];

  const flatten = (itms, flattened) => {
    each(itms, (i) => {
      flattened.push(i);

      if (i.items && i.items.length) {
        flatten(i.items, flattened);
      }
    });
  };

  flatten(items, flattenedItems);

  return flattenedItems;
};

export const findItem = (items = [], itemUid) => {
  return find(items, (i) => i.uid === itemUid);
};

export const findCollectionByUid = (collections, collectionUid) => {
  return find(collections, (c) => c.uid === collectionUid);
};

export const findCollectionByPathname = (collections, pathname) => {
  return find(collections, (c) => c.pathname === pathname);
};

export const findCollectionByItemUid = (collections, itemUid) => {
  return find(collections, (c) => {
    return findItemInCollection(c, itemUid);
  });
};

export const findItemByPathname = (items = [], pathname) => {
  return find(items, (i) => i.pathname === pathname);
};

export const findItemInCollectionByPathname = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return findItemByPathname(flattenedItems, pathname);
};

export const findParentItemInCollectionByPathname = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.pathname === pathname);
  });
};

export const findItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return findItem(flattenedItems, itemUid);
};

export const findParentItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.uid === itemUid);
  });
};

export const recursivelyGetAllItemUids = (items = []) => {
  let flattenedItems = flattenItems(items);

  return map(flattenedItems, (i) => i.uid);
};

export const findEnvironmentInCollection = (collection, envUid) => {
  return find(collection.environments, (e) => e.uid === envUid);
};

export const findEnvironmentInCollectionByName = (collection, name) => {
  return find(collection.environments, (e) => e.name === name);
};

export const areItemsLoading = (folder) => {
  if (!folder || folder.isLoading) {
    return true;
  }
  
  let flattenedItems = flattenItems(folder.items);
  return flattenedItems?.reduce((isLoading, i) => {
    if (i?.loading) {
      isLoading = true;
    }
    return isLoading;
  }, false);
}

export const getItemsLoadStats = (folder) => {
  let loadingCount = 0;
  let flattenedItems = flattenItems(folder.items);
  flattenedItems?.forEach(i => {
    if(i?.loading) {
      loadingCount += 1;
    }
  });
  return {
    loading: loadingCount,
    total: flattenedItems?.length
  };
}

export const transformCollectionToSaveToExportAsFile = (collection, options = {}) => {
  const copyHeaders = (headers) => {
    return map(headers, (header) => {
      return {
        uid: header.uid,
        name: header.name,
        value: header.value,
        description: header.description,
        enabled: header.enabled
      };
    });
  };

  const copyParams = (params) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        name: param.name,
        value: param.value,
        description: param.description,
        type: param.type,
        enabled: param.enabled
      };
    });
  };

  const copyFormUrlEncodedParams = (params = []) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: param.enabled
      };
    });
  };

  const copyMultipartFormParams = (params = []) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        type: param.type,
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: param.enabled
      };
    });
  };

  const copyFileParams = (params = []) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        filePath: param.filePath,
        contentType: param.contentType,
        selected: param.selected
      }
    });
  }

  const copyItems = (sourceItems, destItems) => {
    each(sourceItems, (si) => {
      if (!isItemAFolder(si) && !isItemARequest(si) && si.type !== 'js') {
        return;
      }

      const isGrpcRequest = si.type === 'grpc-request'

      const di = {
        uid: si.uid,
        type: si.type,
        name: si.name,
        filename: si.filename,
        seq: si.seq,
        settings: si.settings,
        tags: si.tags
      };

      if (si.request) {
        di.request = {
          url: si.request.url,
          method: si.request.method,
          headers: copyHeaders(si.request.headers),
          params: copyParams(si.request.params),
          body: {
            mode: si.request.body.mode,
            json: si.request.body.json,
            text: si.request.body.text,
            xml: si.request.body.xml,
            graphql: si.request.body.graphql,
            sparql: si.request.body.sparql,
            formUrlEncoded: copyFormUrlEncodedParams(si.request.body.formUrlEncoded),
            multipartForm: copyMultipartFormParams(si.request.body.multipartForm),
            file: copyFileParams(si.request.body.file),
            grpc: si.request.body.grpc,
            ws: si.request.body.ws
          },
          script: si.request.script,
          vars: si.request.vars,
          assertions: si.request.assertions,
          tests: si.request.tests,
          docs: si.request.docs
        };

        if (isGrpcRequest) {
          di.request.methodType = si.request.methodType;
          di.request.protoPath = si.request.protoPath;
          delete di.request.params;
        }
        

        // Handle auth object dynamically
        di.request.auth = {
          mode: get(si.request, 'auth.mode', 'none')
        };

        switch (di.request.auth.mode) {
          case 'awsv4':
            di.request.auth.awsv4 = {
              accessKeyId: get(si.request, 'auth.awsv4.accessKeyId', ''),
              secretAccessKey: get(si.request, 'auth.awsv4.secretAccessKey', ''),
              sessionToken: get(si.request, 'auth.awsv4.sessionToken', ''),
              service: get(si.request, 'auth.awsv4.service', ''),
              region: get(si.request, 'auth.awsv4.region', ''),
              profileName: get(si.request, 'auth.awsv4.profileName', '')
            };
            break;
          case 'basic':
            di.request.auth.basic = {
              username: get(si.request, 'auth.basic.username', ''),
              password: get(si.request, 'auth.basic.password', '')
            };
            break;
          case 'bearer':
            di.request.auth.bearer = {
              token: get(si.request, 'auth.bearer.token', '')
            };
            break;
          case 'digest':
            di.request.auth.digest = {
              username: get(si.request, 'auth.digest.username', ''),
              password: get(si.request, 'auth.digest.password', '')
            };
            break;
          case 'ntlm':
            di.request.auth.ntlm = {
              username: get(si.request, 'auth.ntlm.username', ''),
              password: get(si.request, 'auth.ntlm.password', ''),
              domain: get(si.request, 'auth.ntlm.domain', '')
            };
            break;            
          case 'oauth2':
            let grantType = get(si.request, 'auth.oauth2.grantType', '');
            switch (grantType) {
              case 'password':
                di.request.auth.oauth2 = {
                  grantType: grantType,
                  accessTokenUrl: get(si.request, 'auth.oauth2.accessTokenUrl', ''),
                  refreshTokenUrl: get(si.request, 'auth.oauth2.refreshTokenUrl', ''),
                  username: get(si.request, 'auth.oauth2.username', ''),
                  password: get(si.request, 'auth.oauth2.password', ''),
                  clientId: get(si.request, 'auth.oauth2.clientId', ''),
                  clientSecret: get(si.request, 'auth.oauth2.clientSecret', ''),
                  scope: get(si.request, 'auth.oauth2.scope', ''),
                  credentialsPlacement: get(si.request, 'auth.oauth2.credentialsPlacement', 'body'),
                  credentialsId: get(si.request, 'auth.oauth2.credentialsId', 'credentials'),
                  tokenPlacement: get(si.request, 'auth.oauth2.tokenPlacement', 'header'),
                  tokenHeaderPrefix: get(si.request, 'auth.oauth2.tokenHeaderPrefix', ''),
                  tokenQueryKey: get(si.request, 'auth.oauth2.tokenQueryKey', ''),
                  autoFetchToken: get(si.request, 'auth.oauth2.autoFetchToken', true),
                  autoRefreshToken: get(si.request, 'auth.oauth2.autoRefreshToken', true),
                  additionalParameters: get(si.request, 'auth.oauth2.additionalParameters', {}),
                };
                break;
              case 'authorization_code':
                di.request.auth.oauth2 = {
                  grantType: grantType,
                  callbackUrl: get(si.request, 'auth.oauth2.callbackUrl', ''),
                  authorizationUrl: get(si.request, 'auth.oauth2.authorizationUrl', ''),
                  accessTokenUrl: get(si.request, 'auth.oauth2.accessTokenUrl', ''),
                  refreshTokenUrl: get(si.request, 'auth.oauth2.refreshTokenUrl', ''),
                  clientId: get(si.request, 'auth.oauth2.clientId', ''),
                  clientSecret: get(si.request, 'auth.oauth2.clientSecret', ''),
                  scope: get(si.request, 'auth.oauth2.scope', ''),
                  credentialsPlacement: get(si.request, 'auth.oauth2.credentialsPlacement', 'body'),
                  pkce: get(si.request, 'auth.oauth2.pkce', false),
                  credentialsId: get(si.request, 'auth.oauth2.credentialsId', 'credentials'),
                  tokenPlacement: get(si.request, 'auth.oauth2.tokenPlacement', 'header'),
                  tokenHeaderPrefix: get(si.request, 'auth.oauth2.tokenHeaderPrefix', ''),
                  tokenQueryKey: get(si.request, 'auth.oauth2.tokenQueryKey', ''),
                  autoFetchToken: get(si.request, 'auth.oauth2.autoFetchToken', true),
                  autoRefreshToken: get(si.request, 'auth.oauth2.autoRefreshToken', true),
                  additionalParameters: get(si.request, 'auth.oauth2.additionalParameters', {}),
                };
                break;
              case 'implicit':
                di.request.auth.oauth2 = {
                  grantType: grantType,
                  callbackUrl: get(si.request, 'auth.oauth2.callbackUrl', ''),
                  authorizationUrl: get(si.request, 'auth.oauth2.authorizationUrl', ''),
                  clientId: get(si.request, 'auth.oauth2.clientId', ''),
                  scope: get(si.request, 'auth.oauth2.scope', ''),
                  state: get(si.request, 'auth.oauth2.state', ''),
                  credentialsId: get(si.request, 'auth.oauth2.credentialsId', 'credentials'),
                  tokenPlacement: get(si.request, 'auth.oauth2.tokenPlacement', 'header'),
                  tokenHeaderPrefix: get(si.request, 'auth.oauth2.tokenHeaderPrefix', 'Bearer'),
                  tokenQueryKey: get(si.request, 'auth.oauth2.tokenQueryKey', ''),
                  autoFetchToken: get(si.request, 'auth.oauth2.autoFetchToken', true),
                  additionalParameters: get(si.request, 'auth.oauth2.additionalParameters', {}),
                };
                break;
              case 'client_credentials':
                di.request.auth.oauth2 = {
                  grantType: grantType,
                  accessTokenUrl: get(si.request, 'auth.oauth2.accessTokenUrl', ''),
                  refreshTokenUrl: get(si.request, 'auth.oauth2.refreshTokenUrl', ''),
                  clientId: get(si.request, 'auth.oauth2.clientId', ''),
                  clientSecret: get(si.request, 'auth.oauth2.clientSecret', ''),
                  scope: get(si.request, 'auth.oauth2.scope', ''),
                  credentialsPlacement: get(si.request, 'auth.oauth2.credentialsPlacement', 'body'),
                  credentialsId: get(si.request, 'auth.oauth2.credentialsId', 'credentials'),
                  tokenPlacement: get(si.request, 'auth.oauth2.tokenPlacement', 'header'),
                  tokenHeaderPrefix: get(si.request, 'auth.oauth2.tokenHeaderPrefix', ''),
                  tokenQueryKey: get(si.request, 'auth.oauth2.tokenQueryKey', ''),
                  autoFetchToken: get(si.request, 'auth.oauth2.autoFetchToken', true),
                  autoRefreshToken: get(si.request, 'auth.oauth2.autoRefreshToken', true),
                  additionalParameters: get(si.request, 'auth.oauth2.additionalParameters', {}),
                };
                break;
            }
            break;
          case 'apikey':
            di.request.auth.apikey = {
              key: get(si.request, 'auth.apikey.key', ''),
              value: get(si.request, 'auth.apikey.value', ''),
              placement: get(si.request, 'auth.apikey.placement', 'header')
            };
            break;
          case 'wsse':
            di.request.auth.wsse = {
              username: get(si.request, 'auth.wsse.username', ''),
              password: get(si.request, 'auth.wsse.password', '')
            };
            break;
          default:
            break;
        }

        if (di.request.body.mode === 'json') {
          di.request.body.json = replaceTabsWithSpaces(di.request.body.json);
        }

        if (di.request.body.mode === 'grpc') {
          di.request.body.grpc = di.request.body.grpc.map(({name, content}, index) => ({
            name: name ? name : `message ${index + 1}`,
            content: replaceTabsWithSpaces(content)
          }))
        }

        if (di.request.body.mode === 'ws') {
          di.request.body.ws = di.request.body.ws.map(({ name, content, type }, index) => ({
            name: name ? name : `message ${index + 1}`,
            type: type ?? 'json',
            content: replaceTabsWithSpaces(content)
          }));
        }
      }

      if (si.type == 'folder' && si?.root) {
        di.root = {
          request: {}
        };

        let { request, meta, docs } = si?.root || {};
        let { auth, headers, script = {}, vars = {}, tests } = request || {};

        // folder level auth
        if (auth?.mode) {
          di.root.request.auth = auth;
        }

        // folder level headers
        if (headers?.length) {
          di.root.request.headers = headers;
        }
        // folder level script
        if (Object.keys(script)?.length) {
          di.root.request.script = {};
          if (script?.req?.length) {
            di.root.request.script.req = script?.req;
          }
          if (script?.res?.length) {
            di.root.request.script.res = script?.res;
          }
        }
        // folder level vars
        if (Object.keys(vars)?.length) {
          di.root.request.vars = {};
          if (vars?.req?.length) {
            di.root.request.vars.req = vars?.req;
          }
          if (vars?.res?.length) {
            di.root.request.vars.res = vars?.res;
          }
        }
        // folder level tests
        if (tests?.length) {
          di.root.request.tests = tests;
        }

        // folder level docs
        if (docs?.length) {
          di.root.docs = docs;
        }

        if (meta?.name) {
          di.root.meta = {};
          di.root.meta.name = meta?.name;
          di.root.meta.seq = meta?.seq;
        }
        if (!Object.keys(di.root.request)?.length) {
          delete di.root.request;
        }
        if (!Object.keys(di.root)?.length) {
          delete di.root;
        }
      }

      if (si.type === 'js') {
        di.fileContent = si.raw;
      }

      destItems.push(di);

      if (si.items && si.items.length) {
        di.items = [];
        copyItems(si.items, di.items);
      }
    });
  };

  const collectionToSave = {};
  collectionToSave.name = collection.name;
  collectionToSave.uid = collection.uid;

  // todo: move this to the place where collection gets created
  collectionToSave.version = '1';
  collectionToSave.items = [];
  collectionToSave.activeEnvironmentUid = collection.activeEnvironmentUid;
  // Save environments without runtime metadata (ephemeral/persistedValue)
  collectionToSave.environments = (collection.environments || []).map((env) => ({
    ...env,
    variables: buildPersistedEnvVariables(env?.variables, { mode: 'save' })
  }));

  collectionToSave.root = {
    request: {}
  };

  let { request, docs, meta } = collection?.root || {};
  let { auth, headers, script = {}, vars = {}, tests } = request || {};

  // collection level auth
  if (auth?.mode) {
    collectionToSave.root.request.auth = auth;
  }
  // collection level headers
  if (headers?.length) {
    collectionToSave.root.request.headers = headers;
  }
  // collection level script
  if (Object.keys(script)?.length) {
    collectionToSave.root.request.script = {};
    if (script?.req?.length) {
      collectionToSave.root.request.script.req = script?.req;
    }
    if (script?.res?.length) {
      collectionToSave.root.request.script.res = script?.res;
    }
  }
  // collection level vars
  if (Object.keys(vars)?.length) {
    collectionToSave.root.request.vars = {};
    if (vars?.req?.length) {
      collectionToSave.root.request.vars.req = vars?.req;
    }
    if (vars?.res?.length) {
      collectionToSave.root.request.vars.res = vars?.res;
    }
  }
  // collection level tests
  if (tests?.length) {
    collectionToSave.root.request.tests = tests;
  }
  // collection level docs
  if (docs?.length) {
    collectionToSave.root.docs = docs;
  }
  if (meta?.name) {
    collectionToSave.root.meta = {};
    collectionToSave.root.meta.name = meta?.name;
  }
  if (!Object.keys(collectionToSave.root.request)?.length) {
    delete collectionToSave.root.request;
  }
  if (!Object.keys(collectionToSave.root)?.length) {
    delete collectionToSave.root;
  }

  collectionToSave.brunoConfig = cloneDeep(collection?.brunoConfig);

  // delete proxy password if present
  if (collectionToSave?.brunoConfig?.proxy?.auth?.password) {
    delete collectionToSave.brunoConfig.proxy.auth.password;
  }

  copyItems(collection.items, collectionToSave.items);
  return collectionToSave;
};

export const transformRequestToSaveToFilesystem = (item) => {
  const _item = item.draft ? item.draft : item;

  const itemToSave = {
    uid: _item.uid,
    type: _item.type,
    name: _item.name,
    seq: _item.seq,
    settings: _item.settings,
    tags: _item.tags,
    request: {
      method: _item.request.method,
      url: _item.request.url,
      params: [],
      headers: [],
      auth: _item.request.auth,
      body: _item.request.body,
      script: _item.request.script,
      vars: _item.request.vars,
      assertions: _item.request.assertions,
      tests: _item.request.tests,
      docs: _item.request.docs
    }
  };

  if (_item.type === 'grpc-request') {
    itemToSave.request.methodType = _item.request.methodType;
    itemToSave.request.protoPath = _item.request.protoPath;
    delete itemToSave.request.params
  }

  if (_item.type === 'ws-request') {
    delete itemToSave.request.method;
    delete itemToSave.request.methodType;
    delete itemToSave.request.params;
  }

  // Only process params for non-gRPC requests
  if (!['grpc-request', 'ws-request'].includes(_item.type)) {
    each(_item.request.params, (param) => {
      itemToSave.request.params.push({
        uid: param.uid,
        name: param.name,
        value: param.value,
        description: param.description,
        type: param.type,
        enabled: param.enabled
      });
    });
  }

  each(_item.request.headers, (header) => {
    itemToSave.request.headers.push({
      uid: header.uid,
      name: header.name,
      value: header.value,
      description: header.description,
      enabled: header.enabled
    });
  });

  if (itemToSave.request.body.mode === 'json') {
    itemToSave.request.body = {
      ...itemToSave.request.body,
      json: replaceTabsWithSpaces(itemToSave.request.body.json)
    };
  }

  if (itemToSave.request.body.mode === 'grpc') {
    itemToSave.request.body = {
      ...itemToSave.request.body,
      grpc: itemToSave.request.body.grpc.map(({name, content}, index) => ({
        name: name ? name : `message ${index + 1}`,
        content: replaceTabsWithSpaces(content)
      }))
    };
  }

  if (itemToSave.request.body.mode === 'ws') {
    itemToSave.request.body = {
      ...itemToSave.request.body,
      ws: itemToSave.request.body.ws.map(({ name, content, type }, index) => ({
        name: name ? name : `message ${index + 1}`,
        type,
        content: replaceTabsWithSpaces(content)
      }))
    };
  }

  return itemToSave;
};

// todo: optimize this
export const deleteItemInCollection = (itemUid, collection) => {
  collection.items = filter(collection.items, (i) => i.uid !== itemUid);

  let flattenedItems = flattenItems(collection.items);
  each(flattenedItems, (i) => {
    if (i.items && i.items.length) {
      i.items = filter(i.items, (i) => i.uid !== itemUid);
    }
  });
};

export const deleteItemInCollectionByPathname = (pathname, collection) => {
  collection.items = filter(collection.items, (i) => i.pathname !== pathname);

  let flattenedItems = flattenItems(collection.items);
  each(flattenedItems, (i) => {
    if (i.items && i.items.length) {
      i.items = filter(i.items, (i) => i.pathname !== pathname);
    }
  });
};

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && ['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type) && !item.items;
};

export const isItemAFolder = (item) => {
  return !item.hasOwnProperty('request') && item.type === 'folder';
};

export const humanizeRequestBodyMode = (mode) => {
  let label = 'No Body';
  switch (mode) {
    case 'json': {
      label = 'JSON';
      break;
    }
    case 'text': {
      label = 'TEXT';
      break;
    }
    case 'xml': {
      label = 'XML';
      break;
    }
    case 'sparql': {
      label = 'SPARQL';
      break;
    }
    case 'file': {
      label = 'File / Binary';
      break;
    }
    case 'formUrlEncoded': {
      label = 'Form URL Encoded';
      break;
    }
    case 'multipartForm': {
      label = 'Multipart Form';
      break;
    }
  }

  return label;
};

export const humanizeRequestAuthMode = (mode) => {
  let label = 'No Auth';
  switch (mode) {
    case 'inherit': {
      label = 'Inherit';
      break;
    }
    case 'awsv4': {
      label = 'AWS Sig V4';
      break;
    }
    case 'basic': {
      label = 'Basic Auth';
      break;
    }
    case 'bearer': {
      label = 'Bearer Token';
      break;
    }
    case 'digest': {
      label = 'Digest Auth';
      break;
    }
    case 'ntlm': {
      label = 'NTLM';
      break;
    }     
    case 'oauth2': {
      label = 'OAuth 2.0';
      break;
    }
    case 'wsse': {
      label = 'WSSE Auth';
      break;
    }
    case 'apikey': {
      label = 'API Key';
      break;
    }
  }

  return label;
};

export const humanizeRequestAPIKeyPlacement = (placement) => {
  let label = 'Header';
  switch (placement) {
    case 'header': {
      label = 'Header';
      break;
    }
    case 'queryparams': {
      label = 'Query Params';
      break;
    }
  }

  return label;
};

export const humanizeGrantType = (mode) => {
  if (!mode || typeof mode !== 'string') {
    return '';
  }

  switch (mode) {
    case 'password':
      return 'Password Credentials';
    case 'authorization_code':
      return 'Authorization Code';
    case 'client_credentials':
      return 'Client Credentials';
    case 'implicit':
      return 'Implicit';
    default:
      return mode;
  }
};

export const refreshUidsInItem = (item) => {
  item.uid = uuid();

  each(get(item, 'request.headers'), (header) => (header.uid = uuid()));
  each(get(item, 'request.params'), (param) => (param.uid = uuid()));
  each(get(item, 'request.body.multipartForm'), (param) => (param.uid = uuid()));
  each(get(item, 'request.body.formUrlEncoded'), (param) => (param.uid = uuid()));
  each(get(item, 'request.body.file'), (param) => (param.uid = uuid()));

  return item;
};

export const deleteUidsInItem = (item) => {
  delete item.uid;
  const params = get(item, 'request.params', []);
  const headers = get(item, 'request.headers', []);
  const bodyFormUrlEncoded = get(item, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = get(item, 'request.body.multipartForm', []);
  const file = get(item, 'request.body.file', []);

  params.forEach((param) => delete param.uid);
  headers.forEach((header) => delete header.uid);
  bodyFormUrlEncoded.forEach((param) => delete param.uid);
  bodyMultipartForm.forEach((param) => delete param.uid);
  file.forEach((param) => delete param.uid);

  return item;
};

export const areItemsTheSameExceptSeqUpdate = (_item1, _item2) => {
  let item1 = cloneDeep(_item1);
  let item2 = cloneDeep(_item2);

  // remove seq from both items
  delete item1.seq;
  delete item2.seq;

  // remove draft from both items
  delete item1.draft;
  delete item2.draft;

  // get projection of both items
  item1 = transformRequestToSaveToFilesystem(item1);
  item2 = transformRequestToSaveToFilesystem(item2);

  // delete uids from both items
  deleteUidsInItem(item1);
  deleteUidsInItem(item2);

  return isEqual(item1, item2);
};

export const getDefaultRequestPaneTab = (item) => {
  if (item.type === 'http-request') {
    return 'params';
  }

  if (item.type === 'graphql-request') {
    return 'query';
  }

  if (['ws-request', 'grpc-request'].includes(item.type)) {
    return 'body';
  }
};

export const getGlobalEnvironmentVariables = ({ globalEnvironments, activeGlobalEnvironmentUid }) => {
  let variables = {};
  const environment = globalEnvironments?.find(env => env?.uid === activeGlobalEnvironmentUid);
  if (environment) {
    each(environment.variables, (variable) => {
      if (variable.name && variable.enabled) {
        variables[variable.name] = variable.value;
      }
    });
  }
  return variables;
};

export const getGlobalEnvironmentVariablesMasked = ({ globalEnvironments, activeGlobalEnvironmentUid }) => {
  const environment = globalEnvironments?.find(env => env?.uid === activeGlobalEnvironmentUid);

  if (environment && Array.isArray(environment.variables)) {
    return environment.variables
      .filter((variable) => variable.name && variable.value && variable.enabled && variable.secret)
      .map((variable) => variable.name);
  }

  return [];
};


export const getEnvironmentVariables = (collection) => {
  let variables = {};
  if (collection) {
    const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
    if (environment) {
      each(environment.variables, (variable) => {
        if (variable.name && variable.value && variable.enabled) {
          variables[variable.name] = variable.value;
        }
      });
    }
  }

  return variables;
};

export const getEnvironmentVariablesMasked = (collection) => {
  // Return an empty array if the collection is invalid or not provided
  if (!collection || !collection.activeEnvironmentUid) {
    return [];
  }

  // Find the active environment in the collection
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  if (!environment || !environment.variables) {
    return [];
  }

  // Filter the environment variables to get only the masked (secret) ones
  return environment.variables
    .filter((variable) => variable.name && variable.value && variable.enabled && variable.secret)
    .map((variable) => variable.name);
};

const getPathParams = (item) => {
  let pathParams = {};
  if (item && item.request && item.request.params) {
    item.request.params.forEach((param) => {
      if (param.type === 'path' && param.name && param.value) {
        pathParams[param.name] = param.value;
      }
    });
  }
  return pathParams;
};

export const getTotalRequestCountInCollection = (collection) => {
  let count = 0;
  each(collection.items, (item) => {
    if (isItemARequest(item)) {
      count++;
    } else if (isItemAFolder(item)) {
      count += getTotalRequestCountInCollection(item);
    }
  });

  return count;
};

export const getAllVariables = (collection, item) => {
  if(!collection) return {};
  const envVariables = getEnvironmentVariables(collection);
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  let { collectionVariables, folderVariables, requestVariables } = mergeVars(collection, requestTreePath);
  const pathParams = getPathParams(item);
  const { globalEnvironmentVariables = {} } = collection;

  const { processEnvVariables = {}, runtimeVariables = {} } = collection;
  const mergedVariables = {
    ...folderVariables,
    ...requestVariables,
    ...runtimeVariables
  };

  const mergedVariablesGlobal = {
    ...collectionVariables,
    ...envVariables,
    ...folderVariables,
    ...requestVariables,
    ...runtimeVariables,
  }

  const maskedEnvVariables = getEnvironmentVariablesMasked(collection) || [];
  const maskedGlobalEnvVariables = collection?.globalEnvSecrets || [];

  const filteredMaskedEnvVariables = maskedEnvVariables.filter((key) => !(key in mergedVariables));
  const filteredMaskedGlobalEnvVariables = maskedGlobalEnvVariables.filter((key) => !(key in mergedVariablesGlobal));

  const uniqueMaskedVariables = [...new Set([...filteredMaskedEnvVariables, ...filteredMaskedGlobalEnvVariables])];

  const oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials })

  return {
    ...globalEnvironmentVariables,
    ...collectionVariables,
    ...envVariables,
    ...folderVariables,
    ...requestVariables,
    ...oauth2CredentialVariables,
    ...runtimeVariables,
    pathParams: {
      ...pathParams
    },
    maskedEnvVariables: uniqueMaskedVariables,
    process: {
      env: {
        ...processEnvVariables
      }
    }
  };
};

export const maskInputValue = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .split('')
    .map(() => '*')
    .join('');
};

export const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item?.uid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item?.uid);
  }
  return path;
};

const mergeVars = (collection, requestTreePath = []) => {
  let collectionVariables = {};
  let folderVariables = {};
  let requestVariables = {};
  let collectionRequestVars = get(collection, 'root.request.vars.req', []);
  collectionRequestVars.forEach((_var) => {
    if (_var.enabled) {
      collectionVariables[_var.name] = _var.value;
    }
  });
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let vars = get(i, 'root.request.vars.req', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          folderVariables[_var.name] = _var.value;
        }
      });
    } else {
      let vars = get(i, 'request.vars.req', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          requestVariables[_var.name] = _var.value;
        }
      });
    }
  }
  return {
    collectionVariables,
    folderVariables,
    requestVariables
  };
};

export const getEnvVars = (environment = {}) => {
  const variables = environment.variables;
  if (!variables || !variables.length) {
    return {
      __name__: environment.name
    };
  }

  const envVars = {};
  each(variables, (variable) => {
    if (variable.enabled) {
      envVars[variable.name] = variable.value;
    }
  });

  return {
    ...envVars,
    __name__: environment.name
  };
};

export const getFormattedCollectionOauth2Credentials = ({ oauth2Credentials = [] }) => {
  let credentialsVariables = {};
  oauth2Credentials.forEach(({ credentialsId, credentials }) => {
    if (credentials) {
      Object.entries(credentials).forEach(([key, value]) => {
        credentialsVariables[`$oauth2.${credentialsId}.${key}`] = value;
      });
    }
  });
  return credentialsVariables;
};


// item sequence utils - START

export const resetSequencesInFolder = (folderItems) => {
  const items = folderItems;
  const sortedItems = sortByNameThenSequence(items);
  return sortedItems.map((item, index) => {
    item.seq = index + 1;
    return item;
  });
};

export const isItemBetweenSequences = (itemSequence, sourceItemSequence, targetItemSequence) => {
  if (targetItemSequence > sourceItemSequence) {
    return itemSequence > sourceItemSequence && itemSequence < targetItemSequence;
  }
  return itemSequence < sourceItemSequence && itemSequence >= targetItemSequence;
};

export const calculateNewSequence = (isDraggedItem, targetSequence, draggedSequence) => {
  if (!isDraggedItem) {
    return null;
  }
  return targetSequence > draggedSequence ? targetSequence - 1 : targetSequence;
};

export const getReorderedItemsInTargetDirectory = ({ items, targetItemUid, draggedItemUid }) => {
  const itemsWithFixedSequences = resetSequencesInFolder(cloneDeep(items));
  const targetItem = findItem(itemsWithFixedSequences, targetItemUid);
  const draggedItem = findItem(itemsWithFixedSequences, draggedItemUid);
  const targetSequence = targetItem?.seq;
  const draggedSequence = draggedItem?.seq;
  itemsWithFixedSequences?.forEach(item => {
    const isDraggedItem = item?.uid === draggedItemUid;
    const isBetween = isItemBetweenSequences(item?.seq, draggedSequence, targetSequence);
    if (isBetween) {
      item.seq += targetSequence > draggedSequence ? -1 : 1;
    }
    const newSequence = calculateNewSequence(isDraggedItem, targetSequence, draggedSequence);
    if (newSequence !== null) {
      item.seq = newSequence;
    }
  });
  // only return items that have been reordered
  return itemsWithFixedSequences.filter(item => 
    items?.find(originalItem => originalItem?.uid === item?.uid)?.seq !== item?.seq
  );
};

export const getReorderedItemsInSourceDirectory = ({ items }) => {
  const itemsWithFixedSequences = resetSequencesInFolder(cloneDeep(items));
  return itemsWithFixedSequences.filter(item => 
    items?.find(originalItem => originalItem?.uid === item?.uid)?.seq !== item?.seq
  );
};

export const calculateDraggedItemNewPathname = ({ draggedItem, targetItem, dropType, collectionPathname }) => {
  const { pathname: targetItemPathname } = targetItem;
  const { filename: draggedItemFilename } = draggedItem;
  const targetItemDirname = path.dirname(targetItemPathname);
  const isTargetTheCollection = targetItemPathname === collectionPathname;
  const isTargetItemAFolder = isItemAFolder(targetItem);

  if (dropType === 'inside' && (isTargetItemAFolder || isTargetTheCollection)) {
    return path.join(targetItemPathname, draggedItemFilename)
  } else if (dropType === 'adjacent') {
    return path.join(targetItemDirname, draggedItemFilename)
  }
  return null;
};

// item sequence utils - END

export const getUniqueTagsFromItems = (items = []) => {
  const allTags = new Set();
  const getTags = (items) => {
    items.forEach(item => {
      if (isItemARequest(item)) {
        const tags = item.draft ? get(item, 'draft.tags', []) : get(item, 'tags', []);
        tags.forEach(tag => allTags.add(tag));
      }
      if (item.items) {
        getTags(item.items);
      }
    });
  };
  getTags(items);
  return Array.from(allTags).sort();
};


export const getRequestItemsForCollectionRun = ({ recursive, items = [], tags }) => {
  let requestItems = [];
  
  if (recursive) {
    requestItems = flattenItems(items);
  } else {
    each(items, (item) => {
      if (item.request) {
        requestItems.push(item);
      }
    });
  }

  const requestTypes = ['http-request', 'graphql-request'];
  requestItems = requestItems.filter(request => requestTypes.includes(request.type));

  if (tags && tags.include && tags.exclude) {
    const includeTags = tags.include ? tags.include : [];
    const excludeTags = tags.exclude ? tags.exclude : [];
    requestItems = requestItems.filter(({ tags: requestTags = [], draft }) => {
      requestTags = draft?.tags || requestTags || [];
      return isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    });
  }

  return requestItems;
};

export const getPropertyFromDraftOrRequest = (item, propertyKey, defaultValue = null) => {
  return item.draft ? get(item, `draft.${propertyKey}`, defaultValue) : get(item, propertyKey, defaultValue);
};