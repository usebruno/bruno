const fs = require('node:fs');
const path = require('node:path');
const { walk, defaultClassify, resolveDenylist } = require('./mount');
const { parseRequest, parseEnvironment, parseCollection } = require('@usebruno/filestore');
const { dotenvToJson } = require('@usebruno/lang');

const readCollectionForApiSpec = async (collectionPath, { decryptEnvSecrets } = {}) => {
  let name = '';
  let brunoConfig = null;

  const ocYmlPath = path.join(collectionPath, 'opencollection.yml');
  const brunoConfigPath = path.join(collectionPath, 'bruno.json');
  try {
    if (fs.existsSync(ocYmlPath)) {
      const parsed = await parseCollection(fs.readFileSync(ocYmlPath, 'utf8'), { format: 'yml' });
      brunoConfig = parsed?.brunoConfig || null;
    } else if (fs.existsSync(brunoConfigPath)) {
      brunoConfig = JSON.parse(fs.readFileSync(brunoConfigPath, 'utf8'));
    }
    name = brunoConfig?.name || '';
  } catch (err) {
    console.error(err);
  }

  const files = [];
  const envVariables = {};
  const collectionVariables = {};
  const skipped = [];
  let processEnvVariables;

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

    if (type === 'request') {
      try {
        const item = await parseRequest(fs.readFileSync(absolutePath, 'utf8'), { format });
        files.push({ ...item, pathname: absolutePath, depth: relativePath.split(path.sep).filter(Boolean).length });
      } catch (err) {
        console.error(`Failed to parse request ${relativePath}:`, err);
        skipped.push(relativePath);
      }
    } else if (type === 'environment') {
      try {
        const data = await parseEnvironment(fs.readFileSync(absolutePath, 'utf8'), { format });
        if (decryptEnvSecrets) {
          decryptEnvSecrets(data, basename.replace(/\.(bru|ya?ml)$/i, ''));
        }
        envVariables[basename] = data.variables;
      } catch (err) {
        console.error(`Failed to parse environment ${relativePath}:`, err);
        skipped.push(relativePath);
      }
    } else if (type === 'collection') {
      try {
        const parsed = await parseCollection(fs.readFileSync(absolutePath, 'utf8'), { format });
        const collectionRoot = parsed?.collectionRoot || parsed;
        const collectionRootVars = collectionRoot?.request?.vars?.req || [];
        collectionRootVars.forEach((variable) => {
          if (variable.enabled) collectionVariables[variable.name] = variable.value;
        });
      } catch (err) {
        console.error(`Failed to parse collection root ${relativePath}:`, err);
      }
    }
  }

  return { name, files, envVariables, processEnvVariables, collectionVariables, skipped };
};

module.exports = { readCollectionForApiSpec };
