const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { hasBruExtension, isWSLPath, normalizeAndResolvePath, sizeInMB } = require('../utils/filesystem');
const {
  parseEnvironment,
  parseRequest,
  parseRequestViaWorker,
  parseCollection,
  parseFolder
} = require('@usebruno/filestore');
const { parseDotEnv } = require('@usebruno/filestore');

const { uuid } = require('../utils/common');
const { getRequestUid } = require('../cache/requestUids');
const { decryptStringSafe } = require('../utils/encryption');
const { setDotEnvVars } = require('../store/process-env');
const { setBrunoConfig } = require('../store/bruno-config');
const EnvironmentSecretsStore = require('../store/env-secrets');
const UiStateSnapshot = require('../store/ui-state-snapshot');
const { parseBruFileMeta, hydrateRequestWithUuid } = require('../utils/collection');
const { parseLargeRequestWithRedaction } = require('../utils/parse');

const MAX_FILE_SIZE = 2.5 * 1024 * 1024;

const environmentSecretsStore = new EnvironmentSecretsStore();

const isDotEnvFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === '.env';
};

const isBrunoConfigFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'bruno.json';
};

const isBruEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const envDirectory = path.join(collectionPath, 'environments');
  const basename = path.basename(pathname);

  return dirname === envDirectory && hasBruExtension(basename);
};

const isCollectionRootBruFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);
  return dirname === collectionPath && basename === 'collection.bru';
};

const hydrateBruCollectionFileWithUuid = (collectionRoot) => {
  const params = _.get(collectionRoot, 'request.params', []);
  const headers = _.get(collectionRoot, 'request.headers', []);
  const requestVars = _.get(collectionRoot, 'request.vars.req', []);
  const responseVars = _.get(collectionRoot, 'request.vars.res', []);

  params.forEach((param) => (param.uid = uuid()));
  headers.forEach((header) => (header.uid = uuid()));
  requestVars.forEach((variable) => (variable.uid = uuid()));
  responseVars.forEach((variable) => (variable.uid = uuid()));

  return collectionRoot;
};

const envHasSecrets = (environment = {}) => {
  const secrets = _.filter(environment.variables, (v) => v.secret);

  return secrets && secrets.length > 0;
};

const addEnvironmentFile = async (win, pathname, collectionUid, collectionPath) => {
  try {
    const basename = path.basename(pathname);
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: basename
      }
    };

    let bruContent = fs.readFileSync(pathname, 'utf8');

    file.data = await parseEnvironment(bruContent);
    file.data.name = basename.substring(0, basename.length - 4);
    file.data.uid = getRequestUid(pathname);

    _.each(_.get(file, 'data.variables', []), (variable) => (variable.uid = uuid()));

    // hydrate environment variables with secrets
    if (envHasSecrets(file.data)) {
      const envSecrets = environmentSecretsStore.getEnvSecrets(collectionPath, file.data);
      _.each(envSecrets, (secret) => {
        const variable = _.find(file.data.variables, (v) => v.name === secret.name);
        if (variable && secret.value) {
          const decryptionResult = decryptStringSafe(secret.value);
          variable.value = decryptionResult.value;
        }
      });
    }

    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error('Error processing environment file: ', err);
  }
};

const changeEnvironmentFile = async (win, pathname, collectionUid, collectionPath) => {
  try {
    const basename = path.basename(pathname);
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: basename
      }
    };

    const bruContent = fs.readFileSync(pathname, 'utf8');
    file.data = await parseEnvironment(bruContent);
    file.data.name = basename.substring(0, basename.length - 4);
    file.data.uid = getRequestUid(pathname);
    _.each(_.get(file, 'data.variables', []), (variable) => (variable.uid = uuid()));

    // hydrate environment variables with secrets
    if (envHasSecrets(file.data)) {
      const envSecrets = environmentSecretsStore.getEnvSecrets(collectionPath, file.data);
      _.each(envSecrets, (secret) => {
        const variable = _.find(file.data.variables, (v) => v.name === secret.name);
        if (variable && secret.value) {
          const decryptionResult = decryptStringSafe(secret.value);
          variable.value = decryptionResult.value;
        }
      });
    }

    // we are reusing the addEnvironmentFile event itself
    // this is because the uid of the pathname remains the same
    // and the collection tree will be able to update the existing environment
    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const unlinkEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      },
      data: {
        uid: getRequestUid(pathname),
        name: path.basename(pathname).substring(0, path.basename(pathname).length - 4)
      }
    };

    win.webContents.send('main:collection-tree-updated', 'unlinkEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const add = async (win, pathname, collectionUid, collectionPath, useWorkerThread, watcher) => {
  console.log(`watcher add: ${pathname}`);

  if (isBrunoConfigFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const brunoConfig = JSON.parse(content);

      setBrunoConfig(collectionUid, brunoConfig);
    } catch (err) {
      console.error(err);
    }
  }

  if (isDotEnvFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const jsonData = parseDotEnv(content);

      setDotEnvVars(collectionUid, jsonData);
      const payload = {
        collectionUid,
        processEnvVariables: {
          ...jsonData
        }
      };
      win.webContents.send('main:process-env-update', payload);
    } catch (err) {
      console.error(err);
    }
  }

  if (isBruEnvironmentConfig(pathname, collectionPath)) {
    return addEnvironmentFile(win, pathname, collectionUid, collectionPath);
  }

  if (isCollectionRootBruFile(pathname, collectionPath)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        collectionRoot: true
      }
    };

    try {
      let bruContent = fs.readFileSync(pathname, 'utf8');

      file.data = await parseCollection(bruContent);

      hydrateBruCollectionFileWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  if (path.basename(pathname) === 'folder.bru') {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        folderRoot: true
      }
    };

    try {
      let bruContent = fs.readFileSync(pathname, 'utf8');

      file.data = await parseCollection(bruContent);

      hydrateBruCollectionFileWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  if (hasBruExtension(pathname)) {
    watcher.addFileToProcessing(collectionUid, pathname);

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };

    const fileStats = fs.statSync(pathname);
    let bruContent = fs.readFileSync(pathname, 'utf8');
    // If worker thread is not used, we can directly parse the file
    if (!useWorkerThread) {
      try {
        file.data = await parseRequest(bruContent);
        file.partial = false;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        win.webContents.send('main:collection-tree-updated', 'addFile', file);
        
      } catch (error) {
        console.error(error);
      } finally {
        watcher.markFileAsProcessed(win, collectionUid, pathname);
      }
      return;
    }

    try {
      // we need to send a partial file info to the UI
      // so that the UI can display the file in the collection tree
      file.data = {
        name: path.basename(pathname),
        type: 'http-request'
      };

      const metaJson = parseBruFileMeta(bruContent);
      file.data = metaJson;
      file.partial = true;
      file.loading = false;
      file.size = sizeInMB(fileStats?.size);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);

      if (fileStats.size < MAX_FILE_SIZE) {
        // This is to update the loading indicator in the UI
        file.data = metaJson;
        file.partial = false;
        file.loading = true;
        hydrateRequestWithUuid(file.data, pathname);
        win.webContents.send('main:collection-tree-updated', 'addFile', file);

        // This is to update the file info in the UI
        file.data = await parseRequestViaWorker(bruContent);
        file.partial = false;
        file.loading = false;
        hydrateRequestWithUuid(file.data, pathname);
        win.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch(error) {
      file.data = {
        name: path.basename(pathname),
        type: 'http-request'
      };
      file.error = {
        message: error?.message
      };
      file.partial = true;
      file.loading = false;
      file.size = sizeInMB(fileStats?.size);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
    } finally {
      watcher.markFileAsProcessed(win, collectionUid, pathname);
    }
  }
};

const addDirectory = async (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (pathname === envDirectory) {
    return;
  }

  let name = path.basename(pathname);
  let seq;
  const folderBruFilePath = path.join(pathname, `folder.bru`);

  try {
    if (fs.existsSync(folderBruFilePath)) {
      let folderBruFileContent = fs.readFileSync(folderBruFilePath, 'utf8');
      let folderBruData = await parseFolder(folderBruFileContent);
      name = folderBruData?.meta?.name || name;
      seq = folderBruData?.meta?.seq;
    }
  }
  catch(error) {
    console.error('Error occured while parsing folder.bru file!');
    console.error(error);
  }

  const directory = {
    meta: {
      collectionUid,
      pathname,
      name,
      seq,
      uid: getRequestUid(pathname)
    }
  };

  win.webContents.send('main:collection-tree-updated', 'addDir', directory);
};

const change = async (win, pathname, collectionUid, collectionPath) => {
  if (isBrunoConfigFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const brunoConfig = JSON.parse(content);

      const payload = {
        collectionUid,
        brunoConfig: brunoConfig
      };

      setBrunoConfig(collectionUid, brunoConfig);
      win.webContents.send('main:bruno-config-update', payload);
    } catch (err) {
      console.error(err);
    }
  }

  if (isDotEnvFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const jsonData = parseDotEnv(content);

      setDotEnvVars(collectionUid, jsonData);
      const payload = {
        collectionUid,
        processEnvVariables: {
          ...jsonData
        }
      };
      win.webContents.send('main:process-env-update', payload);
    } catch (err) {
      console.error(err);
    }
  }

  if (isBruEnvironmentConfig(pathname, collectionPath)) {
    return changeEnvironmentFile(win, pathname, collectionUid, collectionPath);
  }

  if (isCollectionRootBruFile(pathname, collectionPath)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        collectionRoot: true
      }
    };

    try {
      let bruContent = fs.readFileSync(pathname, 'utf8');

      file.data = await parseCollection(bruContent);
      hydrateBruCollectionFileWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'change', file);
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  if (path.basename(pathname) === 'folder.bru') {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        folderRoot: true
      }
    };

    try {
      let bruContent = fs.readFileSync(pathname, 'utf8');

      file.data = await parseCollection(bruContent);

      hydrateBruCollectionFileWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'change', file);
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  if (hasBruExtension(pathname)) {
    try {
      const file = {
        meta: {
          collectionUid,
          pathname,
          name: path.basename(pathname)
        }
      };

      const bru = fs.readFileSync(pathname, 'utf8');
      const fileStats = fs.statSync(pathname);

      if (fileStats.size >= MAX_FILE_SIZE) {
        const parsedData = await parseLargeRequestWithRedaction(bru);
        file.data = parsedData;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        win.webContents.send('main:collection-tree-updated', 'change', file);
      } else {
        file.data = await parseRequest(bru);
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        win.webContents.send('main:collection-tree-updated', 'change', file);
      }
    } catch (err) {
      console.error(err);
    }
  }
};

const unlink = (win, pathname, collectionUid, collectionPath) => {
  console.log(`watcher unlink: ${pathname}`);

  if (isBruEnvironmentConfig(pathname, collectionPath)) {
    return unlinkEnvironmentFile(win, pathname, collectionUid);
  }

  if (hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };
    win.webContents.send('main:collection-tree-updated', 'unlink', file);
  }
};

const unlinkDir = async (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (pathname === envDirectory) {
    return;
  }


  const folderBruFilePath = path.join(pathname, `folder.bru`);

  let name = path.basename(pathname);

  if (fs.existsSync(folderBruFilePath)) {
    let folderBruFileContent = fs.readFileSync(folderBruFilePath, 'utf8');
    let folderBruData = await parseFolder(folderBruFileContent);
    name = folderBruData?.meta?.name || name;
  }

  const directory = {
    meta: {
      collectionUid,
      pathname,
      name
    }
  };
  win.webContents.send('main:collection-tree-updated', 'unlinkDir', directory);
};

const onWatcherSetupComplete = (win, watchPath, collectionUid, watcher) => {
  // Mark discovery as complete
  watcher.completeCollectionDiscovery(win, collectionUid);
  
  const UiStateSnapshotStore = new UiStateSnapshot();
  const collectionsSnapshotState = UiStateSnapshotStore.getCollections();
  const collectionSnapshotState = collectionsSnapshotState?.find(c => c?.pathname == watchPath);
  win.webContents.send('main:hydrate-app-with-ui-state-snapshot', collectionSnapshotState);
};

class CollectionWatcher {
  constructor() {
    this.watchers = {};
    this.loadingStates = {};
  }

  // Initialize loading state tracking for a collection
  initializeLoadingState(collectionUid) {
    if (!this.loadingStates[collectionUid]) {
      this.loadingStates[collectionUid] = {
        isDiscovering: false, // Initial discovery phase
        isProcessing: false,  // Processing discovered files
        pendingFiles: new Set(), // Files that need processing
      };
    }
  }

  startCollectionDiscovery(win, collectionUid) {
    this.initializeLoadingState(collectionUid);
    const state = this.loadingStates[collectionUid];
    
    state.isDiscovering = true;
    state.pendingFiles.clear();
    
    win.webContents.send('main:collection-loading-state-updated', {
      collectionUid,
      isLoading: true
    });
  }

  addFileToProcessing(collectionUid, filepath) {
    this.initializeLoadingState(collectionUid);
    const state = this.loadingStates[collectionUid];
    state.pendingFiles.add(filepath);
  }

  markFileAsProcessed(win, collectionUid, filepath) {
    if (!this.loadingStates[collectionUid]) return;
    
    const state = this.loadingStates[collectionUid];
    state.pendingFiles.delete(filepath);
    
    // If discovery is complete and no pending files, mark as not loading
    if (!state.isDiscovering && state.pendingFiles.size === 0 && state.isProcessing) {
      state.isProcessing = false;
      win.webContents.send('main:collection-loading-state-updated', {
        collectionUid,
        isLoading: false
      });
    }
  }

  completeCollectionDiscovery(win, collectionUid) {
    if (!this.loadingStates[collectionUid]) return;
    
    const state = this.loadingStates[collectionUid];
    state.isDiscovering = false;
    
    // If there are pending files, start processing phase
    if (state.pendingFiles.size > 0) {
      state.isProcessing = true;
    } else {
      // No pending files, collection is fully loaded
      win.webContents.send('main:collection-loading-state-updated', {
        collectionUid,
        isLoading: false
      });
    }
  }

  cleanupLoadingState(collectionUid) {
    delete this.loadingStates[collectionUid];
  }

  addWatcher(win, watchPath, collectionUid, brunoConfig, forcePolling = false, useWorkerThread) {
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
    }

    this.initializeLoadingState(collectionUid);
    
    this.startCollectionDiscovery(win, collectionUid);

    const ignores = brunoConfig?.ignore || [];
    setTimeout(() => {
      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: false,
        usePolling: isWSLPath(watchPath) || forcePolling ? true : false,
        ignored: (filepath) => {
          const normalizedPath = normalizeAndResolvePath(filepath);
          const relativePath = path.relative(watchPath, normalizedPath);

          return ignores.some((ignorePattern) => {
            return relativePath === ignorePattern || relativePath.startsWith(ignorePattern);
          });
        },
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        },
        depth: 20,
        disableGlobbing: true
      });

      let startedNewWatcher = false;
      watcher
        .on('ready', () => onWatcherSetupComplete(win, watchPath, collectionUid, this))
        .on('add', (pathname) => add(win, pathname, collectionUid, watchPath, useWorkerThread, this))
        .on('addDir', (pathname) => addDirectory(win, pathname, collectionUid, watchPath))
        .on('change', (pathname) => change(win, pathname, collectionUid, watchPath))
        .on('unlink', (pathname) => unlink(win, pathname, collectionUid, watchPath))
        .on('unlinkDir', (pathname) => unlinkDir(win, pathname, collectionUid, watchPath))
        .on('error', (error) => {
          // `EMFILE` is an error code thrown when to many files are watched at the same time see: https://github.com/usebruno/bruno/issues/627
          // `ENOSPC` stands for "Error No space" but is also thrown if the file watcher limit is reached.
          // To prevent loops `!forcePolling` is checked.
          if ((error.code === 'ENOSPC' || error.code === 'EMFILE') && !startedNewWatcher && !forcePolling) {
            // This callback is called for every file the watcher is trying to watch. To prevent a spam of messages and
            // Multiple watcher being started `startedNewWatcher` is set to prevent this.
            startedNewWatcher = true;
            watcher.close();
            console.error(
              `\nCould not start watcher for ${watchPath}:`,
              'ENOSPC: System limit for number of file watchers reached!',
              'Trying again with polling, this will be slower!\n',
              'Update your system config to allow more concurrently watched files with:',
              '"echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p"'
            );
            this.addWatcher(win, watchPath, collectionUid, brunoConfig, true, useWorkerThread);
          } else {
            console.error(`An error occurred in the watcher for: ${watchPath}`, error);
          }
        });

      this.watchers[watchPath] = watcher;
    }, 100);
  }

  hasWatcher(watchPath) {
    return this.watchers[watchPath];
  }

  removeWatcher(watchPath, win, collectionUid) {
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
      this.watchers[watchPath] = null;
    }
    
    if (collectionUid) {
      this.cleanupLoadingState(collectionUid);
    }
  }

  getWatcherByItemPath(itemPath) {
    const paths = Object.keys(this.watchers);

    const watcherPath = paths?.find(collectionPath => {
      const absCollectionPath = path.resolve(collectionPath);
      const absItemPath = path.resolve(itemPath);

      return absItemPath.startsWith(absCollectionPath);
    });

    return watcherPath ? this.watchers[watcherPath] : null;
  }

  unlinkItemPathInWatcher(itemPath) {
    const watcher = this.getWatcherByItemPath(itemPath);
    if (watcher) {
      watcher.unwatch(itemPath);
    }
  }
  
  addItemPathInWatcher(itemPath) {
    const watcher = this.getWatcherByItemPath(itemPath);
    if (watcher && !watcher?.has?.(itemPath)) {
      watcher?.add?.(itemPath);
    }
  }

  getAllWatcherPaths() {
    return Object.entries(this.watchers)
      .filter(([path, watcher]) => !!watcher)
      .map(([path, _watcher]) => path);
  }
}

const collectionWatcher = new CollectionWatcher();

module.exports = collectionWatcher;
