const { get, each, find, compact, isString, filter } = require('lodash');
const fs = require('fs');
const { getRequestUid, getExampleUid } = require('../cache/requestUids');
const { uuid } = require('./common');
const os = require('os');
const { preferencesUtil } = require('../store/preferences');
const path = require('path');

const mergeHeaders = (collection, request, requestTreePath) => {
  let headers = new Map();

  let collectionHeaders = collection?.draft?.root ? get(collection, 'draft.root.request.headers', []) : get(collection, 'root.request.headers', []);
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
      const folderRoot = i?.draft || i?.root;
      let _headers = get(folderRoot, 'request.headers', []);
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

const mergeVars = (collection, request, requestTreePath = []) => {
  let reqVars = new Map();
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  let collectionRequestVars = get(collectionRoot, 'request.vars.req', []);
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
      const folderRoot = i?.draft || i?.root;
      let vars = get(folderRoot, 'request.vars.req', []);
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

  if (request?.vars) {
    request.vars.req = Array.from(reqVars, ([name, value]) => ({
      name,
      value,
      enabled: true,
      type: 'request'
    }));
  }

  let resVars = new Map();
  let collectionResponseVars = get(collectionRoot, 'request.vars.res', []);
  collectionResponseVars.forEach((_var) => {
    if (_var.enabled) {
      resVars.set(_var.name, _var.value);
    }
  });
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderRoot = i?.draft || i?.root;
      let vars = get(folderRoot, 'request.vars.res', []);
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

  if (request?.vars) {
    request.vars.res = Array.from(resVars, ([name, value]) => ({
      name,
      value,
      enabled: true,
      type: 'response'
    }));
  }
};

/**
 * Wraps a script in an IIFE closure to isolate its scope
 * @param {string} script - The script code to wrap
 * @returns {string} The wrapped script
 */
const wrapScriptInClosure = (script) => {
  if (!script || script.trim() === '') {
    return '';
  }

  // Wrap script in async IIFE to create isolated scope
  // This prevents variable re-declaration errors and allows early returns
  // to only affect the current script segment
  return `await (async () => {
${script}
})();`;
};

const mergeScripts = (collection, request, requestTreePath, scriptFlow) => {
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  let collectionPreReqScript = get(collectionRoot, 'request.script.req', '');
  let collectionPostResScript = get(collectionRoot, 'request.script.res', '');
  let collectionTests = get(collectionRoot, 'request.tests', '');

  let combinedPreReqScript = [];
  let combinedPostResScript = [];
  let combinedTests = [];
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderRoot = i?.draft || i?.root;
      let preReqScript = get(folderRoot, 'request.script.req', '');
      if (preReqScript && preReqScript.trim() !== '') {
        combinedPreReqScript.push(preReqScript);
      }

      let postResScript = get(folderRoot, 'request.script.res', '');
      if (postResScript && postResScript.trim() !== '') {
        combinedPostResScript.push(postResScript);
      }

      let tests = get(folderRoot, 'request.tests', '');
      if (tests && tests?.trim?.() !== '') {
        combinedTests.push(tests);
      }
    }
  }

  // Wrap each script segment in its own closure and join them
  // This allows each script to run separately with its own scope,
  // preventing variable re-declaration errors and allowing early returns
  // to only affect that specific script segment
  const preReqScripts = [
    collectionPreReqScript,
    ...combinedPreReqScript,
    request?.script?.req || ''
  ];
  request.script.req = compact(preReqScripts.map(wrapScriptInClosure)).join(os.EOL + os.EOL);

  // Handle post-response scripts based on scriptFlow
  if (scriptFlow === 'sequential') {
    const postResScripts = [
      collectionPostResScript,
      ...combinedPostResScript,
      request?.script?.res || ''
    ];
    request.script.res = compact(postResScripts.map(wrapScriptInClosure)).join(os.EOL + os.EOL);
  } else {
    // Reverse order for non-sequential flow
    const postResScripts = [
      request?.script?.res || '',
      ...[...combinedPostResScript].reverse(),
      collectionPostResScript
    ];
    request.script.res = compact(postResScripts.map(wrapScriptInClosure)).join(os.EOL + os.EOL);
  }

  // Handle tests based on scriptFlow
  if (scriptFlow === 'sequential') {
    const testScripts = [
      collectionTests,
      ...combinedTests,
      request?.tests || ''
    ];
    request.tests = compact(testScripts.map(wrapScriptInClosure)).join(os.EOL + os.EOL);
  } else {
    // Reverse order for non-sequential flow
    const testScripts = [
      request?.tests || '',
      ...[...combinedTests].reverse(),
      collectionTests
    ];
    request.tests = compact(testScripts.map(wrapScriptInClosure)).join(os.EOL + os.EOL);
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
      lines.forEach((line) => {
        const [key, value] = line.split(':').map((str) => str.trim());
        if (key && value) {
          metaJson[key] = isNaN(value) ? value : Number(value);
        }
      });

      // Transform to the format expected by bruno-app
      let requestType = metaJson.type;
      if (requestType === 'http') {
        requestType = 'http-request';
      } else if (requestType === 'graphql') {
        requestType = 'graphql-request';
      } else {
        requestType = 'http-request';
      }

      const sequence = metaJson.seq;
      const transformedJson = {
        type: requestType,
        name: metaJson.name,
        seq: !isNaN(sequence) ? Number(sequence) : 1,
        settings: {},
        tags: metaJson.tags || [],
        request: {
          method: '',
          url: '',
          params: [],
          headers: [],
          auth: { mode: 'none' },
          body: { mode: 'none' },
          script: {},
          vars: {},
          assertions: [],
          tests: '',
          docs: ''
        }
      };

      return transformedJson;
    } else {
      console.log('No "meta" block found in the file.');
      return null;
    }
  } catch (err) {
    console.error('Error reading file:', err);
    return null;
  }
};

// Parse YML file meta information
const parseYmlFileMeta = (data) => {
  try {
    const yaml = require('js-yaml');
    const parsed = yaml.load(data);

    if (!parsed || !parsed.meta) {
      console.log('No "meta" section found in YAML file.');
      return null;
    }

    const metaJson = parsed.meta;

    // Transform to the format expected by bruno-app
    let requestType = metaJson.type;
    const typeMap = {
      http: 'http-request',
      graphql: 'graphql-request',
      grpc: 'grpc-request',
      ws: 'ws-request'
    };
    requestType = typeMap[requestType] || 'http-request';

    const sequence = metaJson.seq;
    const transformedJson = {
      type: requestType,
      name: metaJson.name,
      seq: !isNaN(sequence) ? Number(sequence) : 1,
      settings: {},
      tags: metaJson.tags || [],
      request: {
        method: '',
        url: '',
        params: [],
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: {},
        vars: {},
        assertions: [],
        tests: '',
        docs: ''
      }
    };

    return transformedJson;
  } catch (err) {
    console.error('Error parsing YAML file meta:', err);
    return null;
  }
};

// Format-aware meta parsing function
const parseFileMeta = (data, format = 'bru') => {
  if (format === 'yml') {
    return parseYmlFileMeta(data);
  } else {
    return parseBruFileMeta(data);
  }
};

const hydrateRequestWithUuid = (request, pathname) => {
  request.uid = getRequestUid(pathname);
  const prefix = path.join(os.tmpdir(), 'bruno-');
  request.isTransient = pathname.startsWith(prefix);

  const params = get(request, 'request.params', []);
  const headers = get(request, 'request.headers', []);
  const requestVars = get(request, 'request.vars.req', []);
  const responseVars = get(request, 'request.vars.res', []);
  const assertions = get(request, 'request.assertions', []);
  const bodyFormUrlEncoded = get(request, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = get(request, 'request.body.multipartForm', []);
  const file = get(request, 'request.body.file', []);
  const examples = get(request, 'examples', []);

  params.forEach((param) => (param.uid = uuid()));
  headers.forEach((header) => (header.uid = uuid()));
  requestVars.forEach((variable) => (variable.uid = uuid()));
  responseVars.forEach((variable) => (variable.uid = uuid()));
  assertions.forEach((assertion) => (assertion.uid = uuid()));
  bodyFormUrlEncoded.forEach((param) => (param.uid = uuid()));
  bodyMultipartForm.forEach((param) => (param.uid = uuid()));
  file.forEach((param) => (param.uid = uuid()));
  examples.forEach((example, eIndex) => {
    example.uid = getExampleUid(pathname, eIndex);
    example.itemUid = request.uid;
    const params = get(example, 'request.params', []);
    const headers = get(example, 'request.headers', []);
    const responseHeaders = get(example, 'response.headers', []);
    const bodyMultipartForm = get(example, 'request.body.multipartForm', []);
    const bodyFormUrlEncoded = get(example, 'request.body.formUrlEncoded', []);
    const file = get(example, 'request.body.file', []);
    params.forEach((param) => (param.uid = uuid()));
    headers.forEach((header) => (header.uid = uuid()));
    responseHeaders.forEach((header) => (header.uid = uuid()));
    bodyMultipartForm.forEach((param) => (param.uid = uuid()));
    bodyFormUrlEncoded.forEach((param) => (param.uid = uuid()));
    file.forEach((param) => (param.uid = uuid()));
  });

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
    settings: _item.settings,
    tags: _item.tags,
    examples: _item.examples || [],
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
    delete itemToSave.request.params;
  }

  // Only process params for non-gRPC requests
  if (_item.type !== 'grpc-request') {
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
      grpc: itemToSave.request.body.grpc.map(({ name, content }, index) => ({
        name: name ? name : `message ${index + 1}`,
        content: replaceTabsWithSpaces(content)
      }))
    };
  }

  return itemToSave;
};

const sortCollection = (collection) => {
  const items = collection.items || [];
  let folderItems = filter(items, (item) => item.type === 'folder');
  let requestItems = filter(items, (item) => item.type !== 'folder');

  folderItems = sortByNameThenSequence(folderItems);
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

  folderItems = sortByNameThenSequence(folderItems);
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
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  let collectionAuth = get(collectionRoot, 'request.auth', { mode: 'none' });
  let effectiveAuth = collectionAuth;
  let lastFolderWithAuth = null;

  // Traverse through the path to find the closest auth configuration
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderRoot = i?.draft || i?.root;
      const folderAuth = get(folderRoot, 'request.auth');
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

const resolveInheritedSettings = (settings) => {
  const resolvedSettings = {};

  // Resolve each setting individually
  Object.keys(settings).forEach((settingKey) => {
    const currentValue = settings[settingKey];

    // If setting is inherited, fallback to preferences only for timeout setting
    if (currentValue === 'inherit' || currentValue === undefined || currentValue === null) {
      if (settingKey === 'timeout') {
        resolvedSettings[settingKey] = preferencesUtil.getRequestTimeout();
      }
    } else {
      // Use the current value as-is
      resolvedSettings[settingKey] = currentValue;
    }
  });

  // Handle missing timeout setting - if timeout is not in settings, treat it as inherited
  if (!settings.hasOwnProperty('timeout')) {
    resolvedSettings.timeout = preferencesUtil.getRequestTimeout();
  }

  return resolvedSettings;
};

const sortByNameThenSequence = (items) => {
  const isSeqValid = (seq) => Number.isFinite(seq) && Number.isInteger(seq) && seq > 0;

  // Sort folders alphabetically by name
  const alphabeticallySorted = [...items].sort((a, b) => a.name && b.name && a.name.localeCompare(b.name));

  // Extract folders without 'seq'
  const withoutSeq = alphabeticallySorted.filter((f) => !isSeqValid(f['seq']));

  // Extract folders with 'seq' and sort them by 'seq'
  const withSeq = alphabeticallySorted.filter((f) => isSeqValid(f['seq'])).sort((a, b) => a.seq - b.seq);

  const sortedItems = withoutSeq;

  // Insert folders with 'seq' at their specified positions
  withSeq.forEach((item) => {
    const position = item.seq - 1;
    const existingItem = withoutSeq[position];

    // Check if there's already an item with the same sequence number
    const hasItemWithSameSeq = Array.isArray(existingItem)
      ? existingItem?.[0]?.seq === item.seq
      : existingItem?.seq === item.seq;

    if (hasItemWithSameSeq) {
      // If there's a conflict, group items with same sequence together
      const newGroup = Array.isArray(existingItem)
        ? [...existingItem, item]
        : [existingItem, item];

      withoutSeq.splice(position, 1, newGroup);
    } else {
      // Insert item at the specified position
      withoutSeq.splice(position, 0, item);
    }
  });

  // return flattened sortedItems
  return sortedItems.flat();
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
  parseFileMeta,
  hydrateRequestWithUuid,
  transformRequestToSaveToFilesystem,
  sortCollection,
  sortFolder,
  getAllRequestsInFolderRecursively,
  getEnvVars,
  getFormattedCollectionOauth2Credentials,
  sortByNameThenSequence,
  resolveInheritedSettings
};
