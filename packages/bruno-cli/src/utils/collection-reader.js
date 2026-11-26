/**
 * This file exists because the current implementation of the `brunoToOpenapi` (former exportOpenApi) is moved from `@usebruno/app`
 * to `@usebruno/converters` and the scope of the ticket `BRU-3523` is to have the same implementation of
 * `brunoToOpenApi` currently present in the app.
 *
 * This file is the exact copy of the implementation of
 * [readCollectionForApiSpec](https://github.com/usebruno/bruno/blob/main/packages/bruno-electron/src/utils/collection-reader.js#L31),
 * which is the original function present in `@usebruno/electron` being used by `@usebruno/app`.
 *
 * @author @vasharma05-bruno
 */

const fs = require('node:fs');
const path = require('node:path');
const { walk, defaultClassify, resolveDenylist } = require('./collection-walk');
const { parseRequest, parseEnvironment, parseCollection } = require('@usebruno/filestore');

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
    console.error(`Failed to parse ${configFile}: ${err.message}`);
    return { configFile, brunoConfig: null, configParsed: false };
  }
};

// Copied from bruno-electron/src/utils/collection-reader.js so `bru export openapi` exports the same spec
// as the app's Create API Spec. Keep the two in step; the only difference is that parse failures are
// logged by message, without the stack trace.
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
      console.error(`Failed to parse ${label} ${relativePath}: ${err.message}`);
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

module.exports = { readCollectionConfig, readCollectionForApiSpec };
