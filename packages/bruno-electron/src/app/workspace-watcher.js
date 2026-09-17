const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const yaml = require('js-yaml');
const { generateUidBasedOnHash, uuid } = require('../utils/common');
const { getWorkspaceUid, normalizeWorkspaceConfig } = require('../utils/workspace-config');
const { parseEnvironment } = require('@usebruno/filestore');
const { parseValueByDataType } = require('@usebruno/common/utils');
const EnvironmentSecretsStore = require('../store/env-secrets');
const { decryptStringSafe } = require('../utils/encryption');
const dotEnvWatcher = require('./dotenv-watcher');
const {
  getMocksDirPath,
  getMockServerFromFile,
  getMockServerUid,
  invalidateMockServerFile,
  removeMockServerFileFromCache
} = require('./mock-server/mock-server-store');

const environmentSecretsStore = new EnvironmentSecretsStore();

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

const envHasSecrets = (environment) => {
  const secrets = _.filter(environment.variables, (v) => v.secret === true);
  return secrets && secrets.length > 0;
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
      const variable = _.find(file.data.variables, (v) => v.name === secret.name && v.secret);
      if (variable && secret.value) {
        const decryptionResult = decryptStringSafe(secret.value);
        variable.value = parseValueByDataType(decryptionResult.value, variable.dataType);
      }
    });
  }

  return file;
};

const handleGlobalEnvironmentFileAdd = async (win, pathname, workspacePath, workspaceUid) => {
  try {
    const file = await parseGlobalEnvironmentFile(pathname, workspacePath, workspaceUid);
    win.webContents.send('main:workspace-environment-added', workspaceUid, file);
  } catch (error) {
    console.error('Error handling global environment file add:', error);
  }
};

const handleGlobalEnvironmentFileChange = async (win, pathname, workspacePath, workspaceUid) => {
  try {
    const file = await parseGlobalEnvironmentFile(pathname, workspacePath, workspaceUid);
    win.webContents.send('main:workspace-environment-changed', workspaceUid, file);
  } catch (error) {
    console.error('Error handling global environment file change:', error);
  }
};

const handleGlobalEnvironmentFileUnlink = async (win, pathname, workspaceUid) => {
  try {
    const environmentUid = generateUidBasedOnHash(pathname);
    win.webContents.send('main:workspace-environment-deleted', workspaceUid, environmentUid);
  } catch (error) {
    console.error('Error handling global environment file unlink:', error);
  }
};

const handleMockServerFileAddOrChange = (win, pathname, workspaceUid, channel) => {
  if (win.isDestroyed()) {
    return;
  }

  try {
    invalidateMockServerFile(pathname);
    const mockServerFile = getMockServerFromFile(pathname, workspaceUid);
    win.webContents.send(channel, workspaceUid, mockServerFile);
  } catch (error) {
    console.error('Error handling mock server file change:', error);
  }
};

const handleMockServerFileUnlink = (win, pathname, workspaceUid) => {
  if (win.isDestroyed()) {
    return;
  }

  try {
    removeMockServerFileFromCache(pathname);
    win.webContents.send('main:workspace-mock-server-deleted', workspaceUid, getMockServerUid(pathname));
  } catch (error) {
    console.error('Error handling mock server file unlink:', error);
  }
};

class WorkspaceWatcher {
  constructor() {
    this.watchers = {};
    this.environmentWatchers = {};
    this.mockServerWatchers = {};
  }

  _closeMockServerWatcher(workspacePath) {
    if (this.mockServerWatchers[workspacePath]) {
      this.mockServerWatchers[workspacePath].close();
      delete this.mockServerWatchers[workspacePath];
    }
  }

  _addMockServerWatcher(win, workspacePath, workspaceUid) {
    const mocksDir = getMocksDirPath(workspacePath);
    const self = this;

    this._closeMockServerWatcher(workspacePath);

    if (!fs.existsSync(mocksDir)) {
      const dirWatcher = chokidar.watch(mocksDir, {
        ignoreInitial: false,
        persistent: true,
        ignorePermissionErrors: true,
        depth: 0
      });

      dirWatcher.on('addDir', () => {
        dirWatcher.close();
        self._addMockServerWatcher(win, workspacePath, workspaceUid);
      });

      this.mockServerWatchers[workspacePath] = dirWatcher;
      return;
    }

    const mockServerWatcher = chokidar.watch(path.join(mocksDir, '*.yml'), {
      ignoreInitial: true,
      persistent: true,
      ignorePermissionErrors: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 10
      }
    });

    mockServerWatcher.on('add', (pathname) => {
      handleMockServerFileAddOrChange(win, pathname, workspaceUid, 'main:workspace-mock-server-added');
    });

    mockServerWatcher.on('change', (pathname) => {
      handleMockServerFileAddOrChange(win, pathname, workspaceUid, 'main:workspace-mock-server-changed');
    });

    mockServerWatcher.on('unlink', (pathname) => {
      handleMockServerFileUnlink(win, pathname, workspaceUid);
    });

    this.mockServerWatchers[workspacePath] = mockServerWatcher;
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
    this._closeMockServerWatcher(workspacePath);

    const self = this;
    setTimeout(() => {
      if (win.isDestroyed()) {
        return;
      }

      const watcher = chokidar.watch(workspaceFilePath, {
        ignoreInitial: true,
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        }
      });

      watcher.on('change', () => handleWorkspaceFileChange(win, workspacePath));

      self.watchers[workspacePath] = watcher;

      dotEnvWatcher.addWorkspaceWatcher(win, workspacePath, workspaceUid);
      self._addMockServerWatcher(win, workspacePath, workspaceUid);

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
      this._closeMockServerWatcher(workspacePath);
      dotEnvWatcher.removeWorkspaceWatcher(workspacePath);
    } catch (error) {
      console.error('Error removing workspace watcher:', error);
    }
  }

  hasWatcher(workspacePath) {
    return Boolean(this.watchers[workspacePath]);
  }

  closeAllWatchers() {
    const pending = [];
    const collect = (watcher) => {
      try {
        const result = watcher?.close();
        if (result && typeof result.then === 'function') pending.push(result);
      } catch (err) {}
    };

    for (const [watchPath, watcher] of Object.entries(this.watchers)) collect(watcher);
    this.watchers = {};

    for (const [watchPath, watcher] of Object.entries(this.environmentWatchers)) collect(watcher);
    this.environmentWatchers = {};

    for (const workspacePath of Object.keys(this.mockServerWatchers)) {
      this._closeMockServerWatcher(workspacePath);
    }

    const dotEnvResult = dotEnvWatcher.closeAll();
    if (dotEnvResult && typeof dotEnvResult.then === 'function') pending.push(dotEnvResult);

    return Promise.allSettled(pending);
  }
}

module.exports = WorkspaceWatcher;
