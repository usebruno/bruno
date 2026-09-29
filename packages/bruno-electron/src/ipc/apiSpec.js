const { ipcMain } = require('electron');
const { openApiSpecDialog, openApiSpec, validateApiSpec, broadcastWorkspaceConfig } = require('../app/apiSpecs');
const { writeFile, isDirectory } = require('../utils/filesystem');
const { removeApiSpecUid } = require('../cache/apiSpecUids');
const {
  removeApiSpecFromWorkspace,
  findApiSpecEntry,
  hasWorkspaceFile
} = require('../utils/workspace-config');
const { getCertsAndProxyConfig } = require('./network/cert-utils');
const { makeAxiosInstance } = require('./network/axios-instance');
const { proxySwaggerFetch } = require('./swagger-fetch');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const path = require('path');
const fs = require('fs');

const isOpenedWorkspace = (lastOpenedWorkspaces, workspacePath) => {
  if (typeof workspacePath !== 'string' || !workspacePath) {
    return false;
  }

  const target = path.normalize(workspacePath);

  return [defaultWorkspaceManager.getDefaultWorkspacePath(), ...lastOpenedWorkspaces.getAll()]
    .filter(Boolean)
    .some((openedPath) => path.normalize(openedPath) === target);
};

// Delete takes a file path from the renderer, so it only acts on a spec listed by a workspace
// the user has open. A running watcher is not enough: any path with a spec extension can be watched.
const assertKnownApiSpec = ({ lastOpenedWorkspaces }, pathname, workspacePath) => {
  if (typeof pathname !== 'string' || !pathname) {
    throw new Error('API spec path is required');
  }
  validateApiSpec(pathname);

  if (!isOpenedWorkspace(lastOpenedWorkspaces, workspacePath) || !hasWorkspaceFile(workspacePath)) {
    throw new Error(`workspace: ${workspacePath} is not an open workspace`);
  }

  if (!findApiSpecEntry(workspacePath, pathname)) {
    throw new Error(`api spec: ${pathname} is not listed in this workspace`);
  }
};

const toDeleteError = (error) => {
  if (error.code === 'EBUSY') {
    return new Error('The file is in use by another program. Close it and try again.');
  }
  if (error.code === 'EPERM' || error.code === 'EACCES') {
    return new Error('Bruno does not have permission to delete this file.');
  }
  return error;
};

// The file goes first: if it cannot be deleted, the workspace is untouched. If the entry removal
// fails after that, the entry points at a missing file and a retry of Delete completes it.
// The watcher and uid cache are keyed by the path as it was opened, so they get the raw path.
const deleteApiSpec = async (deps, pathname, workspacePath) => {
  assertKnownApiSpec(deps, pathname, workspacePath);
  const { mainWindow, watcher } = deps;
  const target = path.normalize(pathname);

  try {
    await fs.promises.rm(target, { force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    throw toDeleteError(error);
  }

  watcher.removeWatcher(pathname, mainWindow);
  removeApiSpecUid(pathname);

  const { updatedConfig } = await removeApiSpecFromWorkspace(workspacePath, target);
  broadcastWorkspaceConfig(mainWindow, workspacePath, updatedConfig);
};

const registerRendererEventHandlers = (mainWindow, watcher, lastOpenedApiSpecs) => {
  const deps = { mainWindow, watcher, lastOpenedWorkspaces: new LastOpenedWorkspaces() };

  ipcMain.handle('renderer:open-api-spec', (event, workspacePath = null) => {
    if (watcher && mainWindow) {
      return openApiSpecDialog(mainWindow, watcher, { workspacePath });
    }

    return null;
  });

  ipcMain.handle('renderer:open-api-spec-file', (event, apiSpecPath, workspacePath = null) => {
    if (watcher && mainWindow) {
      openApiSpec(mainWindow, watcher, apiSpecPath, { workspacePath });
    }
  });

  ipcMain.handle('renderer:save-api-spec', async (event, pathname, content) => {
    try {
      await writeFile(pathname, content);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:create-api-spec', async (event, apiSpecName, apiSpecLocation, content = '', workspacePath = null) => {
    try {
      if (typeof apiSpecName !== 'string' || apiSpecName !== path.basename(apiSpecName)) {
        throw new Error(`api spec: ${apiSpecName} is not a valid filename`);
      }
      validateApiSpec(apiSpecName);

      if (typeof apiSpecLocation !== 'string' || !isDirectory(apiSpecLocation)) {
        throw new Error(`path: ${apiSpecLocation} is not an existing directory`);
      }

      let pathname = path.join(apiSpecLocation, apiSpecName);
      if (fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} already exists`);
      }
      await writeFile(pathname, content);
      await openApiSpec(mainWindow, watcher, pathname, { workspacePath });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:remove-api-spec', async (event, pathname, workspacePath = null) => {
    try {
      if (watcher && mainWindow) {
        watcher.removeWatcher(pathname, mainWindow);
        removeApiSpecUid(pathname);

        if (hasWorkspaceFile(workspacePath)) {
          await removeApiSpecFromWorkspace(workspacePath, pathname);
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:delete-api-spec', (event, pathname, workspacePath) =>
    deleteApiSpec(deps, pathname, workspacePath));

  ipcMain.handle('renderer:fetch-api-spec', async (event, url) => {
    try {
      // Use a proxy-aware axios instance so that the user's configured proxy
      const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions }
        = await getCertsAndProxyConfig({
          collectionUid: null,
          collection: { promptVariables: {} },
          request: {},
          envVars: {},
          runtimeVariables: {},
          processEnvVars: {},
          collectionPath: '',
          globalEnvironmentVariables: {}
        });

      const axiosInstance = makeAxiosInstance({ proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions });
      const response = await axiosInstance.get(url, {
        timeout: 30000,
        transformResponse: [(data) => data]
      });
      return response.data;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:swagger-fetch', async (event, req) => {
    return proxySwaggerFetch(req);
  });

  ipcMain.handle('renderer:ensure-apispec-folder', async (event, workspacePath) => {
    try {
      const apiSpecPath = path.join(workspacePath, 'apispec');
      if (!fs.existsSync(apiSpecPath)) {
        fs.mkdirSync(apiSpecPath, { recursive: true });
      }
      return apiSpecPath;
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

const registerMainEventHandlers = (mainWindow, watcher, lastOpenedApiSpecs) => {
  ipcMain.handle('main:open-api-spec', () => {
    if (watcher && mainWindow) {
      openApiSpecDialog(mainWindow, watcher);
    }
  });
  ipcMain.on('main:apispec-opened', (win, pathname, uid, workspacePath = null) => {
    watcher.addWatcher(win, pathname, uid, {}, workspacePath);
  });
};

const registerApiSpecIpc = (mainWindow, watcher, lastOpenedApiSpecs) => {
  registerRendererEventHandlers(mainWindow, watcher, lastOpenedApiSpecs);
  registerMainEventHandlers(mainWindow, watcher, lastOpenedApiSpecs);
};

module.exports = registerApiSpecIpc;
