const { get, each, find, compact, isString, filter } = require('lodash');
const fs = require('fs');
const { getRequestUid } = require('../cache/requestUids');
const { uuid } = require('./common');
const os = require('os');

const mergeHeaders = (collection, request, requestTreePath) => {
  let headers = new Map();

  let collectionHeaders = get(collection, 'root.request.headers', []);
  collectionHeaders.forEach((header) => {
    if (header.enabled) {
      if (header?.name?.toLowerCase?.() === 'content-type') {
        headers.set('content-type', header.value);
      } else {
        headers.set(header.name, header.value);
      }
    }
  });

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let _headers = get(i, 'root.request.headers', []);
      _headers.forEach((header) => {
        if (header.enabled) {
          if (header.name.toLowerCase() === 'content-type') {
            headers.set('content-type', header.value);
          } else {
            headers.set(header.name, header.value);
          }
        }
      });
    } else {
      const _headers = i?.draft ? get(i, 'draft.request.headers', []) : get(i, 'request.headers', []);
      _headers.forEach((header) => {
        if (header.enabled) {
          if (header.name.toLowerCase() === 'content-type') {
            headers.set('content-type', header.value);
          } else {
            headers.set(header.name, header.value);
          }
        }
      });
    }
  }

  request.headers = Array.from(headers, ([name, value]) => ({ name, value, enabled: true }));
};

const mergeVars = (collection, request, requestTreePath) => {
  let reqVars = new Map();
  let collectionRequestVars = get(collection, 'root.request.vars.req', []);
  let collectionVariables = {};
  collectionRequestVars.forEach((_var) => {
    if (_var.enabled) {
      reqVars.set(_var.name, _var.value);
      collectionVariables[_var.name] = _var.value;
    }
  });
  let folderVariables = {};
  let requestVariables = {};
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let vars = get(i, 'root.request.vars.req', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          reqVars.set(_var.name, _var.value);
          folderVariables[_var.name] = _var.value;
        }
      });
    } else {
      const vars = i?.draft ? get(i, 'draft.request.vars.req', []) : get(i, 'request.vars.req', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          reqVars.set(_var.name, _var.value);
          requestVariables[_var.name] = _var.value;
        }
      });
    }
  }

  request.collectionVariables = collectionVariables;
  request.folderVariables = folderVariables;
  request.requestVariables = requestVariables;

  if(request?.vars) {
    request.vars.req = Array.from(reqVars, ([name, value]) => ({
      name,
      value,
      enabled: true,
      type: 'request'
    }));
  }

  let resVars = new Map();
  let collectionResponseVars = get(collection, 'root.request.vars.res', []);
  collectionResponseVars.forEach((_var) => {
    if (_var.enabled) {
      resVars.set(_var.name, _var.value);
    }
  });
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let vars = get(i, 'root.request.vars.res', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          resVars.set(_var.name, _var.value);
        }
      });
    } else {
      const vars = i?.draft ? get(i, 'draft.request.vars.res', []) : get(i, 'request.vars.res', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          resVars.set(_var.name, _var.value);
        }
      });
    }
  }

  if(request?.vars) {
    request.vars.res = Array.from(resVars, ([name, value]) => ({
      name,
      value,
      enabled: true,
      type: 'response'
    }));
  }
};

const mergeScripts = (collection, request, requestTreePath, scriptFlow) => {
  let collectionPreReqScript = get(collection, 'root.request.script.req', '');
  let collectionPostResScript = get(collection, 'root.request.script.res', '');
  let collectionTests = get(collection, 'root.request.tests', '');

  let combinedPreReqScript = [];
  let combinedPostResScript = [];
  let combinedTests = [];
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let preReqScript = get(i, 'root.request.script.req', '');
      if (preReqScript && preReqScript.trim() !== '') {
        combinedPreReqScript.push(preReqScript);
      }

      let postResScript = get(i, 'root.request.script.res', '');
      if (postResScript && postResScript.trim() !== '') {
        combinedPostResScript.push(postResScript);
      }

      let tests = get(i, 'root.request.tests', '');
      if (tests && tests?.trim?.() !== '') {
        combinedTests.push(tests);
      }
    }
  }

  request.script.req = compact([collectionPreReqScript, ...combinedPreReqScript, request?.script?.req || '']).join(os.EOL);

  if (scriptFlow === 'sequential') {
    request.script.res = compact([collectionPostResScript, ...combinedPostResScript, request?.script?.res || '']).join(os.EOL);
  } else {
    request.script.res = compact([request?.script?.res || '', ...combinedPostResScript.reverse(), collectionPostResScript]).join(os.EOL);
  }

  if (scriptFlow === 'sequential') {
    request.tests = compact([collectionTests, ...combinedTests, request?.tests || '']).join(os.EOL);
  } else {
    request.tests = compact([request?.tests || '', ...combinedTests.reverse(), collectionTests]).join(os.EOL);
  }
};

const flattenItems = (items = []) => {
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

const findItem = (items = [], itemUid) => {
  return find(items, (i) => i.uid === itemUid);
};

const findItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return findItem(flattenedItems, itemUid);
};

const findParentItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.uid === itemUid);
  });
};

const findParentItemInCollectionByPathname = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.pathname === pathname);
  });
};

const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item.uid);
  if (!item) return [_item];
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item.uid);
  }
  return path;
};

const parseBruFileMeta = (data) => {
  try {
    const metaRegex = /meta\s*{\s*([\s\S]*?)\s*}/;
    const match = data?.match?.(metaRegex);
    if (match) {
      const metaContent = match[1].trim();
      const lines = metaContent.replace(/\r\n/g, '\n').split('\n');
      const metaJson = {};
      lines.forEach(line => {
        const [key, value] = line.split(':').map(str => str.trim());
        if (key && value) {
          metaJson[key] = isNaN(value) ? value : Number(value);
        }
      });
      return { meta: metaJson };
    } else {
      console.log('No "meta" block found in the file.');
    }
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

const hydrateRequestWithUuid = (request, pathname) => {
  request.uid = getRequestUid(pathname);

  const params = get(request, 'request.params', []);
  const headers = get(request, 'request.headers', []);
  const requestVars = get(request, 'request.vars.req', []);
  const responseVars = get(request, 'request.vars.res', []);
  const assertions = get(request, 'request.assertions', []);
  const bodyFormUrlEncoded = get(request, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = get(request, 'request.body.multipartForm', []);
  const file = get(request, 'request.body.file', []);

  params.forEach((param) => (param.uid = uuid()));
  headers.forEach((header) => (header.uid = uuid()));
  requestVars.forEach((variable) => (variable.uid = uuid()));
  responseVars.forEach((variable) => (variable.uid = uuid()));
  assertions.forEach((assertion) => (assertion.uid = uuid()));
  bodyFormUrlEncoded.forEach((param) => (param.uid = uuid()));
  bodyMultipartForm.forEach((param) => (param.uid = uuid()));
  file.forEach((param) => (param.uid = uuid()));

  return request;
};

const findItemByPathname = (items = [], pathname) => {
  return find(items, (i) => i.pathname === pathname);
};

const findItemInCollectionByPathname = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return findItemByPathname(flattenedItems, pathname);
};

const replaceTabsWithSpaces = (str, numSpaces = 2) => {
  if (!str || !str.length || !isString(str)) {
    return '';
  }

  return str.replaceAll('\t', ' '.repeat(numSpaces));
};

const transformRequestToSaveToFilesystem = (item) => {
  const _item = item.draft ? item.draft : item;
  const itemToSave = {
    uid: _item.uid,
    type: _item.type,
    name: _item.name,
    seq: _item.seq,
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

  return itemToSave;
}

const sortCollection = (collection) => {
  const items = collection.items || [];
  let folderItems = filter(items, (item) => item.type === 'folder');
  let requestItems = filter(items, (item) => item.type !== 'folder');

  folderItems = folderItems.sort((a, b) => a.seq - b.seq);
  requestItems = requestItems.sort((a, b) => a.seq - b.seq);

  collection.items = folderItems.concat(requestItems);

  each(folderItems, (item) => {
    sortCollection(item);
  });
};

const sortFolder = (folder = {}) => {
  const items = folder.items || [];
  let folderItems = filter(items, (item) => item.type === 'folder');
  let requestItems = filter(items, (item) => item.type !== 'folder');

  folderItems = folderItems.sort((a, b) => a.seq - b.seq);
  requestItems = requestItems.sort((a, b) => a.seq - b.seq);

  folder.items = folderItems.concat(requestItems);

  each(folderItems, (item) => {
    sortFolder(item);
  });

  return folder;
};

const getAllRequestsInFolderRecursively = (folder = {}) => {
  let requests = [];

  if (folder.items && folder.items.length) {
    folder.items.forEach((item) => {
      if (item.type !== 'folder') {
        requests.push(item);
      } else {
        requests = requests.concat(getAllRequestsInFolderRecursively(item));
      }
    });
  }

  return requests;
};

const getEnvVars = (environment = {}) => {
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

const getFormattedCollectionOauth2Credentials = ({ oauth2Credentials = [] }) => {
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

const mergeAuth = (collection, request, requestTreePath) => {
  // Start with collection level auth (always consider collection auth as base)
  let collectionAuth = get(collection, 'root.request.auth', { mode: 'none' });
  let effectiveAuth = collectionAuth;
  let lastFolderWithAuth = null;

  // Traverse through the path to find the closest auth configuration
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderAuth = get(i, 'root.request.auth');
      // Only consider folders that have a valid auth mode
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveAuth = folderAuth;
        lastFolderWithAuth = i;
      }
    }
  }

  // If request is set to inherit, use the effective auth from collection/folders
  if (request.auth.mode === 'inherit') {
    request.auth = effectiveAuth;
    
    // For OAuth2, we need to handle credentials properly
    if (effectiveAuth.mode === 'oauth2') {
      if (lastFolderWithAuth) {
        // If auth is from folder, add folderUid and clear itemUid
        request.oauth2Credentials = {
          ...request.oauth2Credentials,
          folderUid: lastFolderWithAuth.uid,
          itemUid: null,
          mode: request.auth.mode
        };
      } else {
        // If auth is from collection, ensure no folderUid and no itemUid
        request.oauth2Credentials = {
          ...request.oauth2Credentials,
          folderUid: null,
          itemUid: null,
          mode: request.auth.mode
        };
      }
    }
  }
};

const getConfiguredRequestItem = ({ requestConfig }) => {
  const { url, method = 'GET', body, variables } = requestConfig || {};

  if (!url?.length) throw new Error('URL is required!');

  const requestItem = {
    name: 'send_request',
    request: {
      method,
      url,
      headers: [],
      auth: {
        mode: 'none'
      },
      body: {
        mode: "text"
      },
      script: {
        req: "",
        res: ""
      },
      vars: {
        req: [],
        res: []
      },
      assertions: [],
      tests: ""
    }
  }

  // headers
  const headers = get(requestConfig, 'header', {});
  if (Object.entries(headers)?.length) {
    requestItem.request.headers = Object.entries(headers)?.map(([name, value]) => ({ name, value, enabled: true }));
  }

  // variables - add them as request-level variables
  if (variables) {
    requestItem.request.vars.req = Object.entries(variables)?.map(([name, value]) => ({ name, value, enabled: true }));
  }

  // body
  const { mode: bodyMode } = body || {};

  if (bodyMode == "formdata") {
    requestItem.request.body.mode = 'multipartForm';
    requestItem.request.body.multipartForm = body?.formdata?.map(_ => ({ name: _?.key, value: _?.value, type: 'text', enabled: true }));
  } else if (bodyMode == "urlencoded") {
    requestItem.request.body.mode = 'formUrlEncoded';
    requestItem.request.body.formUrlEncoded = body?.urlencoded?.map(_ => ({ name: _?.key, value: _?.value, enabled: true }));
  } else if (bodyMode == "graphql") {
    requestItem.request.body.mode = 'graphql';
    requestItem.request.body.graphql.query = body?.graphql;
    requestItem.request.body.graphql.variables = {};
  } else {
    // default
    requestItem.request.body.mode = 'text';
    requestItem.request.body.text = body?.raw;
  }

  return requestItem;
};

module.exports = {
  mergeHeaders,
  mergeVars,
  mergeScripts,
  mergeAuth,
  getTreePathFromCollectionToItem,
  flattenItems,
  findItem,
  findItemInCollection,
  findItemByPathname,
  findItemInCollectionByPathname,
  findParentItemInCollection,
  findParentItemInCollectionByPathname,
  parseBruFileMeta,
  hydrateRequestWithUuid,
  transformRequestToSaveToFilesystem,
  sortCollection,
  sortFolder,
  getAllRequestsInFolderRecursively,
  getEnvVars,
  getFormattedCollectionOauth2Credentials,
  getConfiguredRequestItem
};