const fs = require('node:fs');
const path = require('node:path');
const { cloneDeep, pick } = require('lodash');
const { buildScriptedEntry } = require('@usebruno/requests').scripting;
const { resolveEnvironmentInheritance } = require('@usebruno/common').utils;
const { parseDotEnv } = require('@usebruno/filestore');
const { getCollectionFormat, hasRequestExtension, isPathInsideCollection } = require('../../utils/filesystem');
const { findItemInCollectionByPathname, getEnvVars } = require('../../utils/collection');
const { readCollectionConfig, readCollectionForRunRequest, readRequestItems } = require('../../utils/collection-reader');
const { getWorkspaceCollections } = require('../../utils/workspace-config');
const { getProcessEnvVars } = require('../../store/process-env');
const CollectionSecurityStore = require('../../store/collection-security');

// The CLI runs requests from other collections the same way, in
// bruno-cli/src/runner/run-request-by-pathname.js; keep the two in sync.

const collectionSecurityStore = new CollectionSecurityStore();

// WS/gRPC items live on separate IPC channels and can't be driven via the HTTP runRequest.
const UNSUPPORTED_PROTOCOL_LABELS = {
  'ws-request': 'WebSocket',
  'grpc-request': 'gRPC'
};

// What a script gets back from a request of another collection. The rest of the result (the
// request as sent, its timeline and full URL) carries that collection's credentials and secrets.
const RESPONSE_FIELDS_FROM_ANOTHER_COLLECTION = ['status', 'statusText', 'headers', 'data', 'duration', 'size', 'error'];

const REQUEST_EXTENSION_PATTERN = /\.(bru|yml)$/i;

const resolveItemPathname = (collectionPath, relativeItemPathname) => {
  const format = getCollectionFormat(collectionPath);
  const itemPathname = path.join(collectionPath, relativeItemPathname);
  return hasRequestExtension(itemPathname, format) ? itemPathname : `${itemPathname}.${format}`;
};

const recordSkippedEntry = (callerBru, item) => {
  const startedAt = Date.now();
  callerBru?._recordScriptedRequest?.({
    source: 'runRequest',
    request: {
      method: (item.request?.method || 'GET').toString().toUpperCase(),
      url: item.request?.url,
      headers: {},
      data: null
    },
    response: {
      statusCode: null,
      statusText: 'Skipped',
      headers: {},
      data: null,
      dataBuffer: '',
      size: 0,
      duration: 0
    },
    error: null,
    startedAt,
    completedAt: startedAt
  });
};

const recordRunRequestEntry = ({ callerBru, item, res, err, startedAt }) => {
  const sent = res?.requestSent || {};
  // Cancel and network-error results don't include requestSent; fall back to the saved request.
  const fallbackRequest = item.request || {};
  callerBru?._recordScriptedRequest?.({
    source: 'runRequest',
    ...buildScriptedEntry({
      request: {
        method: sent.method || fallbackRequest.method,
        url: sent.url || res?.url || fallbackRequest.url,
        headers: sent.headers,
        data: sent.data
      },
      response: res
        ? {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            data: res.data,
            dataBuffer: res.dataBuffer,
            size: res.size,
            duration: res.duration,
            timeline: res.timeline
          }
        : null,
      error: err || (res?.error ? { message: res.error } : null),
      startedAt,
      completedAt: Date.now()
    })
  });
};

const runFoundItem = async ({ item, callerBru, runItem, target }) => {
  const protocolLabel = UNSUPPORTED_PROTOCOL_LABELS[item.type];
  if (protocolLabel) {
    // Record a Skipped row so the user sees feedback.
    recordSkippedEntry(callerBru, item);
    return {
      status: 'skipped',
      statusText: `bru.runRequest does not support ${protocolLabel} requests`,
      headers: {},
      data: null,
      duration: 0,
      size: 0
    };
  }

  const startedAt = Date.now();
  let res;
  try {
    res = await runItem({ item, callerBru, target });
  } catch (err) {
    recordRunRequestEntry({ callerBru, item, err, startedAt });
    throw err;
  }
  recordRunRequestEntry({ callerBru, item, res, startedAt });
  return res;
};

// Matches the collection's own name (bruno.json / opencollection.yml), which the app shows and
// bru.getCollectionName() returns. The name in workspace.yml isn't updated when a collection is
// renamed.
const findWorkspaceCollectionPath = async (workspacePath, collectionName) => {
  const workspaceCollections = getWorkspaceCollections(workspacePath).filter((collection) => !collection.notFoundLocally);
  const matchingPaths = [];
  for (const { path: collectionPath } of workspaceCollections) {
    const { brunoConfig } = await readCollectionConfig(collectionPath);
    if (brunoConfig?.name === collectionName) {
      // The path as the workspace lists it: the app keys an open collection's uid and its
      // sandbox setting by this exact string.
      matchingPaths.push(collectionPath);
    }
  }

  if (matchingPaths.length === 0) {
    throw new Error(`no collection named "${collectionName}" in the workspace`);
  }
  if (matchingPaths.length > 1) {
    throw new Error(`more than one collection in the workspace is named "${collectionName}"`);
  }
  return matchingPaths[0];
};

const readDotEnvVars = (collectionPath) => {
  const dotEnvPath = path.join(collectionPath, '.env');
  return fs.existsSync(dotEnvPath) ? parseDotEnv(fs.readFileSync(dotEnvPath, 'utf8')) : {};
};

// Errors about a request read from disk name it as the script wrote it, and the collection by its
// name, so a script doesn't learn where another collection sits on disk.
const assertInsideCollection = (itemPathname, collection, relativeItemPathname) => {
  if (!isPathInsideCollection(itemPathname, collection.pathname)) {
    throw new Error(`"${relativeItemPathname}" is outside the collection "${collection.name}"`);
  }
};

const findRequestInCollection = (collection, itemPathname, relativeItemPathname) => {
  const item = findItemInCollectionByPathname(collection, itemPathname);
  if (!item) {
    throw new Error(`no request "${relativeItemPathname}" in the collection "${collection.name}"`);
  }
  return item;
};

// A collection read from disk holds only the request it was read for, so the other requests its
// scripts run are read from disk too. They run with the same collection state.
const loadRequestFromDisk = (collection, relativeItemPathname) => {
  const itemPathname = resolveItemPathname(collection.pathname, relativeItemPathname);
  assertInsideCollection(itemPathname, collection, relativeItemPathname);
  const itemsCollection = { ...collection, items: readRequestItems(collection.pathname, itemPathname) };
  return {
    item: findRequestInCollection(itemsCollection, itemPathname, relativeItemPathname),
    target: { collection: itemsCollection }
  };
};

// The request runs with the target collection's saved state and its own environment, sandbox
// mode and .env. It starts with no runtime variables, and the variables its scripts set are
// not sent back to the app, so the caller can't redirect the target's requests and the target
// can't change the caller's or its own collection's variables.
const loadRequestFromCollection = async ({ targetPath, collectionName, relativeItemPathname, callerCollection, activeEnvironmentName, workspacePath }) => {
  // The other collection's format can differ from the caller's, and changes when that collection
  // is migrated, so the request extension a script wrote is replaced with that collection's own.
  const itemPathname = resolveItemPathname(targetPath, relativeItemPathname.replace(REQUEST_EXTENSION_PATTERN, ''));
  assertInsideCollection(itemPathname, { pathname: targetPath, name: collectionName }, relativeItemPathname);
  const targetCollection = await readCollectionForRunRequest(targetPath, itemPathname);
  const item = findRequestInCollection(targetCollection, itemPathname, relativeItemPathname);

  const environment = resolveEnvironmentInheritance({
    environments: targetCollection.environments,
    targetEnvironment: targetCollection.environments.find((env) => env.name === activeEnvironmentName)
  });

  return {
    item,
    target: {
      collection: {
        ...targetCollection,
        securityConfig: collectionSecurityStore.getSecurityConfigForCollection(targetPath),
        globalEnvironmentVariables: cloneDeep(callerCollection.globalEnvironmentVariables),
        globalEnvironmentName: callerCollection.globalEnvironmentName
      },
      envVars: getEnvVars(environment),
      processEnvVars: getProcessEnvVars(targetCollection.uid, { workspacePath, dotEnvVars: readDotEnvVars(targetPath) }),
      runtimeVariables: {},
      isolateVariables: true,
      workspacePath
    }
  };
};

/**
 * Build the function a script's `bru.runRequest(path, options)` calls.
 *
 * `activeEnvironmentName` is taken before any script runs, so a script can't choose another
 * collection's environment by renaming its own. `runItem({ item, callerBru, target })` runs the
 * found item. `target` holds the `runRequest` arguments that replace the running request's: the
 * collection, for a request read from disk, and also its envVars, processEnvVars,
 * runtimeVariables, `isolateVariables` and `workspacePath`, for a request of another collection.
 */
const createRunRequestByItemPathname = ({ collection, activeEnvironmentName, workspacePath, runItem }) => {
  const runRequestFromCollection = async (relativeItemPathname, callerBru) => {
    if (collection.readsRequestsFromDisk) {
      let found;
      try {
        found = loadRequestFromDisk(collection, relativeItemPathname);
      } catch (err) {
        throw new Error(`bru.runRequest: ${err.message}`);
      }
      return runFoundItem({ item: found.item, callerBru, runItem, target: found.target });
    }

    const itemPathname = resolveItemPathname(collection.pathname, relativeItemPathname);
    const item = cloneDeep(findItemInCollectionByPathname(collection, itemPathname));
    if (!item) {
      // A bare string, as scripts have always received for this error.
      return Promise.reject(`bru.runRequest: invalid request path - ${itemPathname}`);
    }
    return runFoundItem({ item, callerBru, runItem });
  };

  const runRequestFromAnotherCollection = async (relativeItemPathname, callerBru, collectionName) => {
    if (typeof collectionName !== 'string' || !collectionName.trim()) {
      throw new Error('bru.runRequest: options.collection must be the name of a collection');
    }
    if (typeof relativeItemPathname !== 'string') {
      throw new Error('bru.runRequest: the request path must be a string');
    }
    if (!workspacePath) {
      throw new Error(`bru.runRequest: can't run a request from "${collectionName}" because this collection is not in a workspace`);
    }

    let found;
    try {
      const targetPath = await findWorkspaceCollectionPath(workspacePath, collectionName);
      found = await loadRequestFromCollection({
        targetPath,
        collectionName,
        relativeItemPathname,
        callerCollection: collection,
        activeEnvironmentName,
        workspacePath
      });
    } catch (err) {
      throw new Error(`bru.runRequest: ${err.message}`);
    }
    const res = await runFoundItem({ item: found.item, callerBru, runItem, target: found.target });
    return pick(res, RESPONSE_FIELDS_FROM_ANOTHER_COLLECTION);
  };

  return async (relativeItemPathname, callerBru, options) => {
    if (options !== undefined && options !== null && typeof options !== 'object') {
      throw new Error('bru.runRequest: options must be an object');
    }
    if (options?.collection === undefined) {
      return runRequestFromCollection(relativeItemPathname, callerBru);
    }
    return runRequestFromAnotherCollection(relativeItemPathname, callerBru, options.collection);
  };
};

module.exports = { createRunRequestByItemPathname };
