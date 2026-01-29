const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const {
  hasRequestExtension,
  isWSLPath,
  normalizeAndResolvePath,
  sizeInMB,
  getCollectionFormat
} = require('../utils/filesystem');
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
const { parseFileMeta, hydrateRequestWithUuid } = require('../utils/collection');
const { parseLargeRequestWithRedaction } = require('../utils/parse');
const { transformBrunoConfigAfterRead } = require('../utils/transformBrunoConfig');

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

const isEnvironmentsFolder = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const envDirectory = path.join(collectionPath, 'environments');

  return dirname === envDirectory;
};

const isFolderRootFile = (pathname, collectionPath) => {
  const basename = path.basename(pathname);
  const format = getCollectionFormat(collectionPath);

  if (format === 'yml') {
    return basename === 'folder.yml';
  } else if (format === 'bru') {
    return basename === 'folder.bru';
  }

  return false;
};

const isCollectionRootFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  // return if we are not at the root of the collection
  if (dirname !== collectionPath) {
    return false;
  }

  return basename === 'collection.bru' || basename === 'opencollection.yml';
};

const envHasSecrets = (environment = {}) => {
  const secrets = _.filter(environment.variables, (v) => v.secret);

  return secrets && secrets.length > 0;
};

const hydrateCollectionRootWithUuid = (collectionRoot) => {
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

    const format = getCollectionFormat(collectionPath);
    let content = fs.readFileSync(pathname, 'utf8');

    file.data = await parseEnvironment(content, { format });

    // Extract name by removing the extension
    const ext = path.extname(basename);
    file.data.name = basename.substring(0, basename.length - ext.length);
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

    const format = getCollectionFormat(collectionPath);
    const content = fs.readFileSync(pathname, 'utf8');

    file.data = await parseEnvironment(content, { format });

    // Extract name by removing the extension
    const ext = path.extname(basename);
    file.data.name = basename.substring(0, basename.length - ext.length);
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
      let brunoConfig = JSON.parse(content);

      // Transform the config to add exists metadata for protobuf files and import paths
      brunoConfig = await transformBrunoConfigAfterRead(brunoConfig, collectionPath);

      setBrunoConfig(collectionUid, brunoConfig);

      const payload = {
        collectionUid,
        brunoConfig: brunoConfig
      };

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

  if (isEnvironmentsFolder(pathname, collectionPath)) {
    return addEnvironmentFile(win, pathname, collectionUid, collectionPath);
  }

  if (isCollectionRootFile(pathname, collectionPath)) {
    const format = getCollectionFormat(collectionPath);
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        collectionRoot: true
      }
    };

    try {
      let content = fs.readFileSync(pathname, 'utf8');
      let parsed = await parseCollection(content, { format });

      let collectionRoot, brunoConfig;
      if (format === 'yml') {
        collectionRoot = parsed.collectionRoot;
        brunoConfig = parsed.brunoConfig;
      } else {
        collectionRoot = parsed;
        brunoConfig = undefined;
      }

      file.data = collectionRoot;

      hydrateCollectionRootWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);

      // in yml format, opencollection.yml also contains the bruno config
      if (format === 'yml') {
        // Transform the config to add exists metadata for protobuf files and import paths
        brunoConfig = await transformBrunoConfigAfterRead(brunoConfig, collectionPath);

        setBrunoConfig(collectionUid, brunoConfig);

        const payload = {
          collectionUid,
          brunoConfig: brunoConfig
        };

        win.webContents.send('main:bruno-config-update', payload);
      }
    } catch (err) {
      console.error(err);
    }

    return;
  }

  if (isFolderRootFile(pathname, collectionPath)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        folderRoot: true
      }
    };

    try {
      let format = getCollectionFormat(collectionPath);
      let content = fs.readFileSync(pathname, 'utf8');
      file.data = await parseFolder(content, { format });

      hydrateCollectionRootWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  const format = getCollectionFormat(collectionPath);
  if (hasRequestExtension(pathname, format)) {
    watcher.addFileToProcessing(collectionUid, pathname);

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };

    const fileStats = fs.statSync(pathname);
    let content = fs.readFileSync(pathname, 'utf8');

    // If worker thread is not used, we can directly parse the file
    if (!useWorkerThread) {
      try {
        file.data = await parseRequest(content, { format });
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

      const metaJson = parseFileMeta(content, format);
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
        file.data = await parseRequestViaWorker(content, {
          format,
          filename: pathname
        });
        file.partial = false;
        file.loading = false;
        hydrateRequestWithUuid(file.data, pathname);
        win.webContents.send('main:collection-tree-updated', 'addFile', file);
      }
    } catch (error) {
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

  const format = getCollectionFormat(collectionPath);
  const folderFilePath = path.join(pathname, `folder.${format}`);

  try {
    if (fs.existsSync(folderFilePath)) {
      let folderFileContent = fs.readFileSync(folderFilePath, 'utf8');
      let folderData = await parseFolder(folderFileContent, { format });
      name = folderData?.meta?.name || name;
      seq = folderData?.meta?.seq;
    }
  } catch (error) {
    console.error(`Error occured while parsing folder.${format} file`);
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
      let brunoConfig = JSON.parse(content);

      // Transform the config to add file existence checks for protobuf files and import paths
      brunoConfig = await transformBrunoConfigAfterRead(brunoConfig, collectionPath);

      setBrunoConfig(collectionUid, brunoConfig);

      const payload = {
        collectionUid,
        brunoConfig: brunoConfig
      };

      win.webContents.send('main:bruno-config-update', payload);
    } catch (err) {
      console.error(err);
    }

    return;
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

    return;
  }

  if (isEnvironmentsFolder(pathname, collectionPath)) {
    return changeEnvironmentFile(win, pathname, collectionUid, collectionPath);
  }

  if (isCollectionRootFile(pathname, collectionPath)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        collectionRoot: true
      }
    };

    try {
      let content = fs.readFileSync(pathname, 'utf8');
      let format = getCollectionFormat(collectionPath);
      let parsed = await parseCollection(content, { format });

      let collectionRoot, brunoConfig;
      if (format === 'yml') {
        collectionRoot = parsed.collectionRoot;
        brunoConfig = parsed.brunoConfig;
      } else {
        collectionRoot = parsed;
        brunoConfig = undefined;
      }

      file.data = collectionRoot;

      hydrateCollectionRootWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'change', file);

      // in yml format, opencollection.yml also contains the bruno config
      if (format === 'yml') {
        // Transform the config to add exists metadata for protobuf files and import paths
        brunoConfig = await transformBrunoConfigAfterRead(brunoConfig, collectionPath);

        setBrunoConfig(collectionUid, brunoConfig);

        const payload = {
          collectionUid,
          brunoConfig: brunoConfig
        };

        win.webContents.send('main:bruno-config-update', payload);
      }
    } catch (err) {
      console.error(err);
    }

    return;
  }

  if (isFolderRootFile(pathname, collectionPath)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname),
        folderRoot: true
      }
    };

    try {
      let format = getCollectionFormat(collectionPath);
      let content = fs.readFileSync(pathname, 'utf8');
      file.data = await parseFolder(content, { format });

      hydrateCollectionRootWithUuid(file.data);
      win.webContents.send('main:collection-tree-updated', 'change', file);
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  }

  const format = getCollectionFormat(collectionPath);
  if (hasRequestExtension(pathname, format)) {
    try {
      const file = {
        meta: {
          collectionUid,
          pathname,
          name: path.basename(pathname)
        }
      };

      const content = fs.readFileSync(pathname, 'utf8');
      const fileStats = fs.statSync(pathname);

      if (fileStats.size >= MAX_FILE_SIZE && format === 'bru') {
        file.data = await parseLargeRequestWithRedaction(content, 'bru');
      } else {
        file.data = await parseRequest(content, { format });
      }

      file.size = sizeInMB(fileStats?.size);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'change', file);
    } catch (err) {
      console.error(err);
    }
  }
};

const unlink = (win, pathname, collectionUid, collectionPath) => {
  console.log(`watcher unlink: ${pathname}`);

  if (isEnvironmentsFolder(pathname, collectionPath)) {
    return unlinkEnvironmentFile(win, pathname, collectionUid);
  }

  const format = getCollectionFormat(collectionPath);
  if (hasRequestExtension(pathname, format)) {
    const basename = path.basename(pathname);
    const dirname = path.dirname(pathname);

    if (basename === 'opencollection.yml' && dirname === collectionPath) {
      return;
    }

    const file = {
      meta: {
        collectionUid,
        pathname,
        name: basename
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

  const format = getCollectionFormat(collectionPath);
  const folderFilePath = path.join(pathname, `folder.${format}`);

  let name = path.basename(pathname);

  if (fs.existsSync(folderFilePath)) {
    let folderFileContent = fs.readFileSync(folderFilePath, 'utf8');
    let folderData = await parseFolder(folderFileContent, { format });
    name = folderData?.meta?.name || name;
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
  const collectionSnapshotState = collectionsSnapshotState?.find((c) => c?.pathname == watchPath);
  win.webContents.send('main:hydrate-app-with-ui-state-snapshot', collectionSnapshotState);
};

class CollectionWatcher {
  constructor() {
    this.watchers = {};
    this.loadingStates = {};
    this.tempDirectoryMap = {};
  }

  // Initialize loading state tracking for a collection
  initializeLoadingState(collectionUid) {
    if (!this.loadingStates[collectionUid]) {
      this.loadingStates[collectionUid] = {
        isDiscovering: false, // Initial discovery phase
        isProcessing: false, // Processing discovered files
        pendingFiles: new Set() // Files that need processing
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

    // Always ignore node_modules and .git, regardless of user config
    // This prevents infinite loops with symlinked directories (e.g., npm workspaces)
    const defaultIgnores = ['node_modules', '.git'];
    const userIgnores = brunoConfig?.ignore || [];
    const ignores = [...new Set([...defaultIgnores, ...userIgnores])];

    setTimeout(() => {
      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: false,
        usePolling: isWSLPath(watchPath) || forcePolling ? true : false,
        ignored: (filepath) => {
          const normalizedPath = normalizeAndResolvePath(filepath);
          const relativePath = path.relative(watchPath, normalizedPath);

          // Check if any path segment matches a default ignore pattern (handles symlinks)
          const pathSegments = relativePath.split(path.sep);
          if (pathSegments.some((segment) => defaultIgnores.includes(segment))) {
            return true;
          }

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

    const tempDirectoryPath = this.tempDirectoryMap[watchPath];
    if (tempDirectoryPath && this.watchers[tempDirectoryPath]) {
      this.watchers[tempDirectoryPath].close();
      delete this.watchers[tempDirectoryPath];
      delete this.tempDirectoryMap[watchPath];
    }

    if (collectionUid) {
      this.cleanupLoadingState(collectionUid);
    }
  }

  getWatcherByItemPath(itemPath) {
    const paths = Object.keys(this.watchers);

    const watcherPath = paths?.find((collectionPath) => {
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

  // Helper function to get collection path from temp directory metadata
  getCollectionPathFromTempDirectory(tempDirectoryPath) {
    const metadataPath = path.join(tempDirectoryPath, 'metadata.json');
    try {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      return metadata.collectionPath;
    } catch (error) {
      console.error(`Error reading metadata from temp directory ${tempDirectoryPath}:`, error);
      return null;
    }
  }

  // Add watcher for transient directory
  // The tempDirectoryPath is stored in this.tempDirectoryMap[collectionPath] so removeWatcher can clean it up
  addTempDirectoryWatcher(win, tempDirectoryPath, collectionUid, collectionPath) {
    if (this.watchers[tempDirectoryPath]) {
      this.watchers[tempDirectoryPath].close();
    }

    // Store the mapping from collectionPath to tempDirectoryPath for cleanup in removeWatcher
    this.tempDirectoryMap[collectionPath] = tempDirectoryPath;

    // Ignore metadata.json file
    const ignored = (filepath) => {
      const basename = path.basename(filepath);
      return basename === 'metadata.json';
    };

    const watcher = chokidar.watch(tempDirectoryPath, {
      ignoreInitial: true, // Don't process existing files
      usePolling: isWSLPath(tempDirectoryPath) ? true : false,
      ignored,
      persistent: true,
      ignorePermissionErrors: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 10
      },
      depth: 1, // Only watch the temp directory itself, not subdirectories
      disableGlobbing: true
    });

    // Wrapper function to handle temp directory files
    const addTempFile = async (pathname) => {
      // Skip metadata.json
      if (path.basename(pathname) === 'metadata.json') {
        return;
      }

      // Get the actual collection path from metadata
      const actualCollectionPath = this.getCollectionPathFromTempDirectory(tempDirectoryPath);
      if (!actualCollectionPath) {
        console.error(`Could not determine collection path for temp directory: ${tempDirectoryPath}`);
        return;
      }

      // Use the collection format from the actual collection
      const format = getCollectionFormat(actualCollectionPath);

      // Only process request files
      if (hasRequestExtension(pathname, format)) {
        // Call the regular add function with the actual collection path
        // This will hydrate and send the file to the renderer
        await add(win, pathname, collectionUid, actualCollectionPath, false, this);
      }
    };
    const unlinkTempFile = async (pathname) => {
      // Skip metadata.json
      if (path.basename(pathname) === 'metadata.json') {
        return;
      }

      // Get the actual collection path from metadata
      const actualCollectionPath = this.getCollectionPathFromTempDirectory(tempDirectoryPath);
      if (!actualCollectionPath) {
        console.error(`Could not determine collection path for temp directory: ${tempDirectoryPath}`);
        return;
      }

      // Use the collection format from the actual collection
      const format = getCollectionFormat(actualCollectionPath);

      // Only process request files
      if (hasRequestExtension(pathname, format)) {
        // Call the regular unlink function with the actual collection path
        await unlink(win, pathname, collectionUid, actualCollectionPath);
      }
    };

    watcher
      .on('add', (pathname) => addTempFile(pathname))
      .on('unlink', (pathname) => unlinkTempFile(pathname))
      .on('error', (error) => {
        console.error(`An error occurred in the temp directory watcher for: ${tempDirectoryPath}`, error);
      });

    this.watchers[tempDirectoryPath] = watcher;
  }

  getAllWatcherPaths() {
    return Object.entries(this.watchers)
      .filter(([path, watcher]) => !!watcher)
      .map(([path, _watcher]) => path);
  }
}

const collectionWatcher = new CollectionWatcher();

module.exports = collectionWatcher;
