const fs = require('fs');
const { getRequestUid } = require('../cache/requestUids');
const { uuid } = require('./common');

const { get, each, find, compact } = require('lodash');
const os = require('os');

const mergeHeaders = (collection, request, requestTreePath) => {
  let headers = new Map();

  let collectionHeaders = get(collection, 'root.request.headers', []);
  collectionHeaders.forEach((header) => {
    if (header.enabled) {
      headers.set(header.name?.toLowerCase?.(), header.value);
      if (header?.name?.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let _headers = get(i, 'root.request.headers', []);
      _headers.forEach((header) => {
        if (header.enabled) {
          headers.set(header.name?.toLowerCase?.(), header.value);
        }
      });
    } else {
      const _headers = i?.draft ? get(i, 'draft.request.headers', []) : get(i, 'request.headers', []);
      _headers.forEach((header) => {
        if (header.enabled) {
          headers.set(header.name?.toLowerCase?.(), header.value);
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

module.exports = {
  mergeHeaders,
  mergeVars,
  mergeScripts,
  getTreePathFromCollectionToItem,
  flattenItems,
  findItem,
  findItemInCollection,
  findItemByPathname,
  findItemInCollectionByPathname,
  findParentItemInCollection,
  parseBruFileMeta,
  hydrateRequestWithUuid
};