const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { generateUidBasedOnHash } = require('../utils/common');
const { writeFile } = require('../utils/filesystem');
const { getPreferences, savePreferences } = require('./preferences');
const { globalEnvironmentsStore } = require('./global-environments');
const { generateYamlContent, readWorkspaceConfig, validateWorkspaceConfig } = require('../utils/workspace-config');

const OPENCOLLECTION_VERSION = '1.0.0';
const WORKSPACE_TYPE = 'workspace';
const DEFAULT_WORKSPACE_UID = 'default';

class DefaultWorkspaceManager {
  constructor() {
    this.defaultWorkspacePath = null;
    this.initializationPromise = null;
  }

  getDefaultWorkspacePath() {
    if (this.defaultWorkspacePath) {
      return this.defaultWorkspacePath;
    }

    const preferences = getPreferences();
    this.defaultWorkspacePath = preferences?.general?.defaultWorkspacePath;
    return this.defaultWorkspacePath;
  }

  getDefaultWorkspaceUid() {
    return DEFAULT_WORKSPACE_UID;
  }

  async setDefaultWorkspacePath(workspacePath) {
    const preferences = getPreferences();
    if (!preferences.general) {
      preferences.general = {};
    }
    preferences.general.defaultWorkspacePath = workspacePath;
    await savePreferences(preferences);

    this.defaultWorkspacePath = workspacePath;

    return workspacePath;
  }

  isValidDefaultWorkspace(workspacePath) {
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      return false;
    }

    const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
    if (!fs.existsSync(workspaceYmlPath)) {
      return false;
    }

    try {
      const config = readWorkspaceConfig(workspacePath);
      validateWorkspaceConfig(config);
      return true;
    } catch (error) {
      return false;
    }
  }

  async ensureDefaultWorkspaceExists() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    const existingPath = this.getDefaultWorkspacePath();

    if (this.isValidDefaultWorkspace(existingPath)) {
      this.defaultWorkspacePath = existingPath;
      return {
        workspacePath: existingPath,
        workspaceUid: this.getDefaultWorkspaceUid()
      };
    }

    this.initializationPromise = (async () => {
      try {
        const shouldMigrate = this.needsMigration();
        const newWorkspacePath = await this.initializeDefaultWorkspace({ migrateFromPreferences: shouldMigrate });

        return {
          workspacePath: newWorkspacePath,
          workspaceUid: this.getDefaultWorkspaceUid()
        };
      } catch (error) {
        console.error('Failed to initialize default workspace:', error);
        return null;
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  async initializeDefaultWorkspace(options = {}) {
    const { migrateFromPreferences = true } = options;

    const configDir = app.getPath('userData');
    const baseWorkspacePath = path.join(configDir, 'default-workspace');

    let workspacePath = baseWorkspacePath;
    let counter = 1;
    while (fs.existsSync(workspacePath)) {
      workspacePath = `${baseWorkspacePath}-${counter}`;
      counter++;
    }

    fs.mkdirSync(workspacePath, { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'collections'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'environments'), { recursive: true });

    const workspaceConfig = {
      opencollection: OPENCOLLECTION_VERSION,
      info: {
        name: 'My Workspace',
        type: WORKSPACE_TYPE
      },
      collections: [],
      specs: [],
      docs: ''
    };

    if (migrateFromPreferences) {
      await this.migrateFromPreferences(workspacePath, workspaceConfig);
    }

    const yamlContent = generateYamlContent(workspaceConfig);
    await writeFile(path.join(workspacePath, 'workspace.yml'), yamlContent);

    await this.setDefaultWorkspacePath(workspacePath);

    return workspacePath;
  }

  async migrateFromPreferences(workspacePath, workspaceConfig) {
    try {
      const Store = require('electron-store');
      const preferencesStore = new Store({ name: 'preferences' });

      const lastOpenedCollections = preferencesStore.get('lastOpenedCollections', []);

      if (lastOpenedCollections && lastOpenedCollections.length > 0) {
        const collections = lastOpenedCollections.map((collectionPath) => {
          const absolutePath = path.resolve(collectionPath);
          const collectionName = path.basename(absolutePath);

          return {
            type: 'preference',
            path: absolutePath,
            name: collectionName
          };
        });

        workspaceConfig.collections = collections;
      }

      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const activeGlobalEnvironmentUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();

      if (globalEnvironments && globalEnvironments.length > 0) {
        const { stringifyEnvironment } = require('@usebruno/filestore');
        const environmentsDir = path.join(workspacePath, 'environments');

        for (const env of globalEnvironments) {
          const envFilePath = path.join(environmentsDir, `${env.name}.yml`);

          const environment = {
            name: env.name,
            variables: env.variables || []
          };

          const content = stringifyEnvironment(environment, { format: 'yml' });
          await writeFile(envFilePath, content);

          if (env.uid === activeGlobalEnvironmentUid) {
            const newUid = generateUidBasedOnHash(envFilePath);
            workspaceConfig.activeEnvironmentUid = newUid;
          }
        }

        const globalEnvStore = new Store({ name: 'global-environments' });
        globalEnvStore.clear();
      }

      const defaultWorkspaceDocs = preferencesStore.get('preferences.defaultWorkspaceDocs', '');
      if (defaultWorkspaceDocs) {
        workspaceConfig.docs = defaultWorkspaceDocs;
        preferencesStore.delete('preferences.defaultWorkspaceDocs');
      }
    } catch (error) {
      console.error('Failed to migrate from preferences:', error);
    }
  }

  needsMigration() {
    const workspacePath = this.getDefaultWorkspacePath();
    if (workspacePath && fs.existsSync(workspacePath)) {
      return false;
    }

    const Store = require('electron-store');
    const preferencesStore = new Store({ name: 'preferences' });
    const lastOpenedCollections = preferencesStore.get('lastOpenedCollections', []);
    const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();

    return lastOpenedCollections.length > 0 || globalEnvironments.length > 0;
  }
}

const defaultWorkspaceManager = new DefaultWorkspaceManager();

module.exports = {
  defaultWorkspaceManager,
  DefaultWorkspaceManager
};
