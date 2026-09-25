const fs = require('node:fs');
const path = require('node:path');
const { dialog, ipcMain } = require('electron');
const { normalizeAndResolvePath } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');
const { parseApiSpecContent, resolveExternalApiSpecRefs, getApiSpecDisplayName } = require('../utils/apiSpecs');
const {
  addApiSpecToWorkspace,
  findApiSpecEntry,
  hasWorkspaceFile,
  readWorkspaceConfig,
  getWorkspaceUid
} = require('../utils/workspace-config');

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

const INVALID_EXTENSION_MESSAGE
  = 'Invalid file format. Please select a valid OpenAPI spec in YAML or JSON format.';

const VALID_API_SPEC_EXTENSIONS = ['.yaml', '.yml', '.json'];

const validateApiSpec = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!VALID_API_SPEC_EXTENSIONS.includes(ext)) {
    throw new Error(INVALID_EXTENSION_MESSAGE);
  }
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

const broadcastWorkspaceConfig = (win, workspacePath, config) => {
  const workspaceUid = getWorkspaceUid(workspacePath);
  const configForClient = prepareWorkspaceConfigForClient(config, workspaceUid === 'default');
  win.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, configForClient);
};

const openApiSpecDialog = async (win, watcher, options = {}) => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'createFile'],
    filters: [{ name: 'OpenAPI Spec', extensions: ['yaml', 'yml', 'json'] }]
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
    validateApiSpec(apiSpecPath);

    const uid = generateUidBasedOnHash(apiSpecPath);
    const rawContent = fs.readFileSync(apiSpecPath, 'utf8');
    const extension = path.extname(apiSpecPath);
    const apiSpecContent = parseApiSpecContent(rawContent, extension);
    const specName = getApiSpecDisplayName(apiSpecContent, apiSpecPath);

    if (hasWorkspaceFile(options.workspacePath) && !findApiSpecEntry(options.workspacePath, apiSpecPath)) {
      await addApiSpecToWorkspace(options.workspacePath, {
        name: specName,
        path: apiSpecPath
      });
      broadcastWorkspaceConfig(win, options.workspacePath, readWorkspaceConfig(options.workspacePath));
    }

    if (!watcher.hasWatcher(apiSpecPath)) {
      ipcMain.emit('main:apispec-opened', win, apiSpecPath, uid, options.workspacePath);
    } else {
      const { resolvedJson } = await resolveExternalApiSpecRefs(apiSpecContent, apiSpecPath);

      win.webContents.send('main:apispec-tree-updated', 'addFile', {
        pathname: apiSpecPath,
        uid: uid,
        raw: rawContent,
        name: specName,
        filename: path.basename(apiSpecPath),
        json: apiSpecContent,
        resolvedJson: resolvedJson
      });
    }
  } catch (err) {
    if (!options.dontSendDisplayErrors) {
      win.webContents.send('main:display-error', {
        message: err.message || 'An error occurred while opening the apiSpec'
      });
    }
  }
};

module.exports = {
  openApiSpec,
  openApiSpecDialog,
  validateApiSpec,
  broadcastWorkspaceConfig,
  INVALID_EXTENSION_MESSAGE
};
