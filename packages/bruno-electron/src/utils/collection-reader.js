const fs = require('node:fs');
const path = require('node:path');
const { walk, defaultClassify, resolveDenylist } = require('./mount');
const { parseRequest, parseEnvironment, parseCollection, parseFolder } = require('@usebruno/filestore');
const { sortByNameThenSequence } = require('@usebruno/common');
const { dotenvToJson } = require('@usebruno/lang');
const { parseValueByDataType } = require('@usebruno/common/utils');
const EnvironmentSecretsStore = require('../store/env-secrets');
const { decryptStringSafe } = require('./encryption');

const environmentSecretsStore = new EnvironmentSecretsStore();

const envHasSecrets = (environment = {}) => (environment.variables || []).some((variable) => variable.secret);

const hydrateEnvironmentSecrets = (collectionPath, environment) => {
  if (!envHasSecrets(environment)) {
    return;
  }

  const envSecrets = environmentSecretsStore.getEnvSecrets(collectionPath, environment);
  envSecrets.forEach((secret) => {
    const variable = environment.variables.find((v) => v.name === secret.name && v.secret);
    if (variable && secret.value) {
      const decryptionResult = decryptStringSafe(secret.value);
      variable.value = parseValueByDataType(decryptionResult.value, variable.dataType);
    }
  });
};

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

// Match the sidebar's depth-first order: folders (name/sequence), then requests (sequence).
const flattenRequests = (folder) => {
  const folders = sortByNameThenSequence([...folder.folders.values()]);
  return [
    ...folders.flatMap(flattenRequests),
    ...folder.requests.sort((a, b) => (a.seq ?? 1) - (b.seq ?? 1))
  ];
};

const readCollectionForApiSpec = async (collectionPath) => {
  const { configFile, brunoConfig, configParsed } = await readCollectionConfig(collectionPath);

  const root = { folders: new Map(), requests: [] };
  const getFolder = (relativePath) => {
    const dirname = path.dirname(relativePath);
    const segments = dirname === '.' ? [] : dirname.split(path.sep);
    let folder = root;
    for (const name of segments) {
      if (!folder.folders.has(name)) {
        folder.folders.set(name, { name, folders: new Map(), requests: [] });
      }
      folder = folder.folders.get(name);
    }
    return folder;
  };
  const envVariables = {};
  const collectionVariables = {};
  const skipped = [];
  let processEnvVariables;

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

    if (basename === '.env' && path.dirname(relativePath) === '.') {
      try {
        processEnvVariables = dotenvToJson(fs.readFileSync(absolutePath, 'utf8'));
      } catch (err) {
        console.error(err);
      }
      continue;
    }

    const classification = defaultClassify(relativePath);
    if (!classification) continue;
    const { format, type } = classification;

    switch (type) {
      case 'request':
        await collect('request', relativePath, async () => {
          const item = await parseRequest(fs.readFileSync(absolutePath, 'utf8'), { format });
          getFolder(relativePath).requests.push({ ...item, pathname: absolutePath, depth: relativePath.split(path.sep).filter(Boolean).length });
        });
        break;

      case 'folder':
        await collect('folder root', relativePath, async () => {
          const parsed = await parseFolder(fs.readFileSync(absolutePath, 'utf8'), { format });
          const folder = getFolder(relativePath);
          if (parsed?.meta?.name) folder.name = parsed.meta.name;
          folder.seq = parsed?.meta?.seq;
        });
        break;

      case 'environment':
        await collect('environment', relativePath, async () => {
          const environment = await parseEnvironment(fs.readFileSync(absolutePath, 'utf8'), { format });
          const environmentName = basename.replace(/\.(bru|ya?ml)$/i, '');
          environment.name = environmentName;
          hydrateEnvironmentSecrets(collectionPath, environment);
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
    requests: flattenRequests(root),
    envVariables,
    processEnvVariables,
    collectionVariables,
    skipped
  };
};

module.exports = { readCollectionForApiSpec };
