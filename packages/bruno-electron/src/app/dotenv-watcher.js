const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { parseDotEnv } = require('@usebruno/filestore');
const {
  setDotEnvVars, clearDotEnvVars,
  setWorkspaceDotEnvVars, clearWorkspaceDotEnvVars,
  setEnvironmentDotEnvVars, clearEnvironmentDotEnvVars
} = require('../store/process-env');

const isDotEnvFile = (filename) => {
  return filename === '.env' || filename.startsWith('.env.');
};

const isEnvironmentDotEnvFile = (filename) => {
  return filename.endsWith('.env') && filename !== '.env' && !filename.startsWith('.env.');
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

const createEnvironmentFileHandler = (win, options) => (pathname) => {
  const { workspacePath, workspaceUid } = options;
  const filename = path.basename(pathname);

  if (!isEnvironmentDotEnvFile(filename)) {
    return;
  }

  const environmentName = filename.slice(0, -'.env'.length);

  try {
    const content = fs.readFileSync(pathname, 'utf8');
    const jsonData = parseDotEnv(content);

    setEnvironmentDotEnvVars(workspacePath, environmentName, jsonData);

    const variables = parseVariablesToArray(jsonData);

    if (!win.isDestroyed()) {
      win.webContents.send('main:environment-dotenv-file-update', {
        workspaceUid,
        workspacePath,
        environmentName,
        filename,
        variables,
        exists: true
      });
    }
  } catch (err) {
    console.error(`Error processing environment dotenv file ${pathname}:`, err);
  }
};

const createEnvironmentUnlinkHandler = (win, options) => (pathname) => {
  const { workspacePath, workspaceUid } = options;
  const filename = path.basename(pathname);

  if (!isEnvironmentDotEnvFile(filename)) {
    return;
  }

  const environmentName = filename.slice(0, -'.env'.length);
  clearEnvironmentDotEnvVars(workspacePath, environmentName);

  if (!win.isDestroyed()) {
    win.webContents.send('main:environment-dotenv-file-update', {
      workspaceUid,
      workspacePath,
      environmentName,
      filename,
      variables: [],
      exists: false
    });
  }
};

class DotEnvWatcher {
  constructor() {
    this.collectionWatchers = new Map();
    this.workspaceWatchers = new Map();
    this.environmentWatchers = new Map();
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

    // Watch environments/ directory for per-environment .env files
    const environmentsDir = path.join(workspacePath, 'environments');
    if (fs.existsSync(environmentsDir)) {
      this._startEnvironmentWatcher(win, workspacePath, workspaceUid, environmentsDir);
    }

    // Lazily create env watcher when environments/ directory is created after workspace open
    const dirWatcher = chokidar.watch(workspacePath, {
      ignoreInitial: true,
      persistent: true,
      ignorePermissionErrors: true,
      depth: 1,
      disableGlobbing: true
    });

    dirWatcher.on('addDir', (dirPath) => {
      if (path.basename(dirPath) === 'environments' && path.dirname(dirPath) === workspacePath) {
        if (!this.environmentWatchers.has(workspacePath)) {
          this._startEnvironmentWatcher(win, workspacePath, workspaceUid, dirPath);
        }
      }
    });

    // Store dir watcher for cleanup — reuse the workspace watcher's lifecycle
    const originalClose = watcher.close.bind(watcher);
    watcher.close = () => {
      dirWatcher.close();
      return originalClose();
    };
  }

  _startEnvironmentWatcher(win, workspacePath, workspaceUid, environmentsDir) {
    if (this.environmentWatchers.has(workspacePath)) {
      this.environmentWatchers.get(workspacePath).close();
    }

    const envDotEnvWatcher = chokidar.watch(environmentsDir, {
      ...DEFAULT_WATCHER_OPTIONS,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 250
      }
    });

    const handleEnvFile = createEnvironmentFileHandler(win, {
      workspacePath,
      workspaceUid
    });
    const handleEnvUnlink = createEnvironmentUnlinkHandler(win, {
      workspacePath,
      workspaceUid
    });

    envDotEnvWatcher.on('add', handleEnvFile);
    envDotEnvWatcher.on('change', handleEnvFile);
    envDotEnvWatcher.on('unlink', handleEnvUnlink);
    envDotEnvWatcher.on('error', (err) => {
      console.error(`Environment dotenv watcher error for ${environmentsDir}:`, err);
    });

    this.environmentWatchers.set(workspacePath, envDotEnvWatcher);
  }

  removeWorkspaceWatcher(workspacePath) {
    if (this.workspaceWatchers.has(workspacePath)) {
      this.workspaceWatchers.get(workspacePath).close();
      this.workspaceWatchers.delete(workspacePath);
    }
    clearWorkspaceDotEnvVars(workspacePath);

    if (this.environmentWatchers.has(workspacePath)) {
      this.environmentWatchers.get(workspacePath).close();
      this.environmentWatchers.delete(workspacePath);
    }
    clearEnvironmentDotEnvVars(workspacePath);
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

    for (const [path, watcher] of this.environmentWatchers) {
      watcher.close();
    }
    this.environmentWatchers.clear();
  }
}

const dotEnvWatcher = new DotEnvWatcher();

module.exports = dotEnvWatcher;
