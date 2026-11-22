const fs = require('fs');
const path = require('path');
const { cloneDeep, pick } = require('lodash');
const { FORMAT_CONFIG, getCollectionFormat, getCollectionConfig, createCollectionJsonFromPathname, findItemInCollection } = require('../utils/collection');
const { isSafeFileName } = require('../utils/filesystem');
const { loadEnvironmentFromFile, readDotEnvVars } = require('../utils/environment');
const { getWorkspaceCollectionPaths, isCollectionInWorkspace } = require('../utils/workspace');

// What a script gets back from a request of another collection. The rest of the response (the
// full URL) can carry that collection's credentials.
const RESPONSE_FIELDS_FROM_ANOTHER_COLLECTION = ['status', 'statusText', 'headers', 'data', 'duration', 'size', 'error'];

const REQUEST_EXTENSION_PATTERN = /\.(bru|yml)$/i;

const resolveItemPathname = (collectionPath, format, relativeItemPathname) => {
  const { ext } = FORMAT_CONFIG[format];
  const itemPathname = path.join(collectionPath, relativeItemPathname);
  return itemPathname.endsWith(ext) ? itemPathname : `${itemPathname}${ext}`;
};

// Matches the collection's own name (bruno.json / opencollection.yml), as the app does: the
// name in workspace.yml isn't updated when a collection is renamed.
const findWorkspaceCollectionPath = (workspacePath, collectionName) => {
  const matchingPaths = getWorkspaceCollectionPaths(workspacePath).filter((collectionPath) => {
    const format = getCollectionFormat(collectionPath);
    if (!format) {
      return false;
    }
    try {
      return getCollectionConfig(collectionPath, format).brunoConfig?.name === collectionName;
    } catch (err) {
      return false;
    }
  });

  if (matchingPaths.length === 0) {
    throw new Error(`no collection named "${collectionName}" in the workspace`);
  }
  if (matchingPaths.length > 1) {
    throw new Error(`more than one collection in the workspace is named "${collectionName}"`);
  }
  return matchingPaths[0];
};

const readEnvironmentVariables = (collectionPath, format, environmentName) => {
  // The name comes from the caller's environment, so only a bare file name may pick a file.
  if (!isSafeFileName(environmentName)) {
    return {};
  }
  const environmentPath = path.join(collectionPath, 'environments', `${environmentName}${FORMAT_CONFIG[format].ext}`);
  if (!fs.existsSync(environmentPath)) {
    return {};
  }
  return loadEnvironmentFromFile({ filePath: environmentPath, name: environmentName }).variables;
};

// Same behavior as the app (bruno-electron/src/ipc/network/run-request-by-pathname.js); keep the
// two in sync. The request runs from the target collection's saved files, with its environment
// named like the active one and its .env. It starts with no runtime variables, gets a copy of the
// global environment, and nothing its scripts set is written back to any file. `--env-var` and
// `--client-cert-config` apply only to the collection being run.
const loadRequestFromCollection = ({ targetPath, collectionName, relativeItemPathname, callerContext, activeEnvironmentName }) => {
  // The run report lists the files that fail to parse in the collection being run, not in the
  // collections its scripts call.
  const collection = createCollectionJsonFromPathname(targetPath, { reportSkippedFiles: false });
  // The other collection's format can differ from the caller's, and changes when that collection
  // is migrated, so the request extension a script wrote is replaced with that collection's own.
  // The whole collection is loaded and searched, so a path outside it finds nothing.
  const itemPathname = resolveItemPathname(targetPath, collection.format, relativeItemPathname.replace(REQUEST_EXTENSION_PATTERN, ''));
  const item = findItemInCollection(collection, itemPathname);
  if (!item) {
    // Named as the script wrote it, so a script doesn't learn where another collection sits on disk.
    throw new Error(`no request "${relativeItemPathname}" in the collection "${collectionName}"`);
  }

  return {
    item: cloneDeep(item),
    context: {
      collection,
      collectionPath: targetPath,
      brunoConfig: collection.brunoConfig,
      collectionRoot: collection.root,
      envVars: readEnvironmentVariables(targetPath, collection.format, activeEnvironmentName),
      processEnvVars: { ...process.env, ...readDotEnvVars(targetPath) },
      runtimeVariables: {},
      globalEnvVars: cloneDeep(callerContext.globalEnvVars),
      persistPaths: {}
    }
  };
};

/**
 * Build the function a script's `bru.runRequest(path, options)` calls.
 *
 * `context` holds the runSingleRequest arguments of the running collection: collection,
 * collectionPath, brunoConfig, collectionRoot, envVars, processEnvVars, runtimeVariables,
 * globalEnvVars and persistPaths. `runItem(item, context, runRequestByPathname)` runs an item
 * with them. The active environment name is taken now, before any script runs, so a script can't
 * choose another collection's environment by renaming its own.
 */
const createRunRequestByPathname = ({ context, workspacePath, runItem }) => {
  const activeEnvironmentName = context.envVars.__name__;

  const runRequestFromAnotherCollection = async (relativeItemPathname, collectionName) => {
    if (typeof collectionName !== 'string' || !collectionName.trim()) {
      throw new Error('bru.runRequest: options.collection must be the name of a collection');
    }
    if (typeof relativeItemPathname !== 'string') {
      throw new Error('bru.runRequest: the request path must be a string');
    }
    if (!workspacePath || !isCollectionInWorkspace(workspacePath, context.collectionPath)) {
      throw new Error(`bru.runRequest: can't run a request from "${collectionName}" because this collection is not in a workspace`);
    }

    let target;
    try {
      const targetPath = findWorkspaceCollectionPath(workspacePath, collectionName);
      target = loadRequestFromCollection({ targetPath, collectionName, relativeItemPathname, callerContext: context, activeEnvironmentName });
    } catch (err) {
      throw new Error(`bru.runRequest: ${err.message}`);
    }
    const runTargetRequestByPathname = createRunRequestByPathname({ context: target.context, workspacePath, runItem });
    const res = await runItem(target.item, target.context, runTargetRequestByPathname);
    return pick(res?.response, RESPONSE_FIELDS_FROM_ANOTHER_COLLECTION);
  };

  const runRequestByPathname = async (relativeItemPathname, _callerBru, options) => {
    if (options !== undefined && options !== null && typeof options !== 'object') {
      throw new Error('bru.runRequest: options must be an object');
    }
    if (options?.collection !== undefined) {
      return runRequestFromAnotherCollection(relativeItemPathname, options.collection);
    }

    const { collection, collectionPath } = context;
    const itemPathname = resolveItemPathname(collectionPath, collection.format, relativeItemPathname);
    const item = cloneDeep(findItemInCollection(collection, itemPathname));
    if (!item) {
      // A bare string, as scripts have always received for this error.
      return Promise.reject(`bru.runRequest: invalid request path - ${itemPathname}`);
    }
    const res = await runItem(item, context, runRequestByPathname);
    return res?.response;
  };

  return runRequestByPathname;
};

module.exports = { createRunRequestByPathname };
