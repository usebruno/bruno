const { get, each, find, compact } = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { sanitizeName } = require('./filesystem');
const { parseRequest, parseCollection, parseFolder, stringifyCollection, stringifyFolder, stringifyEnvironment, stringifyRequest } = require('@usebruno/filestore');
const constants = require('../constants');
const chalk = require('chalk');

const createCollectionJsonFromPathname = (collectionPath) => {
  const environmentsPath = path.join(collectionPath, `environments`);
    
  // get the collection bruno json config [<collection-path>/bruno.json]
  const brunoConfig = getCollectionBrunoJsonConfig(collectionPath);

  // get the collection root [<collection-path>/collection.bru]
  const collectionRoot = getCollectionRoot(collectionPath);

  // get the collection items recursively
  const traverse = (currentPath) => {
    const filesInCurrentDir = fs.readdirSync(currentPath);
    if (currentPath.includes('node_modules')) {
      return;
    }
    const currentDirItems = [];
    for (const file of filesInCurrentDir) {
      const filePath = path.join(currentPath, file);
      const stats = fs.lstatSync(filePath);
      if (stats.isDirectory()) {
        if (filePath === environmentsPath) continue;
        if (filePath.startsWith('.git') || filePath.startsWith('node_modules')) continue;
        
        // get the folder root
        let folderItem = { name: file, pathname: filePath, type: 'folder', items: traverse(filePath) }
        const folderBruJson = getFolderRoot(filePath);
        if (folderBruJson) {
          folderItem.root = folderBruJson;
          folderItem.seq = folderBruJson.meta.seq;
        }
        currentDirItems.push(folderItem);
      }
      else {
        if (['collection.bru', 'folder.bru'].includes(file)) continue;
        if (path.extname(filePath) !== '.bru') continue;

        // get the request item
        const bruContent = fs.readFileSync(filePath, 'utf8');
        const requestItem = parseRequest(bruContent);
        currentDirItems.push({
          name: file,
          pathname: filePath,
          ...requestItem
        });
      }
    }
    let currentDirFolderItems = currentDirItems?.filter((iter) => iter.type === 'folder');
    let sortedFolderItems = sortByNameThenSequence(currentDirFolderItems);

    let currentDirRequestItems = currentDirItems?.filter((iter) => iter.type !== 'folder');
    let sortedRequestItems = currentDirRequestItems?.sort((a, b) => a.seq - b.seq);

    return sortedFolderItems?.concat(sortedRequestItems);
  };
  let collectionItems = traverse(collectionPath);

  let collection = {
    brunoConfig,
    root: collectionRoot,
    pathname: collectionPath,
    items: collectionItems
  }

  return collection;
};

const getCollectionBrunoJsonConfig = (dir) => {
  // right now, bru must be run from the root of the collection
  // will add support in the future to run it from anywhere inside the collection
  const brunoJsonPath = path.join(dir, 'bruno.json');
  const brunoJsonExists = fs.existsSync(brunoJsonPath);
  if (!brunoJsonExists) {
    console.error(chalk.red(`You can run only at the root of a collection`));
    process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
  }

  const brunoConfigFile = fs.readFileSync(brunoJsonPath, 'utf8');
  const brunoConfig = JSON.parse(brunoConfigFile);
  return brunoConfig;
}

const getCollectionRoot = (dir) => {
  const collectionRootPath = path.join(dir, 'collection.bru');
  const exists = fs.existsSync(collectionRootPath);
  if (!exists) {
    return {};
  }

  const content = fs.readFileSync(collectionRootPath, 'utf8');
  return parseCollection(content);
};

const getFolderRoot = (dir) => {
  const folderRootPath = path.join(dir, 'folder.bru');
  const exists = fs.existsSync(folderRootPath);
  if (!exists) {
    return null;
  }

  const content = fs.readFileSync(folderRootPath, 'utf8');
  return parseFolder(content);
};

const mergeHeaders = (collection, request, requestTreePath) => {
  let headers = new Map();

  let collectionHeaders = get(collection, 'root.request.headers', []);
  collectionHeaders.forEach((header) => {
    if (header.enabled) {
      headers.set(header.name, header.value);
    }
  });

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let _headers = get(i, 'root.request.headers', []);
      _headers.forEach((header) => {
        if (header.enabled) {
          headers.set(header.name, header.value);
        }
      });
    } else {
      const _headers = i?.draft ? get(i, 'draft.request.headers', []) : get(i, 'request.headers', []);
      _headers.forEach((header) => {
        if (header.enabled) {
          headers.set(header.name, header.value);
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

const findItem = (items = [], pathname) => {
  return find(items, (i) => i.pathname === pathname);
};

const findItemInCollection = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return findItem(flattenedItems, pathname);
};

const findParentItemInCollection = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.pathname === pathname);
  });
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

const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item.pathname);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item.pathname);
  }
  return path;
};

const mergeAuth = (collection, request, requestTreePath) => {
  let collectionAuth = collection?.root?.request?.auth || { mode: 'none' };
  let effectiveAuth = collectionAuth;

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderAuth = i?.root?.request?.auth;
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveAuth = folderAuth;
      }
    }
  }

  if (request.auth && request.auth.mode === 'inherit') {
    request.auth = effectiveAuth;
  }
}

const getAllRequestsInFolder = (folderItems = [], recursive = true) => {
  let requests = [];

  if (folderItems && folderItems.length) {
    folderItems.forEach((item) => {
      if (item.type !== 'folder') {
        requests.push(item);
      } else {
        if (recursive) {
          requests = requests.concat(getAllRequestsInFolder(item.items, recursive));
        }
      }
    });
  }
  return requests;
};

const getAllRequestsAtFolderRoot = (folderItems = []) => {
  return getAllRequestsInFolder(folderItems, false);
}

const getCallStack = (resolvedPaths = [], collection, {recursive}) => {
  let requestItems = [];


  if (!resolvedPaths || !resolvedPaths.length) {
    return requestItems;
  }

  for (const resolvedPath of resolvedPaths) {
    if (!resolvedPath || !resolvedPath.length) {
      continue;
    }

    if (resolvedPath === collection.pathname) {
      requestItems = requestItems.concat(getAllRequestsInFolder(collection.items, recursive));
      continue;
    }

    const item = findItemInCollection(collection, resolvedPath);
    if (!item) {
      continue;
    }

    if (item.type === 'folder') {
      requestItems = requestItems.concat(getAllRequestsInFolder(item.items, recursive));
    } else {
      requestItems.push(item);
    }
  }

  return requestItems;
};

/**
 * Safe write file implementation to handle errors
 * @param {string} filePath - Path to write file
 * @param {string} content - Content to write
 */
const safeWriteFileSync = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
};

/**
 * Creates a Bruno collection directory structure from a Bruno collection object
 * 
 * @param {Object} collection - The Bruno collection object
 * @param {string} dirPath - The output directory path
 */
const createCollectionFromBrunoObject = async (collection, dirPath) => {
  // Create bruno.json
  const brunoConfig = {
    version: '1',
    name: collection.name,
    type: 'collection',
    ignore: ['node_modules', '.git']
  };
  
  fs.writeFileSync(
    path.join(dirPath, 'bruno.json'), 
    JSON.stringify(brunoConfig, null, 2)
  );

  // Create collection.bru if root exists
  if (collection.root) {
    const collectionContent = await stringifyCollection(collection.root);
    fs.writeFileSync(path.join(dirPath, 'collection.bru'), collectionContent);
  }

  // Process environments
  if (collection.environments && collection.environments.length) {
    const envDirPath = path.join(dirPath, 'environments');
    fs.mkdirSync(envDirPath, { recursive: true });

    for (const env of collection.environments) {
      const content = await stringifyEnvironment(env);
      const filename = sanitizeName(`${env.name}.bru`);
      fs.writeFileSync(path.join(envDirPath, filename), content);
    }
  }

  // Process collection items
  await processCollectionItems(collection.items, dirPath);

  return dirPath;
};

/**
 * Recursively processes collection items to create files and folders
 * 
 * @param {Array} items - Collection items
 * @param {string} currentPath - Current directory path
 */
const processCollectionItems = async (items = [], currentPath) => {
  for (const item of items) {
    if (item.type === 'folder') {
      // Create folder
      let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
      const folderPath = path.join(currentPath, sanitizedFolderName);
      fs.mkdirSync(folderPath, { recursive: true });

      // Create folder.bru file if root exists
      if (item?.root?.meta?.name) {
        const folderBruFilePath = path.join(folderPath, 'folder.bru');
        if (item.seq) {
          item.root.meta.seq = item.seq;
        }
        const folderContent = await stringifyFolder(item.root);
        safeWriteFileSync(folderBruFilePath, folderContent);
      }

      // Process folder items recursively
      if (item.items && item.items.length) {
        await processCollectionItems(item.items, folderPath);
      }
    } else if (['http-request', 'graphql-request'].includes(item.type)) {
      // Create request file
      let sanitizedFilename = sanitizeName(item?.filename || `${item.name}.bru`);
      if (!sanitizedFilename.endsWith('.bru')) {
        sanitizedFilename += '.bru';
      }

      // Convert JSON to BRU format based on the item type
      let type = item.type === 'http-request' ? 'http' : 'graphql';
      const bruJson = {
        type: type,
        name: item.name,
        seq: typeof item.seq === 'number' ? item.seq : 1,
        tags: item.tags || [],
        settings: {},
        request: {
          method: item.request?.method || 'GET',
          url: item.request?.url || '',
          headers: item.request?.headers || [],
          params: item.request?.params || [],
          auth: item.request?.auth || {},
          body: item.request?.body || {},
          script: item.request?.script || {},
          vars: item.request?.vars || { req: [], res: [] },
          assertions: item.request?.assertions || [],
          tests: item.request?.tests || '',
          docs: item.request?.docs || ''
        }
      };

      // Convert to BRU format and write to file
      const content = await stringifyRequest(bruJson);
      safeWriteFileSync(path.join(currentPath, sanitizedFilename), content);
    }
  }
};

const sortByNameThenSequence = items => {
  const isSeqValid = seq => Number.isFinite(seq) && Number.isInteger(seq) && seq > 0;

  // Sort folders alphabetically by name
  const alphabeticallySorted = [...items].sort((a, b) => a.name && b.name && a.name.localeCompare(b.name));

  // Extract folders without 'seq'
  const withoutSeq = alphabeticallySorted.filter(f => !isSeqValid(f['seq']));

  // Extract folders with 'seq' and sort them by 'seq'
  const withSeq = alphabeticallySorted.filter(f => isSeqValid(f['seq'])).sort((a, b) => a.seq - b.seq);

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
  createCollectionJsonFromPathname,
  mergeHeaders,
  mergeVars,
  mergeScripts,
  findItemInCollection,
  getTreePathFromCollectionToItem,
  createCollectionFromBrunoObject,
  mergeAuth,
  getAllRequestsInFolder,
  getAllRequestsAtFolderRoot,
  getCallStack
}