const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { parseDotEnv } = require('@usebruno/filestore');
const { setDotEnvVars, clearDotEnvVars, setWorkspaceDotEnvVars, clearWorkspaceDotEnvVars } = require('../store/process-env');

const isDotEnvFile = (filename) => {
  return filename === '.env' || filename.startsWith('.env.');
};

const parseVariablesToArray = (envObject) => {
  return Object.entries(envObject).map(([name, value]) => ({
    name,
    value,
    enabled: true,
    secret: false
  }));
};

class DotEnvWatcher {
  constructor() {
    this.collectionWatchers = {};
    this.workspaceWatchers = {};
  }

  addCollectionWatcher(win, collectionPath, collectionUid) {
    if (this.collectionWatchers[collectionPath]) {
      this.collectionWatchers[collectionPath].close();
    }

    const dotEnvPattern = path.join(collectionPath, '.env*');

    const watcher = chokidar.watch(dotEnvPattern, {
      ignoreInitial: false,
      persistent: true,
      ignorePermissionErrors: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 100
      },
      depth: 0
    });

    const handleFile = (pathname) => {
      const filename = path.basename(pathname);
      if (!isDotEnvFile(filename)) {
        return;
      }

      try {
        if (!fs.existsSync(pathname)) {
          return;
        }

        const content = fs.readFileSync(pathname, 'utf8');
        const jsonData = parseDotEnv(content);

        if (filename === '.env') {
          setDotEnvVars(collectionUid, jsonData);
        }

        const variables = parseVariablesToArray(jsonData);

        if (!win.isDestroyed()) {
          win.webContents.send('main:dotenv-file-update', {
            type: 'collection',
            collectionUid,
            filename,
            variables,
            exists: true,
            processEnvVariables: { ...jsonData }
          });
        }
      } catch (err) {
        console.error(`Error processing dotenv file ${pathname}:`, err);
      }
    };

    const handleUnlink = (pathname) => {
      const filename = path.basename(pathname);
      if (!isDotEnvFile(filename)) {
        return;
      }

      if (filename === '.env') {
        clearDotEnvVars(collectionUid);
      }

      if (!win.isDestroyed()) {
        win.webContents.send('main:dotenv-file-update', {
          type: 'collection',
          collectionUid,
          filename,
          variables: [],
          exists: false,
          processEnvVariables: {}
        });
      }
    };

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);

    this.collectionWatchers[collectionPath] = watcher;
  }

  removeCollectionWatcher(collectionPath) {
    if (this.collectionWatchers[collectionPath]) {
      this.collectionWatchers[collectionPath].close();
      delete this.collectionWatchers[collectionPath];
    }
  }

  hasCollectionWatcher(collectionPath) {
    return Boolean(this.collectionWatchers[collectionPath]);
  }

  addWorkspaceWatcher(win, workspacePath, workspaceUid) {
    if (this.workspaceWatchers[workspacePath]) {
      this.workspaceWatchers[workspacePath].close();
    }

    const dotEnvPattern = path.join(workspacePath, '.env*');

    const watcher = chokidar.watch(dotEnvPattern, {
      ignoreInitial: false,
      persistent: true,
      ignorePermissionErrors: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 250
      },
      depth: 0
    });

    const handleFile = (pathname) => {
      const filename = path.basename(pathname);
      if (!isDotEnvFile(filename)) {
        return;
      }

      try {
        if (!fs.existsSync(pathname)) {
          return;
        }

        const content = fs.readFileSync(pathname, 'utf8');
        const jsonData = parseDotEnv(content);

        if (filename === '.env') {
          setWorkspaceDotEnvVars(workspacePath, jsonData);
        }

        const variables = parseVariablesToArray(jsonData);

        if (!win.isDestroyed()) {
          win.webContents.send('main:dotenv-file-update', {
            type: 'workspace',
            workspaceUid,
            workspacePath,
            filename,
            variables,
            exists: true,
            processEnvVariables: { ...jsonData }
          });
        }
      } catch (err) {
        console.error(`Error processing workspace dotenv file ${pathname}:`, err);
      }
    };

    const handleUnlink = (pathname) => {
      const filename = path.basename(pathname);
      if (!isDotEnvFile(filename)) {
        return;
      }

      if (filename === '.env') {
        clearWorkspaceDotEnvVars(workspacePath);
      }

      if (!win.isDestroyed()) {
        win.webContents.send('main:dotenv-file-update', {
          type: 'workspace',
          workspaceUid,
          workspacePath,
          filename,
          variables: [],
          exists: false,
          processEnvVariables: {}
        });
      }
    };

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);

    this.workspaceWatchers[workspacePath] = watcher;
  }

  removeWorkspaceWatcher(workspacePath) {
    if (this.workspaceWatchers[workspacePath]) {
      this.workspaceWatchers[workspacePath].close();
      delete this.workspaceWatchers[workspacePath];
    }
    clearWorkspaceDotEnvVars(workspacePath);
  }

  hasWorkspaceWatcher(workspacePath) {
    return Boolean(this.workspaceWatchers[workspacePath]);
  }
}

const dotEnvWatcher = new DotEnvWatcher();

module.exports = dotEnvWatcher;
