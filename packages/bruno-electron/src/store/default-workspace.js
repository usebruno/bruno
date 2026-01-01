const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { app } = require('electron');
const { generateUidBasedOnHash } = require('../utils/common');
const { writeFile } = require('../utils/filesystem');
const { getPreferences, savePreferences } = require('./preferences');
const { globalEnvironmentsStore } = require('./global-environments');
const {
  generateYamlContent,
  readWorkspaceConfig,
  validateWorkspaceConfig,
  isValidCollectionEntry,
  isValidSpecEntry
} = require('../utils/workspace-config');

const OPENCOLLECTION_VERSION = '1.0.0';
const WORKSPACE_TYPE = 'workspace';
const DEFAULT_WORKSPACE_UID = 'default';
const DEFAULT_WORKSPACE_NAME = 'My Workspace';
const MAX_WORKSPACE_CREATION_ATTEMPTS = 20;

class DefaultWorkspaceManager {
  constructor() {
    this.defaultWorkspacePath = null;
    this.initializationPromise = null;
    this.recoveryResult = null;
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

    const oldWorkspacePath = this.getDefaultWorkspacePath();

    const configDir = app.getPath('userData');
    const baseWorkspacePath = path.join(configDir, 'default-workspace');

    let workspacePath = baseWorkspacePath;
    let counter = 1;
    while (fs.existsSync(workspacePath) && counter < MAX_WORKSPACE_CREATION_ATTEMPTS) {
      workspacePath = `${baseWorkspacePath}-${counter}`;
      counter++;
    }

    if (counter >= MAX_WORKSPACE_CREATION_ATTEMPTS) {
      throw new Error('Unable to create default workspace: too many existing workspace directories');
    }

    fs.mkdirSync(workspacePath, { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'collections'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'environments'), { recursive: true });

    const workspaceConfig = {
      opencollection: OPENCOLLECTION_VERSION,
      info: {
        name: DEFAULT_WORKSPACE_NAME,
        type: WORKSPACE_TYPE
      },
      collections: [],
      specs: [],
      docs: ''
    };

    this.recoveryResult = null;
    if (oldWorkspacePath && fs.existsSync(oldWorkspacePath)) {
      this.recoveryResult = await this.recoverFromCorruptedWorkspace(oldWorkspacePath, workspacePath, workspaceConfig);
    }

    let migrationCleanupFn = null;
    if (migrateFromPreferences) {
      migrationCleanupFn = await this.migrateFromPreferences(workspacePath, workspaceConfig);
    }

    const yamlContent = generateYamlContent(workspaceConfig);
    await writeFile(path.join(workspacePath, 'workspace.yml'), yamlContent);

    await this.setDefaultWorkspacePath(workspacePath);

    if (migrationCleanupFn) {
      migrationCleanupFn();
    }

    this.recoveryResult = null;

    return workspacePath;
  }

  async migrateFromPreferences(workspacePath, workspaceConfig) {
    const Store = require('electron-store');
    const preferencesStore = new Store({ name: 'preferences' });

    let shouldClearGlobalEnvStore = false;
    let shouldDeleteWorkspaceDocs = false;

    const recovery = this.recoveryResult || {};
    const hasRecoveredCollections = recovery.collectionsRecovered > 0;
    const hasRecoveredEnvironments = recovery.environmentsRecovered > 0;
    const hasRecoveredDocs = recovery.docsRecovered;

    try {
      const lastOpenedCollections = preferencesStore.get('lastOpenedCollections', []);

      if (lastOpenedCollections && lastOpenedCollections.length > 0) {
        const collections = lastOpenedCollections
          .map((collectionPath) => {
            if (!collectionPath || typeof collectionPath !== 'string') {
              return null;
            }
            const absolutePath = path.resolve(collectionPath);
            const collectionName = path.basename(absolutePath);

            return {
              path: absolutePath,
              name: collectionName
            };
          })
          .filter((collection) => isValidCollectionEntry(collection));

        if (hasRecoveredCollections) {
          const existingPaths = new Set(workspaceConfig.collections.map((c) => path.normalize(c.path)));
          const newCollections = collections.filter((c) => !existingPaths.has(path.normalize(c.path)));
          workspaceConfig.collections = [...workspaceConfig.collections, ...newCollections];
        } else {
          workspaceConfig.collections = collections;
        }
      }

      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const activeGlobalEnvironmentUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();

      if (globalEnvironments && globalEnvironments.length > 0) {
        const { stringifyEnvironment } = require('@usebruno/filestore');
        const environmentsDir = path.join(workspacePath, 'environments');

        for (const env of globalEnvironments) {
          if (!env || !env.name || typeof env.name !== 'string') {
            continue;
          }

          const envFilePath = path.join(environmentsDir, `${env.name}.yml`);

          if (hasRecoveredEnvironments && fs.existsSync(envFilePath)) {
            continue;
          }

          const environment = {
            name: env.name,
            variables: env.variables || []
          };

          const content = stringifyEnvironment(environment, { format: 'yml' });
          await writeFile(envFilePath, content);

          if (env.uid === activeGlobalEnvironmentUid && !workspaceConfig.activeEnvironmentUid) {
            const newUid = generateUidBasedOnHash(envFilePath);
            workspaceConfig.activeEnvironmentUid = newUid;
          }
        }

        shouldClearGlobalEnvStore = true;
      }

      const defaultWorkspaceDocs = preferencesStore.get('preferences.defaultWorkspaceDocs', '');
      if (defaultWorkspaceDocs && !hasRecoveredDocs) {
        workspaceConfig.docs = defaultWorkspaceDocs;
        shouldDeleteWorkspaceDocs = true;
      }
    } catch (error) {
      console.error('Failed to migrate from preferences:', error);
    }

    return () => {
      try {
        if (shouldClearGlobalEnvStore) {
          const globalEnvStore = new Store({ name: 'global-environments' });
          globalEnvStore.clear();
        }
        if (shouldDeleteWorkspaceDocs) {
          preferencesStore.delete('preferences.defaultWorkspaceDocs');
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup after migration:', cleanupError);
      }
    };
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

  async recoverFromCorruptedWorkspace(oldWorkspacePath, newWorkspacePath, workspaceConfig) {
    if (!oldWorkspacePath || !fs.existsSync(oldWorkspacePath)) {
      return null;
    }

    const stats = fs.statSync(oldWorkspacePath);
    if (!stats.isDirectory()) {
      return null;
    }

    const recoveryResult = {
      collectionsRecovered: 0,
      specsRecovered: 0,
      environmentsRecovered: 0,
      docsRecovered: false
    };

    const oldToNewEnvUidMap = {};

    try {
      const oldWorkspaceYmlPath = path.join(oldWorkspacePath, 'workspace.yml');
      if (fs.existsSync(oldWorkspaceYmlPath)) {
        const yamlContent = fs.readFileSync(oldWorkspaceYmlPath, 'utf8');
        const oldConfig = yaml.load(yamlContent);

        if (oldConfig && typeof oldConfig === 'object') {
          if (Array.isArray(oldConfig.collections)) {
            const validCollections = oldConfig.collections.filter((c) => isValidCollectionEntry(c));
            if (validCollections.length > 0) {
              workspaceConfig.collections = validCollections;
              recoveryResult.collectionsRecovered = validCollections.length;
            }
          }

          if (Array.isArray(oldConfig.specs)) {
            const validSpecs = oldConfig.specs.filter((s) => isValidSpecEntry(s));
            if (validSpecs.length > 0) {
              workspaceConfig.specs = validSpecs;
              recoveryResult.specsRecovered = validSpecs.length;
            }
          }

          if (oldConfig.docs && typeof oldConfig.docs === 'string' && oldConfig.docs.trim()) {
            workspaceConfig.docs = oldConfig.docs;
            recoveryResult.docsRecovered = true;
          }
        }
      }
    } catch (error) {
      console.error('Failed to read workspace.yml during recovery:', error.message);
    }

    try {
      const oldEnvDir = path.join(oldWorkspacePath, 'environments');
      const newEnvDir = path.join(newWorkspacePath, 'environments');

      if (fs.existsSync(oldEnvDir) && fs.statSync(oldEnvDir).isDirectory()) {
        const entries = fs.readdirSync(oldEnvDir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith('.yml')) {
            continue;
          }

          const oldFilePath = path.join(oldEnvDir, entry.name);
          const newFilePath = path.join(newEnvDir, entry.name);

          try {
            const content = fs.readFileSync(oldFilePath, 'utf8');
            const parsed = yaml.load(content);

            if (!parsed || typeof parsed !== 'object') {
              console.warn(`Skipping invalid environment file: ${entry.name}`);
              continue;
            }

            if (!parsed.name && !parsed.variables) {
              console.warn(`Skipping non-environment file: ${entry.name}`);
              continue;
            }

            await writeFile(newFilePath, content);

            const oldUid = generateUidBasedOnHash(oldFilePath);
            const newUid = generateUidBasedOnHash(newFilePath);
            oldToNewEnvUidMap[oldUid] = newUid;

            recoveryResult.environmentsRecovered++;
          } catch (envError) {
            console.error(`Failed to recover environment "${entry.name}":`, envError.message);
          }
        }
      }
    } catch (error) {
      console.error('Failed to recover environments directory:', error.message);
    }

    try {
      const oldWorkspaceYmlPath = path.join(oldWorkspacePath, 'workspace.yml');
      if (fs.existsSync(oldWorkspaceYmlPath)) {
        const yamlContent = fs.readFileSync(oldWorkspaceYmlPath, 'utf8');
        const oldConfig = yaml.load(yamlContent);

        if (oldConfig?.activeEnvironmentUid && typeof oldConfig.activeEnvironmentUid === 'string') {
          const newUid = oldToNewEnvUidMap[oldConfig.activeEnvironmentUid];
          if (newUid) {
            workspaceConfig.activeEnvironmentUid = newUid;
          }
        }
      }
    } catch (error) {
      // Already logged above, silently skip active environment restoration
    }

    this.migrateEnvironmentSecrets(oldWorkspacePath, newWorkspacePath);
    return recoveryResult;
  }

  migrateEnvironmentSecrets(oldWorkspacePath, newWorkspacePath) {
    try {
      const Store = require('electron-store');
      const secretsStore = new Store({ name: 'secrets', clearInvalidConfig: true });
      const collections = secretsStore.get('collections') || [];

      const oldCollection = collections.find((c) => c.path === oldWorkspacePath);
      if (!oldCollection || !oldCollection.environments || oldCollection.environments.length === 0) {
        return;
      }

      const existingNewCollection = collections.find((c) => c.path === newWorkspacePath);
      if (existingNewCollection) {
        existingNewCollection.environments = [
          ...(existingNewCollection.environments || []),
          ...oldCollection.environments
        ];
      } else {
        collections.push({
          path: newWorkspacePath,
          environments: oldCollection.environments
        });
      }

      secretsStore.set('collections', collections);
    } catch (error) {
      console.error('Failed to migrate environment secrets:', error.message);
    }
  }
}

const defaultWorkspaceManager = new DefaultWorkspaceManager();

module.exports = {
  defaultWorkspaceManager,
  DefaultWorkspaceManager
};
