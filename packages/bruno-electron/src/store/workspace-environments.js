const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { parseEnvironment, stringifyEnvironment } = require('@usebruno/filestore');
const { parseValueByDataType } = require('@usebruno/common/utils');
const { writeFile, createDirectory, withFileLock, resolveYamlPath } = require('../utils/filesystem');
const { generateUidBasedOnHash, uuid } = require('../utils/common');
const { decryptStringSafe } = require('../utils/encryption');
const EnvironmentSecretsStore = require('./env-secrets');
const { YAML_EXTENSIONS, isYamlFilename, stripYamlExtension } = require('@usebruno/common');

const environmentSecretsStore = new EnvironmentSecretsStore();

// Extension used for global environment files the app creates. Existing files are read under
// either YAML extension (see `isYamlFilename`); only newly created ones are pinned to `.yml`.
const ENV_FILE_EXTENSION = '.yml';

// Two files can claim the same environment name (`dev.yml` and `dev.yaml`). Secrets are keyed by
// name, so loading both would serve one file's secrets to the other and overwrite them on save.
// Keep only the file `getEnvironmentFilePath` would write to — `.yml` wins — and warn about the
// shadowed twin instead of silently merging them.
const dedupeByEnvironmentName = (environmentsDir, files) => {
  const yamlFiles = files.filter((file) => isYamlFilename(file));
  const winnerByName = new Map();

  for (const extension of YAML_EXTENSIONS) {
    for (const file of yamlFiles) {
      if (!file.toLowerCase().endsWith(extension)) continue;
      const name = stripYamlExtension(file);
      if (winnerByName.has(name)) {
        console.warn(
          `Ignoring global environment "${path.join(environmentsDir, file)}": `
          + `"${winnerByName.get(name)}" already defines the environment "${name}".`
        );
        continue;
      }
      winnerByName.set(name, file);
    }
  }

  return [...winnerByName.values()];
};

class GlobalEnvironmentsManager {
  constructor() {}

  envHasSecrets(environment) {
    const secrets = _.filter(environment.variables, (v) => v.secret === true);
    return secrets && secrets.length > 0;
  }

  getEnvironmentsDir(workspacePath) {
    return path.join(workspacePath, 'environments');
  }

  getEnvironmentFilePath(workspacePath, environmentName) {
    const environmentsDir = this.getEnvironmentsDir(workspacePath);
    // Write back to the file that already exists, whichever extension it uses; a brand new
    // environment gets ENV_FILE_EXTENSION.
    return resolveYamlPath(environmentsDir, environmentName)
      || path.join(environmentsDir, `${environmentName}${ENV_FILE_EXTENSION}`);
  }

  findEnvironmentFileByUid(workspacePath, environmentUid) {
    const environmentsDir = this.getEnvironmentsDir(workspacePath);

    if (!fs.existsSync(environmentsDir)) {
      return null;
    }

    const files = dedupeByEnvironmentName(environmentsDir, fs.readdirSync(environmentsDir));

    for (const file of files) {
      const filePath = path.join(environmentsDir, file);
      const fileUid = generateUidBasedOnHash(filePath);
      if (fileUid === environmentUid) {
        return {
          filePath,
          fileName: file,
          name: stripYamlExtension(file)
        };
      }
    }

    return null;
  }

  async parseEnvironmentFile(filePath, workspacePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const environment = await parseEnvironment(content, { format: 'yml' });

    const fileName = path.basename(filePath);
    environment.name = stripYamlExtension(fileName);
    environment.uid = generateUidBasedOnHash(filePath);

    _.each(environment.variables, (variable) => {
      if (!variable.uid) {
        variable.uid = uuid();
      }
    });

    if (this.envHasSecrets(environment)) {
      const envSecrets = environmentSecretsStore.getEnvSecrets(workspacePath, environment);
      _.each(envSecrets, (secret) => {
        const variable = _.find(environment.variables, (v) => v.name === secret.name && v.secret);
        if (variable && secret.value) {
          const decryptionResult = decryptStringSafe(secret.value);
          variable.value = parseValueByDataType(decryptionResult.value, variable.dataType);
        }
      });
    }

    return environment;
  }

  async getGlobalEnvironments(workspacePath) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      const environmentsDir = this.getEnvironmentsDir(workspacePath);

      if (!fs.existsSync(environmentsDir)) {
        return {
          globalEnvironments: []
        };
      }

      const files = dedupeByEnvironmentName(environmentsDir, fs.readdirSync(environmentsDir));
      const environments = [];

      for (const file of files) {
        const filePath = path.join(environmentsDir, file);

        try {
          const environment = await this.parseEnvironmentFile(filePath, workspacePath);
          environments.push(environment);
        } catch (parseError) {
          console.error(`Failed to parse environment file ${file}:`, parseError);
        }
      }

      return {
        globalEnvironments: environments
      };
    } catch (error) {
      throw error;
    }
  }

  async createGlobalEnvironment(workspacePath, { uid, name, variables, color }) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      const environmentsDir = this.getEnvironmentsDir(workspacePath);

      if (!fs.existsSync(environmentsDir)) {
        await createDirectory(environmentsDir);
      }

      const environmentFilePath = this.getEnvironmentFilePath(workspacePath, name);

      if (fs.existsSync(environmentFilePath)) {
        throw new Error(`Environment "${name}" already exists`);
      }

      const environment = {
        name: name,
        variables: variables || [],
        color
      };

      if (this.envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(workspacePath, environment);
      }

      const content = await stringifyEnvironment(environment, { format: 'yml' });
      await writeFile(environmentFilePath, content);

      return {
        uid: generateUidBasedOnHash(environmentFilePath),
        name,
        variables,
        color
      };
    } catch (error) {
      throw error;
    }
  }

  async saveGlobalEnvironment(workspacePath, { environmentUid, variables, color }) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      const envFile = this.findEnvironmentFileByUid(workspacePath, environmentUid);

      if (!envFile) {
        throw new Error(`Environment file not found for uid: ${environmentUid}`);
      }

      const environment = {
        name: envFile.name,
        variables: variables
      };

      if (color) {
        environment.color = color;
      }

      // Serialize concurrent writes per env file. Two rapid scripted
      // bru.setGlobalEnvVar() persist calls can otherwise overlap and the
      // second writer's stringify+write can land before the first, dropping it.
      await withFileLock(envFile.filePath, async () => {
        if (this.envHasSecrets(environment)) {
          environmentSecretsStore.storeEnvSecrets(workspacePath, environment);
        }

        const content = await stringifyEnvironment(environment, { format: 'yml' });
        await writeFile(envFile.filePath, content);
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async renameGlobalEnvironment(workspacePath, { environmentUid, name: newName }) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      const envFile = this.findEnvironmentFileByUid(workspacePath, environmentUid);

      if (!envFile) {
        throw new Error(`Environment file not found for uid: ${environmentUid}`);
      }

      const newFilePath = this.getEnvironmentFilePath(workspacePath, newName);

      if (fs.existsSync(newFilePath) && newFilePath !== envFile.filePath) {
        throw new Error(`Environment "${newName}" already exists`);
      }

      const environment = await this.parseEnvironmentFile(envFile.filePath, workspacePath);
      const oldName = environment.name;
      environment.name = newName;

      const content = await stringifyEnvironment(environment, { format: 'yml' });
      await writeFile(newFilePath, content);

      if (this.envHasSecrets(environment)) {
        const oldEnv = { name: oldName };
        const secrets = environmentSecretsStore.getEnvSecrets(workspacePath, oldEnv);

        if (secrets && secrets.length > 0) {
          const newEnv = { name: newName, variables: environment.variables };
          environmentSecretsStore.storeEnvSecrets(workspacePath, newEnv);
        }
      }

      if (envFile.filePath !== newFilePath) {
        fs.unlinkSync(envFile.filePath);
      }

      const newUid = generateUidBasedOnHash(newFilePath);
      return { uid: newUid, name: newName };
    } catch (error) {
      throw error;
    }
  }

  async deleteGlobalEnvironment(workspacePath, { environmentUid }) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      const envFile = this.findEnvironmentFileByUid(workspacePath, environmentUid);

      if (!envFile) {
        throw new Error(`Environment file not found for uid: ${environmentUid}`);
      }

      fs.unlinkSync(envFile.filePath);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async updateGlobalEnvironmentColor(workspacePath, environmentUid, color) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      const envFile = this.findEnvironmentFileByUid(workspacePath, environmentUid);

      if (!envFile) {
        throw new Error(`Environment file not found for uid: ${environmentUid}`);
      }

      await withFileLock(envFile.filePath, async () => {
        const environment = await this.parseEnvironmentFile(envFile.filePath, workspacePath);
        environment.color = color;

        const content = stringifyEnvironment(environment, { format: 'yml' });
        await writeFile(envFile.filePath, content);
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async getGlobalEnvironmentsByPath(workspacePath) {
    return this.getGlobalEnvironments(workspacePath);
  }

  async addGlobalEnvironmentByPath(workspacePath, params) {
    return this.createGlobalEnvironment(workspacePath, params);
  }

  async saveGlobalEnvironmentByPath(workspacePath, params) {
    return this.saveGlobalEnvironment(workspacePath, params);
  }

  async renameGlobalEnvironmentByPath(workspacePath, params) {
    return this.renameGlobalEnvironment(workspacePath, params);
  }

  async deleteGlobalEnvironmentByPath(workspacePath, params) {
    return this.deleteGlobalEnvironment(workspacePath, params);
  }

  async updateGlobalEnvironmentColorByPath(workspacePath, { environmentUid, color }) {
    return this.updateGlobalEnvironmentColor(workspacePath, environmentUid, color);
  }
}

const globalEnvironmentsManager = new GlobalEnvironmentsManager();

module.exports = {
  globalEnvironmentsManager,
  GlobalEnvironmentsManager,
  ENV_FILE_EXTENSION
};
