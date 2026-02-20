const { get, each, find, compact } = require('lodash');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { sanitizeName } = require('./filesystem');
const { parseRequest, parseCollection, parseFolder, stringifyCollection, stringifyFolder, stringifyEnvironment, stringifyRequest } = require('@usebruno/filestore');
const constants = require('../constants');
const chalk = require('chalk');

const FORMAT_CONFIG = {
  yml: { ext: '.yml', collectionFile: 'opencollection.yml', folderFile: 'folder.yml' },
  bru: { ext: '.bru', collectionFile: 'collection.bru', folderFile: 'folder.bru' }
};

const getCollectionFormat = (collectionPath) => {
  if (fs.existsSync(path.join(collectionPath, 'opencollection.yml'))) return 'yml';
  if (fs.existsSync(path.join(collectionPath, 'bruno.json'))) return 'bru';
  return null;
};

const getCollectionConfig = (collectionPath, format) => {
  if (format === 'yml') {
    const content = fs.readFileSync(path.join(collectionPath, 'opencollection.yml'), 'utf8');
    const parsed = parseCollection(content, { format: 'yml' });
    return { brunoConfig: parsed.brunoConfig, collectionRoot: parsed.collectionRoot || {} };
  }
  const brunoConfig = JSON.parse(fs.readFileSync(path.join(collectionPath, 'bruno.json'), 'utf8'));
  const collectionBruPath = path.join(collectionPath, 'collection.bru');
  const collectionRoot = fs.existsSync(collectionBruPath)
    ? parseCollection(fs.readFileSync(collectionBruPath, 'utf8'), { format: 'bru' })
    : {};
  return { brunoConfig, collectionRoot };
};

const getFolderRoot = (dir, format) => {
  const folderPath = path.join(dir, FORMAT_CONFIG[format].folderFile);
  if (!fs.existsSync(folderPath)) return null;
  return parseFolder(fs.readFileSync(folderPath, 'utf8'), { format });
};

const createCollectionJsonFromPathname = (collectionPath) => {
  const format = getCollectionFormat(collectionPath);
  if (!format) {
    console.error(chalk.red(`You can run only at the root of a collection`));
    process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
  }

  const { brunoConfig, collectionRoot } = getCollectionConfig(collectionPath, format);
  const { ext, collectionFile, folderFile } = FORMAT_CONFIG[format];
  const environmentsPath = path.join(collectionPath, 'environments');

  const traverse = (currentPath) => {
    if (currentPath.includes('node_modules')) return [];
    const currentDirItems = [];

    for (const file of fs.readdirSync(currentPath)) {
      const filePath = path.join(currentPath, file);
      const stats = fs.lstatSync(filePath);

      if (stats.isDirectory()) {
        if (filePath === environmentsPath || file === '.git' || file === 'node_modules') continue;
        const folderItem = { name: file, pathname: filePath, type: 'folder', items: traverse(filePath) };
        const folderRoot = getFolderRoot(filePath, format);
        if (folderRoot) {
          folderItem.root = folderRoot;
          folderItem.seq = folderRoot.meta?.seq;
        }
        currentDirItems.push(folderItem);
      } else {
        if (file === collectionFile || file === folderFile || path.extname(filePath) !== ext) continue;
        try {
          const requestItem = parseRequest(fs.readFileSync(filePath, 'utf8'), { format });
          currentDirItems.push({ name: file, ...requestItem, pathname: filePath });
        } catch (err) {
          console.warn(chalk.yellow(`Warning: Skipping invalid file ${filePath}\nError: ${err.message}`));
          global.brunoSkippedFiles = global.brunoSkippedFiles || [];
          global.brunoSkippedFiles.push({ path: filePath, error: err.message });
        }
      }
    }

    const folders = sortByNameThenSequence(currentDirItems.filter((i) => i.type === 'folder'));
    const requests = currentDirItems.filter((i) => i.type !== 'folder').sort((a, b) => a.seq - b.seq);
    return folders.concat(requests);
  };

  return {
    brunoConfig,
    format,
    root: collectionRoot,
    pathname: collectionPath,
    items: traverse(collectionPath)
  };
};

const mergeHeaders = (collection, request, requestTreePath) => {
  let headers = new Map();

  const collectionRoot = collection?.draft?.root || collection?.root || {};
  let collectionHeaders = get(collectionRoot, 'request.headers', []);
  collectionHeaders.forEach((header) => {
    if (header.enabled) {
      headers.set(header.name, header.value);
    }
  });

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderRoot = i?.draft || i?.root;
      let _headers = get(folderRoot, 'request.headers', []);
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
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  let collectionAuth = collectionRoot?.request?.auth || { mode: 'none' };
  let effectiveAuth = collectionAuth;

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      const folderRoot = i?.draft || i?.root;
      const folderAuth = get(folderRoot, 'request.auth');
      if (folderAuth && folderAuth.mode && folderAuth.mode !== 'none' && folderAuth.mode !== 'inherit') {
        effectiveAuth = folderAuth;
      }
    }
  }

  if (request.auth && request.auth.mode === 'inherit') {
    request.auth = effectiveAuth;
  }
};

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
};

const getCallStack = (resolvedPaths = [], collection, { recursive }) => {
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
const createCollectionFromBrunoObject = async (collection, dirPath, options = {}) => {
  const { format = 'bru' } = options;
  // Create brunoConfig for yml format
  const brunoConfig = {
    version: '1',
    name: collection.name,
    type: 'collection',
    ignore: ['node_modules', '.git']
  };

  const collectionContent = await stringifyCollection(collection.root || {}, brunoConfig, {
    format: format === 'opencollection' ? 'yml' : 'bru'
  });
  const collectionRootFilePath = format == 'bru' ? path.join(dirPath, 'collection.bru') : path.join(dirPath, 'opencollection.yml');

  if (format === 'bru') {
    fs.writeFileSync(
      path.join(dirPath, 'bruno.json'),
      JSON.stringify(brunoConfig, null, 2)
    );
  }

  if (collection.root) {
    fs.writeFileSync(collectionRootFilePath, collectionContent);
  }

  // Process environments
  if (collection.environments && collection.environments.length) {
    const envDirPath = path.join(dirPath, 'environments');
    fs.mkdirSync(envDirPath, { recursive: true });

    for (const env of collection.environments) {
      const content = stringifyEnvironment(env, { format });
      const filename = format === 'bru' ? sanitizeName(`${env.name}.bru`) : sanitizeName(`${env.name}.yml`);
      fs.writeFileSync(path.join(envDirPath, filename), content);
    }
  }

  // Process collection items
  await processCollectionItems(collection.items, dirPath, { format });

  return dirPath;
};

/**
 * Recursively processes collection items to create files and folders
 *
 * @param {Array} items - Collection items
 * @param {string} currentPath - Current directory path
 * @param {object} [options] - Current directory path
 * @param {"bru"|"yml"} options.format - Current directory path
 */
const processCollectionItems = async (items = [], currentPath, options = {}) => {
  const { format } = options;
  for (const item of items) {
    if (item.type === 'folder') {
      // Create folder
      let sanitizedFolderName = sanitizeName(item?.filename || item?.name);
      const folderPath = path.join(currentPath, sanitizedFolderName);
      fs.mkdirSync(folderPath, { recursive: true });

      // Create folder.yml file if root exists
      if (item?.root?.meta?.name) {
        const folderFileName = format === 'bru' ? 'folder.bru' : 'folder.yml';
        const folderFilePath = path.join(folderPath, folderFileName);
        if (item.seq) {
          item.root.meta.seq = item.seq;
        }
        const folderContent = stringifyFolder(item.root, { format });
        safeWriteFileSync(folderFilePath, folderContent);
      }

      // Process folder items recursively
      if (item.items && item.items.length) {
        await processCollectionItems(item.items, folderPath);
      }
    } else if (['http-request', 'graphql-request'].includes(item.type)) {
      // Create request file
      let sanitizedFilename;
      if (format == 'yml') {
        sanitizedFilename = sanitizeName(item?.filename || `${item.name}.yml`);
        if (!sanitizedFilename.endsWith('.yml')) {
          sanitizedFilename += '.yml';
        }
      } else {
        sanitizedFilename = sanitizeName(item?.filename || `${item.name}.bru`);
        if (!sanitizedFilename.endsWith('.bru')) {
          sanitizedFilename += '.bru';
        }
      }

      // Convert to YML format
      const itemJson = {
        type: item.type,
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

      // Convert to YML format and write to file
      const content = stringifyRequest(itemJson, { format });
      safeWriteFileSync(path.join(currentPath, sanitizedFilename), content);
    }
  }
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
  FORMAT_CONFIG,
  getCollectionFormat,
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
};
