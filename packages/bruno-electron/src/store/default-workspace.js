const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const yaml = require('js-yaml');
const { generateUidBasedOnHash } = require('../utils/common');
const { writeFile, createDirectory } = require('../utils/filesystem');
const { getPreferences, savePreferences } = require('./preferences');
const { globalEnvironmentsStore } = require('./global-environments');

class DefaultWorkspaceManager {
  constructor() {
    this.defaultWorkspacePath = null;
    this.defaultWorkspaceUid = null;
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
    const workspacePath = this.getDefaultWorkspacePath();
    if (!workspacePath) {
      return null;
    }

    if (!this.defaultWorkspaceUid) {
      this.defaultWorkspaceUid = generateUidBasedOnHash(workspacePath);
    }

    return this.defaultWorkspaceUid;
  }

  async setDefaultWorkspacePath(workspacePath) {
    const preferences = getPreferences();
    if (!preferences.general) {
      preferences.general = {};
    }
    preferences.general.defaultWorkspacePath = workspacePath;
    await savePreferences(preferences);

    this.defaultWorkspacePath = workspacePath;
    this.defaultWorkspaceUid = generateUidBasedOnHash(workspacePath);

    return workspacePath;
  }

  async ensureDefaultWorkspaceExists() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    const existingPath = this.getDefaultWorkspacePath();

    if (existingPath && fs.existsSync(existingPath)) {
      return {
        workspacePath: existingPath,
        workspaceUid: this.getDefaultWorkspaceUid()
      };
    }

    this.initializationPromise = (async () => {
      try {
        const shouldMigrate = this.needsMigration();
        const newWorkspacePath = await this.initializeDefaultWorkspace(null, { migrateFromPreferences: shouldMigrate });
        const workspaceYmlPath = path.join(existingPath, 'workspace.yml');
        if (!fs.existsSync(workspaceYmlPath)) {
          this.defaultWorkspacePath = null;
        } else {
          return {
            workspacePath: existingPath,
            workspaceUid: this.getDefaultWorkspaceUid()
          };
        }
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  async initializeDefaultWorkspace(workspacePath = null, options = {}) {
    const { migrateFromPreferences = true } = options;

    if (!workspacePath) {
      const configDir = app.getPath('userData');
      const baseWorkspacePath = path.join(configDir, 'default-workspace');

      let finalPath = baseWorkspacePath;
      let counter = 1;
      while (fs.existsSync(finalPath)) {
        finalPath = `${baseWorkspacePath}-${counter}`;
        counter++;
      }

      workspacePath = finalPath;
    }

    if (!fs.existsSync(workspacePath)) {
      await createDirectory(workspacePath);
    }

    await createDirectory(path.join(workspacePath, 'collections'));
    await createDirectory(path.join(workspacePath, 'environments'));

    const workspaceConfig = {
      name: 'My Workspace',
      type: 'default',
      version: '1.0.0',
      docs: '',
      collections: []
    };

    if (migrateFromPreferences) {
      await this.migrateFromPreferences(workspacePath, workspaceConfig);
    }

    const yamlContent = yaml.dump(workspaceConfig, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
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
