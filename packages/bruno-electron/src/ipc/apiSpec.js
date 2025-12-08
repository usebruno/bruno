const { ipcMain } = require('electron');
const { openApiSpecDialog, openApiSpec } = require('../app/apiSpecs');
const { writeFile } = require('../utils/filesystem');
const { removeApiSpecUid } = require('../cache/apiSpecUids');
const path = require('path');
const fs = require('fs');

const registerRendererEventHandlers = (mainWindow, watcher, lastOpenedApiSpecs) => {
  ipcMain.handle('renderer:open-api-spec', (event, workspacePath = null) => {
    if (watcher && mainWindow) {
      openApiSpecDialog(mainWindow, watcher, { workspacePath });
    }
  });

  ipcMain.handle('renderer:open-api-spec-file', (event, apiSpecPath, workspacePath = null) => {
    if (watcher && mainWindow) {
      openApiSpec(mainWindow, watcher, apiSpecPath, { workspacePath });
    }
  });

  ipcMain.handle('renderer:save-api-spec', async (event, pathname, content) => {
    try {
      await writeFile(pathname, content);
      Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:create-api-spec', async (event, apiSpecName, apiSpecLocation, content = '', workspacePath = null) => {
    try {
      let pathname = path.join(apiSpecLocation, apiSpecName);
      if (fs.existsSync(pathname)) {
        throw new Error(`path: ${pathname} already exists`);
      }
      await writeFile(pathname, content);
      openApiSpec(mainWindow, watcher, pathname, { workspacePath });
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:remove-api-spec', async (event, pathname, workspacePath = null) => {
    try {
      if (watcher && mainWindow) {
        watcher.removeWatcher(pathname, mainWindow);
        removeApiSpecUid(pathname);

        if (workspacePath) {
          const yaml = require('js-yaml');
          const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

          if (fs.existsSync(workspaceFilePath)) {
            const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
            const workspaceConfig = yaml.load(yamlContent);

            if (workspaceConfig.apiSpecs) {
              workspaceConfig.apiSpecs = workspaceConfig.apiSpecs.filter((a) => {
                const apiSpecPathFromYml = a.path;
                if (!apiSpecPathFromYml) return true;

                const absoluteApiSpecPath = path.isAbsolute(apiSpecPathFromYml)
                  ? apiSpecPathFromYml
                  : path.resolve(workspacePath, apiSpecPathFromYml);

                return absoluteApiSpecPath !== pathname;
              });

              const updatedYamlContent = yaml.dump(workspaceConfig, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
              });
              fs.writeFileSync(workspaceFilePath, updatedYamlContent);
            }
          }
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:fetch-api-spec', async (event, url) => {
    try {
      const data = await fetch(url).then((res) => res.text());
      return data;
    } catch (error) {
      return Promise.reject(error);
    }
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
