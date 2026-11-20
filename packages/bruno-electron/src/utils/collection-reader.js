const fs = require('node:fs');
const path = require('node:path');
const { walk, defaultClassify, resolveDenylist, BRUNO_CONFIG_BASENAME, ENVIRONMENTS_DIR } = require('./mount');
const { parseRequest, parseEnvironment, parseCollection } = require('@usebruno/filestore');
const { getCollectionFormat, isPathInsideCollection } = require('./filesystem');
const { generateUidBasedOnHash } = require('./common');
const { transformBrunoConfigAfterRead } = require('./transformBrunoConfig');
const { hydrateEnvironments } = require('./environments');
const { getRequestUid } = require('../cache/requestUids');
const parseFile = require('../services/pool/jobs/parse-file');
const { buildTree } = require('../services/mount/tree-builder');

const resolveConfigFile = (collectionPath) => {
  if (fs.existsSync(path.join(collectionPath, 'opencollection.yml'))) return 'opencollection.yml';
  if (fs.existsSync(path.join(collectionPath, 'bruno.json'))) return 'bruno.json';
  return null;
};

const readCollectionConfig = async (collectionPath) => {
  const configFile = resolveConfigFile(collectionPath);
  if (!configFile) {
    throw new Error(`No bruno.json or opencollection.yml found in ${collectionPath}`);
  }

  const configPath = path.join(collectionPath, configFile);
  try {
    if (configFile === 'opencollection.yml') {
      const parsed = await parseCollection(fs.readFileSync(configPath, 'utf8'), { format: 'yml' });
      return { configFile, brunoConfig: parsed?.brunoConfig || null, configParsed: true };
    }
    return { configFile, brunoConfig: JSON.parse(fs.readFileSync(configPath, 'utf8')), configParsed: true };
  } catch (err) {
    console.error(`Failed to parse ${configFile}:`, err);
    return { configFile, brunoConfig: null, configParsed: false };
  }
};

const readCollectionForApiSpec = async (collectionPath) => {
  const { configFile, brunoConfig, configParsed } = await readCollectionConfig(collectionPath);

  const requests = [];
  const envVariables = {};
  const collectionVariables = {};
  const skipped = [];

  const markSkipped = (relativePath) => {
    if (!skipped.includes(relativePath)) {
      skipped.push(relativePath);
    }
  };

  if (!configParsed) {
    markSkipped(configFile);
  }

  const collect = async (label, relativePath, read) => {
    try {
      await read();
    } catch (err) {
      console.error(`Failed to parse ${label} ${relativePath}:`, err);
      markSkipped(relativePath);
    }
  };

  for (const { relativePath, absolutePath } of walk(collectionPath, resolveDenylist(brunoConfig?.ignore))) {
    const basename = path.basename(relativePath);

    const classification = defaultClassify(relativePath);
    if (!classification) continue;
    const { format, type } = classification;

    switch (type) {
      case 'request':
        await collect('request', relativePath, async () => {
          const item = await parseRequest(fs.readFileSync(absolutePath, 'utf8'), { format });
          requests.push({ ...item, pathname: absolutePath, depth: relativePath.split(path.sep).filter(Boolean).length });
        });
        break;

      case 'environment':
        await collect('environment', relativePath, async () => {
          const environment = await parseEnvironment(fs.readFileSync(absolutePath, 'utf8'), { format });
          const environmentName = basename.replace(/\.(bru|ya?ml)$/i, '');
          envVariables[environmentName] = environment.variables;
        });
        break;

      case 'collection':
        await collect('collection root', relativePath, async () => {
          const parsed = await parseCollection(fs.readFileSync(absolutePath, 'utf8'), { format });
          const collectionRoot = parsed?.collectionRoot || parsed;
          const collectionRootVars = collectionRoot?.request?.vars?.req || [];
          collectionRootVars.forEach((variable) => {
            if (variable.enabled) collectionVariables[variable.name] = variable.value;
          });
        });
        break;

      default:
        break;
    }
  }

  return {
    configFile,
    requests,
    envVariables,
    collectionVariables,
    skipped
  };
};

// fs.existsSync ignores case on macOS and Windows. Matching the directory entries resolves a
// request path the same way on every platform, as the lookup in a loaded collection does.
const existsWithExactCase = (rootPath, relativePath) => {
  let directoryPath = rootPath;
  for (const segment of relativePath.split(path.sep)) {
    let entries;
    try {
      entries = fs.readdirSync(directoryPath);
    } catch (err) {
      return false;
    }
    if (!entries.includes(segment)) {
      return false;
    }
    directoryPath = path.join(directoryPath, segment);
  }
  return true;
};

const parseCollectionFiles = (collectionPath, relativePaths) => {
  const parserResults = new Map();
  for (const relativePath of relativePaths) {
    const classification = defaultClassify(relativePath);
    if (classification && existsWithExactCase(collectionPath, relativePath)) {
      parserResults.set(relativePath, parseFile({ collectionPath, relativePath, ...classification }));
    }
  }
  return parserResults;
};

/**
 * Read one request of a collection from disk, inside the folders above it and with their roots,
 * as the `items` of that collection. Unsaved changes in the app are not included.
 */
const readRequestItems = (collectionPath, itemPathname) => {
  if (!isPathInsideCollection(itemPathname, collectionPath)) {
    throw new Error(`${itemPathname} is outside the collection at ${collectionPath}`);
  }

  const format = getCollectionFormat(collectionPath);
  const requestRelativePath = path.relative(collectionPath, itemPathname);
  const folderSegments = path.dirname(requestRelativePath).split(path.sep).filter((segment) => segment && segment !== '.');
  const folderRootFiles = folderSegments.map((_segment, depth) =>
    path.join(...folderSegments.slice(0, depth + 1), `folder.${format}`)
  );

  const parserResults = parseCollectionFiles(collectionPath, [...folderRootFiles, requestRelativePath]);
  return buildTree(collectionPath, parserResults, { uidFor: getRequestUid }).items;
};

/**
 * Read from disk the part of a collection that running one of its requests needs, shaped like
 * the collection `runRequest` takes: the config, the root and the environments, and the request
 * inside its folders. Unsaved changes in the app are not included. The collection holds only
 * that request, so `readsRequestsFromDisk` tells the requests its scripts run to be read from
 * disk as well.
 */
const readCollectionForRunRequest = async (collectionPath, itemPathname) => {
  const items = readRequestItems(collectionPath, itemPathname);

  const format = getCollectionFormat(collectionPath);
  const collectionFiles = format === 'yml' ? ['opencollection.yml'] : [BRUNO_CONFIG_BASENAME, 'collection.bru'];
  const environmentsPath = path.join(collectionPath, ENVIRONMENTS_DIR);
  const environmentFiles = fs.existsSync(environmentsPath)
    ? fs.readdirSync(environmentsPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(ENVIRONMENTS_DIR, entry.name))
    : [];

  const tree = buildTree(collectionPath, parseCollectionFiles(collectionPath, [...collectionFiles, ...environmentFiles]), { uidFor: getRequestUid });
  const brunoConfig = await transformBrunoConfigAfterRead(tree.brunoConfig || {}, collectionPath);
  hydrateEnvironments(collectionPath, tree.environments);

  return {
    ...tree,
    items,
    uid: generateUidBasedOnHash(collectionPath),
    name: brunoConfig.name,
    format,
    brunoConfig,
    readsRequestsFromDisk: true
  };
};

module.exports = { readCollectionConfig, readCollectionForApiSpec, readCollectionForRunRequest, readRequestItems };
