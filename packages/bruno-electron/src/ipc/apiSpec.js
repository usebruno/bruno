const { ipcMain } = require('electron');
const { utils } = require('@usebruno/common');
const { openApiSpecDialog, openApiSpec, validateApiSpec } = require('../app/apiSpecs');
const { writeFile, isDirectory, sanitizeName, validateName } = require('../utils/filesystem');
const { removeApiSpecUid } = require('../cache/apiSpecUids');
const {
  addApiSpecToWorkspace,
  removeApiSpecFromWorkspace,
  renameApiSpecInWorkspace,
  assertWritableApiSpecName,
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

const MAX_FILENAME_LENGTH = 255;

const isOpenedWorkspace = (lastOpenedWorkspaces, workspacePath) => {
  if (typeof workspacePath !== 'string' || !workspacePath) {
    return false;
  }

  const target = path.normalize(workspacePath);

  return [defaultWorkspaceManager.getDefaultWorkspacePath(), ...lastOpenedWorkspaces.getAll()]
    .filter(Boolean)
    .some((openedPath) => path.normalize(openedPath) === target);
};

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

const renameApiSpec = async (deps, pathname, newName, workspacePath) => {
  assertKnownApiSpec(deps, pathname, workspacePath);
  await renameApiSpecInWorkspace(workspacePath, pathname, newName);
};

const cloneApiSpec = async (deps, sourcePathname, newName, targetLocation, workspacePath) => {
  const { mainWindow, watcher } = deps;
  const trimmedName = assertWritableApiSpecName(newName);
  const filename = sanitizeName(trimmedName);
  if (!filename || !validateName(filename)) {
    throw new Error(utils.validateNameError(filename));
  }
  const extension = path.extname(sourcePathname);
  if (filename.length + extension.length > MAX_FILENAME_LENGTH) {
    throw new Error(`API spec name must be at most ${MAX_FILENAME_LENGTH - extension.length} characters`);
  }
  const targetFilename = `${filename}${extension}`;

  assertKnownApiSpec(deps, sourcePathname, workspacePath);
  if (!fs.statSync(sourcePathname, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`api spec: ${sourcePathname} does not exist`);
  }

  if (typeof targetLocation !== 'string' || !isDirectory(targetLocation)) {
    throw new Error(`path: ${targetLocation} is not an existing directory`);
  }

  const targetPathname = path.join(targetLocation, targetFilename);
  if (fs.existsSync(targetPathname)) {
    throw new Error(`path: ${targetPathname} already exists`);
  }

  await fs.promises.copyFile(sourcePathname, targetPathname, fs.constants.COPYFILE_EXCL);

  try {
    await addApiSpecToWorkspace(workspacePath, { name: trimmedName, path: targetPathname });
  } catch (error) {
    await fs.promises.rm(targetPathname, { force: true, maxRetries: 5, retryDelay: 100 }).catch((cleanupError) => {
      console.error('Failed to remove the cloned API spec after a failed workspace write:', cleanupError);
    });
    throw error;
  }

  await openApiSpec(mainWindow, watcher, targetPathname, { workspacePath });
  return targetPathname;
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

  try {
    await removeApiSpecFromWorkspace(workspacePath, target);
    return { workspaceUpdated: true };
  } catch (error) {
    console.error('Deleted the API spec file but could not update workspace.yml:', error);
    return { workspaceUpdated: false };
  }
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

  ipcMain.handle('renderer:rename-api-spec', (event, pathname, newName, workspacePath) =>
    renameApiSpec(deps, pathname, newName, workspacePath));

  ipcMain.handle('renderer:clone-api-spec', (event, sourcePathname, newName, targetLocation, workspacePath) =>
    cloneApiSpec(deps, sourcePathname, newName, targetLocation, workspacePath));

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
