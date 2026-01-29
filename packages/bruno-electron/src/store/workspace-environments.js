const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const yaml = require('js-yaml');
const { parseEnvironment, stringifyEnvironment } = require('@usebruno/filestore');
const { writeFile, createDirectory } = require('../utils/filesystem');
const { generateUidBasedOnHash, uuid } = require('../utils/common');
const { decryptStringSafe } = require('../utils/encryption');
const EnvironmentSecretsStore = require('./env-secrets');
const {
  readWorkspaceConfig,
  generateYamlContent,
  writeWorkspaceFileAtomic
} = require('../utils/workspace-config');
const { withLock, getWorkspaceLockKey } = require('../utils/workspace-lock');

const environmentSecretsStore = new EnvironmentSecretsStore();

const ENV_FILE_EXTENSION = '.yml';

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
    return path.join(this.getEnvironmentsDir(workspacePath), `${environmentName}${ENV_FILE_EXTENSION}`);
  }

  findEnvironmentFileByUid(workspacePath, environmentUid) {
    const environmentsDir = this.getEnvironmentsDir(workspacePath);

    if (!fs.existsSync(environmentsDir)) {
      return null;
    }

    const files = fs.readdirSync(environmentsDir);

    for (const file of files) {
      if (file.endsWith(ENV_FILE_EXTENSION)) {
        const filePath = path.join(environmentsDir, file);
        const fileUid = generateUidBasedOnHash(filePath);
        if (fileUid === environmentUid) {
          return {
            filePath,
            fileName: file,
            name: file.slice(0, -ENV_FILE_EXTENSION.length)
          };
        }
      }
    }

    return null;
  }

  async parseEnvironmentFile(filePath, workspacePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const environment = await parseEnvironment(content, { format: 'yml' });

    const fileName = path.basename(filePath);
    environment.name = fileName.slice(0, -ENV_FILE_EXTENSION.length);
    environment.uid = generateUidBasedOnHash(filePath);

    _.each(environment.variables, (variable) => {
      if (!variable.uid) {
        variable.uid = uuid();
      }
    });

    if (this.envHasSecrets(environment)) {
      const envSecrets = environmentSecretsStore.getEnvSecrets(workspacePath, environment);
      _.each(envSecrets, (secret) => {
        const variable = _.find(environment.variables, (v) => v.name === secret.name);
        if (variable && secret.value) {
          const decryptionResult = decryptStringSafe(secret.value);
          variable.value = decryptionResult.value;
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
          globalEnvironments: [],
          activeGlobalEnvironmentUid: null
        };
      }

      const files = fs.readdirSync(environmentsDir);
      const environments = [];

      for (const file of files) {
        if (file.endsWith(ENV_FILE_EXTENSION)) {
          const filePath = path.join(environmentsDir, file);

          try {
            const environment = await this.parseEnvironmentFile(filePath, workspacePath);
            environments.push(environment);
          } catch (parseError) {
            console.error(`Failed to parse environment file ${file}:`, parseError);
          }
        }
      }

      const activeGlobalEnvironmentUid = await this.getActiveGlobalEnvironmentUid(workspacePath);

      return {
        globalEnvironments: environments,
        activeGlobalEnvironmentUid
      };
    } catch (error) {
      throw error;
    }
  }

  async getActiveGlobalEnvironmentUid(workspacePath) {
    try {
      if (!workspacePath) {
        return null;
      }

      const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

      if (!fs.existsSync(workspaceFilePath)) {
        return null;
      }

      const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
      const workspaceConfig = yaml.load(yamlContent);

      return workspaceConfig.activeEnvironmentUid || null;
    } catch (error) {
      return null;
    }
  }

  async setActiveGlobalEnvironmentUid(workspacePath, environmentUid) {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }

    const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

    if (!fs.existsSync(workspaceFilePath)) {
      throw new Error('Invalid workspace: workspace.yml not found');
    }

    return withLock(getWorkspaceLockKey(workspacePath), async () => {
      const workspaceConfig = readWorkspaceConfig(workspacePath);
      workspaceConfig.activeEnvironmentUid = environmentUid;
      const yamlOutput = generateYamlContent(workspaceConfig);
      await writeWorkspaceFileAtomic(workspacePath, yamlOutput);
      return true;
    });
  }

  async createGlobalEnvironment(workspacePath, { uid, name, variables }) {
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
        variables: variables || []
      };

      if (this.envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(workspacePath, environment);
      }

      const content = await stringifyEnvironment(environment, { format: 'yml' });
      await writeFile(environmentFilePath, content);

      return {
        uid: generateUidBasedOnHash(environmentFilePath),
        name,
        variables
      };
    } catch (error) {
      throw error;
    }
  }

  async saveGlobalEnvironment(workspacePath, { environmentUid, variables }) {
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

      if (this.envHasSecrets(environment)) {
        environmentSecretsStore.storeEnvSecrets(workspacePath, environment);
      }

      const content = await stringifyEnvironment(environment, { format: 'yml' });
      await writeFile(envFile.filePath, content);

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

      const activeGlobalEnvironmentUid = await this.getActiveGlobalEnvironmentUid(workspacePath);
      if (activeGlobalEnvironmentUid === environmentUid) {
        await this.setActiveGlobalEnvironmentUid(workspacePath, null);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async selectGlobalEnvironment(workspacePath, { environmentUid }) {
    try {
      if (!workspacePath) {
        throw new Error('Workspace path is required');
      }

      await this.setActiveGlobalEnvironmentUid(workspacePath, environmentUid);
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

      const environment = await this.parseEnvironmentFile(envFile.filePath, workspacePath);
      environment.color = color;

      const content = stringifyEnvironment(environment, { format: 'yml' });
      await writeFile(envFile.filePath, content);

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

  async selectGlobalEnvironmentByPath(workspacePath, params) {
    return this.selectGlobalEnvironment(workspacePath, params);
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
