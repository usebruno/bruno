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

const DEFAULT_WATCHER_OPTIONS = {
  ignoreInitial: false,
  persistent: true,
  ignorePermissionErrors: true,
  depth: 0
};

const createFileHandler = (win, options) => (pathname) => {
  const { type, uid, uidKey, pathKey, basePath, setEnvVars } = options;
  const filename = path.basename(pathname);

  if (!isDotEnvFile(filename)) {
    return;
  }

  try {
    const content = fs.readFileSync(pathname, 'utf8');
    const jsonData = parseDotEnv(content);

    if (filename === '.env') {
      setEnvVars(jsonData);
    }

    const variables = parseVariablesToArray(jsonData);

    if (!win.isDestroyed()) {
      const payload = {
        type,
        [uidKey]: uid,
        filename,
        variables,
        exists: true,
        processEnvVariables: { ...jsonData }
      };
      if (pathKey) {
        payload[pathKey] = basePath;
      }
      win.webContents.send('main:dotenv-file-update', payload);
    }
  } catch (err) {
    console.error(`Error processing dotenv file ${pathname}:`, err);
  }
};

const createUnlinkHandler = (win, options) => (pathname) => {
  const { type, uid, uidKey, pathKey, basePath, clearEnvVars } = options;
  const filename = path.basename(pathname);

  if (!isDotEnvFile(filename)) {
    return;
  }

  if (filename === '.env') {
    clearEnvVars();
  }

  if (!win.isDestroyed()) {
    const payload = {
      type,
      [uidKey]: uid,
      filename,
      variables: [],
      exists: false,
      processEnvVariables: {}
    };
    if (pathKey) {
      payload[pathKey] = basePath;
    }
    win.webContents.send('main:dotenv-file-update', payload);
  }
};

class DotEnvWatcher {
  constructor() {
    this.collectionWatchers = new Map();
    this.workspaceWatchers = new Map();
  }

  addCollectionWatcher(win, collectionPath, collectionUid) {
    if (this.collectionWatchers.has(collectionPath)) {
      this.collectionWatchers.get(collectionPath).close();
    }

    const watcher = chokidar.watch(collectionPath, {
      ...DEFAULT_WATCHER_OPTIONS,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 100
      }
    });

    const handlerOptions = {
      type: 'collection',
      uid: collectionUid,
      uidKey: 'collectionUid',
      basePath: collectionPath,
      setEnvVars: (data) => setDotEnvVars(collectionUid, data),
      clearEnvVars: () => clearDotEnvVars(collectionUid)
    };

    const handleFile = createFileHandler(win, handlerOptions);
    const handleUnlink = createUnlinkHandler(win, handlerOptions);

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);
    watcher.on('error', (err) => {
      console.error(`Collection watcher error for ${collectionPath}:`, err);
    });

    this.collectionWatchers.set(collectionPath, watcher);
  }

  removeCollectionWatcher(collectionPath, collectionUid) {
    if (this.collectionWatchers.has(collectionPath)) {
      this.collectionWatchers.get(collectionPath).close();
      this.collectionWatchers.delete(collectionPath);
    }
    if (collectionUid) {
      clearDotEnvVars(collectionUid);
    }
  }

  hasCollectionWatcher(collectionPath) {
    return this.collectionWatchers.has(collectionPath);
  }

  addWorkspaceWatcher(win, workspacePath, workspaceUid) {
    if (this.workspaceWatchers.has(workspacePath)) {
      this.workspaceWatchers.get(workspacePath).close();
    }

    const watcher = chokidar.watch(workspacePath, {
      ...DEFAULT_WATCHER_OPTIONS,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 250
      }
    });

    const handlerOptions = {
      type: 'workspace',
      uid: workspaceUid,
      uidKey: 'workspaceUid',
      pathKey: 'workspacePath',
      basePath: workspacePath,
      setEnvVars: (data) => setWorkspaceDotEnvVars(workspacePath, data),
      clearEnvVars: () => clearWorkspaceDotEnvVars(workspacePath)
    };

    const handleFile = createFileHandler(win, handlerOptions);
    const handleUnlink = createUnlinkHandler(win, handlerOptions);

    watcher.on('add', handleFile);
    watcher.on('change', handleFile);
    watcher.on('unlink', handleUnlink);
    watcher.on('error', (err) => {
      console.error(`Workspace watcher error for ${workspacePath}:`, err);
    });

    this.workspaceWatchers.set(workspacePath, watcher);
  }

  removeWorkspaceWatcher(workspacePath) {
    if (this.workspaceWatchers.has(workspacePath)) {
      this.workspaceWatchers.get(workspacePath).close();
      this.workspaceWatchers.delete(workspacePath);
    }
    clearWorkspaceDotEnvVars(workspacePath);
  }

  hasWorkspaceWatcher(workspacePath) {
    return this.workspaceWatchers.has(workspacePath);
  }

  closeAll() {
    for (const [path, watcher] of this.collectionWatchers) {
      watcher.close();
    }
    this.collectionWatchers.clear();

    for (const [path, watcher] of this.workspaceWatchers) {
      watcher.close();
    }
    this.workspaceWatchers.clear();
  }
}

const dotEnvWatcher = new DotEnvWatcher();

module.exports = dotEnvWatcher;
