const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { generateUidBasedOnHash } = require('../utils/common');
const { writeFile, isValidCollectionDirectory } = require('../utils/filesystem');
const { getPreferences, savePreferences } = require('./preferences');
const { globalEnvironmentsStore } = require('./global-environments');
const {
  generateYamlContent,
  readWorkspaceConfig,
  validateWorkspaceConfig,
  isValidCollectionEntry
} = require('../utils/workspace-config');

const OPENCOLLECTION_VERSION = '1.0.0';
const WORKSPACE_TYPE = 'workspace';
const DEFAULT_WORKSPACE_UID = 'default';
const MAX_WORKSPACE_CREATION_ATTEMPTS = 20;
const GLOBAL_ENV_BACKUP_FILE = 'global-environments-backup.json';

class DefaultWorkspaceManager {
  constructor() {
    this.defaultWorkspacePath = null;
    this.initializationPromise = null;
  }

  /**
   * Finds all existing default workspace directories sorted by number (latest first)
   */
  findExistingDefaultWorkspaces() {
    const configDir = app.getPath('userData');
    const baseWorkspacePath = path.join(configDir, 'default-workspace');
    const workspaces = [];

    // Check base path
    if (fs.existsSync(baseWorkspacePath)) {
      workspaces.push({ path: baseWorkspacePath, index: 0 });
    }

    // Check numbered paths
    for (let i = 1; i < MAX_WORKSPACE_CREATION_ATTEMPTS; i++) {
      const numberedPath = `${baseWorkspacePath}-${i}`;
      if (fs.existsSync(numberedPath)) {
        workspaces.push({ path: numberedPath, index: i });
      }
    }

    // Sort by index descending (latest first)
    return workspaces.sort((a, b) => b.index - a.index).map((w) => w.path);
  }

  /**
   * Finds the latest valid default workspace from existing directories
   */
  findLatestValidWorkspace() {
    const workspaces = this.findExistingDefaultWorkspaces();
    for (const workspacePath of workspaces) {
      if (this.isValidDefaultWorkspace(workspacePath)) {
        return workspacePath;
      }
    }
    return null;
  }

  /**
   * Recovers collections and environments from an existing workspace directory
   */
  recoverDataFromWorkspace(workspacePath) {
    const recovered = { collections: [], environments: [], activeEnvironmentUid: null };

    try {
      // Try to read workspace config for collections
      const config = readWorkspaceConfig(workspacePath);
      if (config.collections && Array.isArray(config.collections)) {
        recovered.collections = config.collections.filter((c) => {
          if (!isValidCollectionEntry(c)) return false;
          const collectionPath = path.isAbsolute(c.path) ? c.path : path.resolve(workspacePath, c.path);
          return isValidCollectionDirectory(collectionPath);
        });
      }
      if (config.activeEnvironmentUid) {
        recovered.activeEnvironmentUid = config.activeEnvironmentUid;
      }
    } catch (error) {
      console.error('Failed to read workspace config during recovery:', error);
    }

    // Try to read environments from workspace environments directory
    const envDir = path.join(workspacePath, 'environments');
    if (fs.existsSync(envDir)) {
      try {
        const envFiles = fs.readdirSync(envDir).filter((f) => f.endsWith('.yml'));
        for (const file of envFiles) {
          const envPath = path.join(envDir, file);
          recovered.environments.push({ path: envPath, name: path.basename(file, '.yml') });
        }
      } catch (error) {
        console.error('Failed to read environments during recovery:', error);
      }
    }

    return recovered;
  }

  /**
   * Backs up global environments to filesystem
   */
  backupGlobalEnvironments() {
    try {
      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const activeUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();

      if (globalEnvironments && globalEnvironments.length > 0) {
        const configDir = app.getPath('userData');
        const backupPath = path.join(configDir, GLOBAL_ENV_BACKUP_FILE);
        const backup = {
          environments: globalEnvironments,
          activeGlobalEnvironmentUid: activeUid,
          backupDate: new Date().toISOString()
        };
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
      }
    } catch (error) {
      console.error('Failed to backup global environments:', error);
    }
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
    try {
      await savePreferences(preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }

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

    // Case 1: Valid workspace exists at stored path
    if (this.isValidDefaultWorkspace(existingPath)) {
      this.defaultWorkspacePath = existingPath;
      return {
        workspacePath: existingPath,
        workspaceUid: this.getDefaultWorkspaceUid()
      };
    }

    this.initializationPromise = (async () => {
      try {
        // Case 2: No path in preferences - check for existing default workspaces
        if (!existingPath) {
          const latestValid = this.findLatestValidWorkspace();
          if (latestValid) {
            await this.setDefaultWorkspacePath(latestValid);
            return { workspacePath: latestValid, workspaceUid: this.getDefaultWorkspaceUid() };
          }
        }

        // Case 3: Path exists but workspace is broken - try recovery
        const hasExistingPath = existingPath && fs.existsSync(existingPath);
        const recoverySource = hasExistingPath ? existingPath : this.findExistingDefaultWorkspaces()[0];
        const recoveredData = recoverySource ? this.recoverDataFromWorkspace(recoverySource) : null;

        const shouldMigrate = this.needsMigration();
        const newWorkspacePath = await this.initializeDefaultWorkspace({
          migrateFromPreferences: shouldMigrate,
          recoveredData
        });

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
    const { migrateFromPreferences = true, recoveredData = null } = options;

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
        name: 'My Workspace',
        type: WORKSPACE_TYPE
      },
      collections: [],
      specs: [],
      docs: ''
    };

    // Copy recovered environments to new workspace
    if (recoveredData?.environments?.length > 0) {
      const envDir = path.join(workspacePath, 'environments');
      for (const env of recoveredData.environments) {
        try {
          const destPath = path.join(envDir, `${env.name}.yml`);
          if (fs.existsSync(env.path)) {
            fs.copyFileSync(env.path, destPath);
          }
        } catch (error) {
          console.error('Failed to copy environment:', env.name, error);
        }
      }
      if (recoveredData.activeEnvironmentUid) {
        workspaceConfig.activeEnvironmentUid = recoveredData.activeEnvironmentUid;
      }
    }

    // Apply recovered collections first (lower priority)
    if (recoveredData?.collections?.length > 0) {
      workspaceConfig.collections = recoveredData.collections;
    }

    if (migrateFromPreferences) {
      await this.migrateFromPreferences(workspacePath, workspaceConfig);
    }

    const yamlContent = generateYamlContent(workspaceConfig);
    await writeFile(path.join(workspacePath, 'workspace.yml'), yamlContent);

    await this.setDefaultWorkspacePath(workspacePath);

    return workspacePath;
  }

  async migrateFromPreferences(workspacePath, workspaceConfig) {
    const Store = require('electron-store');
    const preferencesStore = new Store({ name: 'preferences' });

    try {
      const lastOpenedCollections = preferencesStore.get('lastOpenedCollections', []);

      if (lastOpenedCollections && lastOpenedCollections.length > 0) {
        // Build set of existing paths from recovered collections
        const existingPaths = new Set(
          (workspaceConfig.collections || []).map((c) => {
            const collPath = path.isAbsolute(c.path) ? c.path : path.resolve(workspacePath, c.path);
            return path.normalize(collPath);
          })
        );

        const collections = lastOpenedCollections
          .map((collectionPath) => {
            if (!collectionPath || typeof collectionPath !== 'string') {
              return null;
            }
            const absolutePath = path.resolve(collectionPath);
            const normalizedPath = path.normalize(absolutePath);

            if (existingPaths.has(normalizedPath)) {
              return null;
            }
            existingPaths.add(normalizedPath);

            if (!isValidCollectionDirectory(absolutePath)) {
              return null;
            }

            return { path: absolutePath, name: path.basename(absolutePath) };
          })
          .filter((collection) => isValidCollectionEntry(collection));

        // Merge: preference collections come after recovered ones
        workspaceConfig.collections = [...(workspaceConfig.collections || []), ...collections];
      }

      // Backup global environments before migrating
      this.backupGlobalEnvironments();

      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      const activeGlobalEnvironmentUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();

      if (globalEnvironments && globalEnvironments.length > 0) {
        const { stringifyEnvironment } = require('@usebruno/filestore');
        const environmentsDir = path.join(workspacePath, 'environments');

        // Get existing environment names to avoid overwriting recovered ones
        let existingEnvNames = [];
        if (fs.existsSync(environmentsDir)) {
          try {
            existingEnvNames = fs.readdirSync(environmentsDir)
              .filter((f) => f.endsWith('.yml'))
              .map((f) => f.replace('.yml', ''));
          } catch (error) {
            console.error('Failed to read environments directory:', error);
          }
        }
        const existingEnvs = new Set(existingEnvNames);

        for (const env of globalEnvironments) {
          if (!env || !env.name || typeof env.name !== 'string') {
            continue;
          }

          // Skip if environment already exists from recovery
          if (existingEnvs.has(env.name)) {
            continue;
          }

          const envFilePath = path.join(environmentsDir, `${env.name}.yml`);
          const environment = { name: env.name, variables: env.variables || [] };
          const content = stringifyEnvironment(environment, { format: 'yml' });
          await writeFile(envFilePath, content);

          if (env.uid === activeGlobalEnvironmentUid && !workspaceConfig.activeEnvironmentUid) {
            workspaceConfig.activeEnvironmentUid = generateUidBasedOnHash(envFilePath);
          }
        }
      }

      const defaultWorkspaceDocs = preferencesStore.get('preferences.defaultWorkspaceDocs', '');
      if (defaultWorkspaceDocs && !workspaceConfig.docs) {
        workspaceConfig.docs = defaultWorkspaceDocs;
      }
    } catch (error) {
      console.error('Failed to migrate from preferences:', error);
    }
  }

  needsMigration() {
    const workspacePath = this.getDefaultWorkspacePath();
    // Only skip migration if workspace is valid, not just if it exists
    if (workspacePath && this.isValidDefaultWorkspace(workspacePath)) {
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
