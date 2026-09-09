const fs = require('node:fs');
const path = require('node:path');
const { walk, defaultClassify, resolveDenylist } = require('./mount');
const { parseRequest, parseEnvironment, parseCollection } = require('@usebruno/filestore');
const { dotenvToJson } = require('@usebruno/lang');

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
      return { configFile, brunoConfig: parsed?.brunoConfig || null };
    }
    return { configFile, brunoConfig: JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  } catch (err) {
    console.error(err);
    return { configFile, brunoConfig: null };
  }
};

const readCollectionForApiSpec = async (collectionPath, { decryptEnvSecrets } = {}) => {
  const { configFile, brunoConfig } = await readCollectionConfig(collectionPath);

  const requests = [];
  const envVariables = {};
  const collectionVariables = {};
  const skipped = [];
  let processEnvVariables;

  const collect = async (label, relativePath, read) => {
    try {
      await read();
    } catch (err) {
      console.error(`Failed to parse ${label} ${relativePath}:`, err);
      skipped.push(relativePath);
    }
  };

  for (const { relativePath, absolutePath } of walk(collectionPath, resolveDenylist(brunoConfig?.ignore))) {
    const basename = path.basename(relativePath);

    if (basename === '.env' && path.dirname(relativePath) === '.') {
      try {
        processEnvVariables = { ...process.env, ...dotenvToJson(fs.readFileSync(absolutePath, 'utf8')) };
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
          requests.push({ ...item, pathname: absolutePath, depth: relativePath.split(path.sep).filter(Boolean).length });
        });
        break;

      case 'environment':
        await collect('environment', relativePath, async () => {
          const environment = await parseEnvironment(fs.readFileSync(absolutePath, 'utf8'), { format });
          const environmentName = basename.replace(/\.(bru|ya?ml)$/i, '');
          if (decryptEnvSecrets) {
            decryptEnvSecrets(environment, environmentName);
          }
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
    name: brunoConfig?.name || '',
    configFile,
    requests,
    envVariables,
    processEnvVariables,
    collectionVariables,
    skipped
  };
};

module.exports = { readCollectionForApiSpec };
