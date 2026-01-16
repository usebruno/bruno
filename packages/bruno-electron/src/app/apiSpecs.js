const fs = require('fs');
const path = require('path');
const { dialog, ipcMain } = require('electron');
const { normalizeAndResolvePath } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');
const {
  addApiSpecToWorkspace,
  readWorkspaceConfig,
  getWorkspaceUid
} = require('../utils/workspace-config');

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

const normalizeWorkspaceConfig = (config) => {
  return {
    ...config,
    name: config.info?.name,
    type: config.info?.type,
    collections: config.collections || [],
    apiSpecs: config.specs || []
  };
};

const prepareWorkspaceConfigForClient = (workspaceConfig, isDefault) => {
  if (isDefault) {
    return {
      ...workspaceConfig,
      name: DEFAULT_WORKSPACE_NAME,
      type: 'default'
    };
  }
  return workspaceConfig;
};

const openApiSpecDialog = async (win, watcher, options = {}) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'createFile']
  });

  if (filePaths && filePaths[0]) {
    const resolvedPath = normalizeAndResolvePath(filePaths[0]);
    try {
      await openApiSpec(win, watcher, resolvedPath, options);
    } catch (err) {
      console.error(`[ERROR] Cannot open API spec: "${resolvedPath}"`);
    }
  }
};

const openApiSpec = async (win, watcher, apiSpecPath, options = {}) => {
  try {
    const uid = generateUidBasedOnHash(apiSpecPath);

    if (options.workspacePath) {
      const workspaceFilePath = path.join(options.workspacePath, 'workspace.yml');

      if (fs.existsSync(workspaceFilePath)) {
        const workspaceConfig = readWorkspaceConfig(options.workspacePath);
        const specs = workspaceConfig.specs || [];

        const specName = path.basename(apiSpecPath, path.extname(apiSpecPath));

        const existingSpec = specs.find((a) => {
          if (!a.path) return false;
          const existingPath = path.isAbsolute(a.path)
            ? a.path
            : path.resolve(options.workspacePath, a.path);
          return existingPath === apiSpecPath || a.name === specName;
        });

        if (!existingSpec) {
          await addApiSpecToWorkspace(options.workspacePath, {
            name: specName,
            path: apiSpecPath
          });

          const updatedConfig = readWorkspaceConfig(options.workspacePath);
          const normalizedConfig = normalizeWorkspaceConfig(updatedConfig);
          const workspaceUid = getWorkspaceUid(options.workspacePath);
          const isDefault = workspaceUid === 'default';
          const configForClient = prepareWorkspaceConfigForClient(normalizedConfig, isDefault);
          win.webContents.send('main:workspace-config-updated', options.workspacePath, workspaceUid, configForClient);
        }
      }
    }

    if (!watcher.hasWatcher(apiSpecPath)) {
      ipcMain.emit('main:apispec-opened', win, apiSpecPath, uid, options.workspacePath);
    } else {
      win.webContents.send('main:apispec-tree-updated', 'addFile', {
        pathname: apiSpecPath,
        uid: uid,
        raw: require('fs').readFileSync(apiSpecPath, 'utf8'),
        name: require('path').basename(apiSpecPath, require('path').extname(apiSpecPath)),
        filename: require('path').basename(apiSpecPath),
        json: (() => {
          const ext = require('path').extname(apiSpecPath).toLowerCase();
          const content = require('fs').readFileSync(apiSpecPath, 'utf8');
          if (ext === '.yaml' || ext === '.yml') {
            return require('js-yaml').load(content);
          } else if (ext === '.json') {
            return JSON.parse(content);
          }
          return null;
        })()
      });
    }
  } catch (err) {
    if (!options.dontSendDisplayErrors) {
      win.webContents.send('main:display-error', {
        error: err.message || 'An error occurred while opening the apiSpec'
      });
    }
  }
};

module.exports = {
  openApiSpec,
  openApiSpecDialog
};
