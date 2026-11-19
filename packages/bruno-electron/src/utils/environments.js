const fs = require('fs');
const path = require('path');
const { parseEnvironment, stringifyEnvironment } = require('@usebruno/filestore');
const { writeFile, withFileLock } = require('./filesystem');
const { uidForSeed } = require('./mount');

/**
 * Rewrites the `extends` references that pointed at `oldName` before it was renamed to `newName`.
 * References are matched exactly, the way the inheritance resolver reads them, so a differently-cased
 * reference the resolver never followed is not claimed by this rename either.
 */
const renameEnvironmentExtendsReferences = async ({ environmentsDirPath, format, oldName, newName }) => {
  if (!fs.existsSync(environmentsDirPath)) {
    return;
  }

  const extension = `.${format}`;
  const fileNames = fs.readdirSync(environmentsDirPath).filter((fileName) => fileName.endsWith(extension));

  for (const fileName of fileNames) {
    const filePath = path.join(environmentsDirPath, fileName);

    try {
      await withFileLock(filePath, async () => {
        const environment = parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format });

        if (environment.extends !== oldName) {
          return;
        }

        environment.extends = newName;
        environment.name = path.basename(fileName, extension);

        await writeFile(filePath, stringifyEnvironment(environment, { format }));
      });
    } catch (error) {
      console.error(`Failed to update the extends reference in ${fileName}:`, error);
    }
  }
};

let _envSecretsStore = null;
const getEnvSecretsStore = () => {
  if (!_envSecretsStore) {
    const EnvironmentSecretsStore = require('../store/env-secrets');
    _envSecretsStore = new EnvironmentSecretsStore();
  }
  return _envSecretsStore;
};

const envHasSecrets = (env) => Array.isArray(env?.variables) && env.variables.some((v) => v.secret);

/**
 * Give the variables of environments parsed from disk their stable uids, and fill in the values
 * of secret variables from the secrets store.
 */
const hydrateEnvironments = (collectionPath, environments) => {
  if (!Array.isArray(environments)) return;
  const { decryptStringSafe } = require('./encryption');
  for (const env of environments) {
    if (!Array.isArray(env.variables)) continue;
    env.variables.forEach((variable, i) => {
      variable.uid = uidForSeed(`${env.uid}#var#${i}#${variable.name || ''}`);
    });
    if (!envHasSecrets(env)) continue;
    try {
      const envSecrets = getEnvSecretsStore().getEnvSecrets(collectionPath, env);
      for (const secret of envSecrets || []) {
        const variable = env.variables.find((v) => v.name === secret.name && v.secret);
        if (variable && secret.value) {
          const decrypted = decryptStringSafe(secret.value);
          variable.value = decrypted.value;
        }
      }
    } catch (err) {
      console.error('[mount] env secret hydration failed', err);
    }
  }
};

module.exports = {
  renameEnvironmentExtendsReferences,
  hydrateEnvironments
};
