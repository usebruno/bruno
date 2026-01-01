const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const yaml = require('js-yaml');
const { generateUidBasedOnHash, uuid } = require('../utils/common');
const { getWorkspaceUid } = require('../utils/workspace-config');
const { parseEnvironment } = require('@usebruno/filestore');
const EnvironmentSecretsStore = require('../store/env-secrets');
const { decryptStringSafe } = require('../utils/encryption');

const environmentSecretsStore = new EnvironmentSecretsStore();

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

const envHasSecrets = (environment) => {
  const secrets = _.filter(environment.variables, (v) => v.secret === true);
  return secrets && secrets.length > 0;
};

const normalizeWorkspaceConfig = (config) => {
  return {
    ...config,
    name: config.info?.name,
    type: config.info?.type,
    collections: config.collections || [],
    apiSpecs: config.specs || []
  };
};

const handleWorkspaceFileChange = (win, workspacePath) => {
  try {
    const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

    if (!fs.existsSync(workspaceFilePath)) {
      return;
    }

    const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
    const rawConfig = yaml.load(yamlContent);
    const workspaceConfig = normalizeWorkspaceConfig(rawConfig);

    const type = workspaceConfig.info?.type || workspaceConfig.type;
    if (type !== 'workspace') {
      return;
    }

    const workspaceUid = getWorkspaceUid(workspacePath);
    const isDefault = workspaceUid === 'default';

    win.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, {
      ...workspaceConfig,
      name: isDefault ? DEFAULT_WORKSPACE_NAME : workspaceConfig.name,
      type: isDefault ? 'default' : workspaceConfig.type
    });
  } catch (error) {
    console.error('Error handling workspace file change:', error);
  }
};

const parseGlobalEnvironmentFile = async (pathname, workspacePath, workspaceUid) => {
  const basename = path.basename(pathname);
  const environmentName = basename.slice(0, -'.yml'.length);

  const file = {
    meta: {
      workspaceUid,
      pathname,
      name: basename
    }
  };

  const content = fs.readFileSync(pathname, 'utf8');
  file.data = await parseEnvironment(content, { format: 'yml' });
  file.data.name = environmentName;
  file.data.uid = generateUidBasedOnHash(pathname);

  _.each(_.get(file, 'data.variables', []), (variable) => {
    if (!variable.uid) {
      variable.uid = uuid();
    }
  });

  if (envHasSecrets(file.data)) {
    const envSecrets = environmentSecretsStore.getEnvSecrets(workspacePath, file.data);
    _.each(envSecrets, (secret) => {
      const variable = _.find(file.data.variables, (v) => v.name === secret.name);
      if (variable && secret.value) {
        const decryptionResult = decryptStringSafe(secret.value);
        variable.value = decryptionResult.value;
      }
    });
  }

  return file;
};

const handleGlobalEnvironmentFileAdd = async (win, pathname, workspacePath, workspaceUid) => {
  try {
    const file = await parseGlobalEnvironmentFile(pathname, workspacePath, workspaceUid);
    win.webContents.send('main:global-environment-added', workspaceUid, file);
  } catch (error) {
    console.error('Error handling global environment file add:', error);
  }
};

const handleGlobalEnvironmentFileChange = async (win, pathname, workspacePath, workspaceUid) => {
  try {
    const file = await parseGlobalEnvironmentFile(pathname, workspacePath, workspaceUid);
    win.webContents.send('main:global-environment-changed', workspaceUid, file);
  } catch (error) {
    console.error('Error handling global environment file change:', error);
  }
};

const handleGlobalEnvironmentFileUnlink = async (win, pathname, workspaceUid) => {
  try {
    const environmentUid = generateUidBasedOnHash(pathname);
    win.webContents.send('main:global-environment-deleted', workspaceUid, environmentUid);
  } catch (error) {
    console.error('Error handling global environment file unlink:', error);
  }
};

class WorkspaceWatcher {
  constructor() {
    this.watchers = {};
    this.environmentWatchers = {};
  }

  addWatcher(win, workspacePath) {
    const workspaceFilePath = path.join(workspacePath, 'workspace.yml');
    const environmentsDir = path.join(workspacePath, 'environments');
    const workspaceUid = getWorkspaceUid(workspacePath);

    if (this.watchers[workspacePath]) {
      this.watchers[workspacePath].close();
    }
    if (this.environmentWatchers[workspacePath]) {
      this.environmentWatchers[workspacePath].close();
    }

    const self = this;
    setTimeout(() => {
      if (win.isDestroyed()) {
        return;
      }

      const watcher = chokidar.watch(workspaceFilePath, {
        ignoreInitial: false,
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        }
      });

      watcher.on('change', () => handleWorkspaceFileChange(win, workspacePath));
      watcher.on('add', () => handleWorkspaceFileChange(win, workspacePath));

      self.watchers[workspacePath] = watcher;

      if (fs.existsSync(environmentsDir)) {
        const envWatcher = chokidar.watch(path.join(environmentsDir, `*.yml`), {
          ignoreInitial: true,
          persistent: true,
          ignorePermissionErrors: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 10
          }
        });

        envWatcher.on('add', (pathname) => {
          handleGlobalEnvironmentFileAdd(win, pathname, workspacePath, workspaceUid);
        });

        envWatcher.on('change', (pathname) => {
          handleGlobalEnvironmentFileChange(win, pathname, workspacePath, workspaceUid);
        });

        envWatcher.on('unlink', (pathname) => {
          handleGlobalEnvironmentFileUnlink(win, pathname, workspaceUid);
        });

        self.environmentWatchers[workspacePath] = envWatcher;
      } else {
        const dirWatcher = chokidar.watch(environmentsDir, {
          ignoreInitial: false,
          persistent: true,
          ignorePermissionErrors: true,
          depth: 0
        });

        dirWatcher.on('addDir', () => {
          dirWatcher.close();
          self.addWatcher(win, workspacePath);
        });

        self.environmentWatchers[workspacePath] = dirWatcher;
      }
    }, 100);
  }

  removeWatcher(workspacePath) {
    try {
      if (this.watchers[workspacePath]) {
        this.watchers[workspacePath].close();
        delete this.watchers[workspacePath];
      }
      if (this.environmentWatchers[workspacePath]) {
        this.environmentWatchers[workspacePath].close();
        delete this.environmentWatchers[workspacePath];
      }
    } catch (error) {
      console.error('Error removing workspace watcher:', error);
    }
  }

  hasWatcher(workspacePath) {
    return Boolean(this.watchers[workspacePath]);
  }
}

module.exports = WorkspaceWatcher;
