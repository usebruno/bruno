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
  parseFolder,
  configureWorkerConcurrency
} = require('@usebruno/filestore');

const { uuid } = require('../utils/common');
const { getRequestUid } = require('../cache/requestUids');
const { decryptStringSafe } = require('../utils/encryption');
const { setBrunoConfig } = require('../store/bruno-config');
const EnvironmentSecretsStore = require('../store/env-secrets');
const snapshotManager = require('../services/snapshot');
const { parseFileMeta, hydrateRequestWithUuid } = require('../utils/collection');
const { parseLargeRequestWithRedaction } = require('../utils/parse');
const { transformBrunoConfigAfterRead } = require('../utils/transformBrunoConfig');
const { preferencesUtil } = require('../store/preferences');
const { performance } = require('perf_hooks');

// ── Parsing performance tracker ──
const _parseTimings = {
  files: [],
  mountStart: 0,
  reset() {
    this.files = [];
    this.mountStart = performance.now();
  },
  add(entry) {
    this.files.push(entry);
  },
  printSummary() {
    if (this.files.length === 0) return;
    const totalMount = performance.now() - this.mountStart;
    const totalRead = this.files.reduce((sum, f) => sum + (f.readMs || 0), 0);
    const totalMetaParse = this.files.reduce((sum, f) => sum + (f.metaParseMs || 0), 0);
    const totalQueueWait = this.files.reduce((sum, f) => sum + (f.queueWaitMs || 0), 0);
    const totalActualParse = this.files.reduce((sum, f) => sum + (f.actualParseMs || 0), 0);
    const workerFiles = this.files.filter((f) => f.flowPath === 'worker');
    const nonWorkerFiles = this.files.filter((f) => f.flowPath === 'non-worker');

    // Group by worker threadId to see distribution
    const byThread = {};
    workerFiles.forEach((f) => {
      const tid = f.threadId || 'unknown';
      if (!byThread[tid]) byThread[tid] = { count: 0, totalParseMs: 0 };
      byThread[tid].count++;
      byThread[tid].totalParseMs += (f.actualParseMs || 0);
    });

    // Group by file size buckets
    const sizeBuckets = { '<1KB': [], '1-10KB': [], '10-100KB': [], '100KB+': [] };
    this.files.forEach((f) => {
      if (f.sizeBytes < 1024) sizeBuckets['<1KB'].push(f);
      else if (f.sizeBytes < 10240) sizeBuckets['1-10KB'].push(f);
      else if (f.sizeBytes < 102400) sizeBuckets['10-100KB'].push(f);
      else sizeBuckets['100KB+'].push(f);
    });

    // Sort by actual parse time
    const sorted = [...this.files].sort((a, b) => (b.actualParseMs || 0) - (a.actualParseMs || 0));
    const top10 = sorted.slice(0, 10);
    const bottom5 = sorted.slice(-5);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  PARSE TIMING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total files:            ${this.files.length} (${workerFiles.length} via worker, ${nonWorkerFiles.length} direct)`);
    console.log(`  Wall-clock mount:       ${totalMount.toFixed(1)}ms`);
    console.log(`  Sum of readFile:        ${totalRead.toFixed(1)}ms  (avg ${(totalRead / this.files.length).toFixed(2)}ms)`);
    console.log(`  Sum of parseFileMeta:   ${totalMetaParse.toFixed(1)}ms  (avg ${(totalMetaParse / this.files.length).toFixed(2)}ms)`);
    console.log(`  Sum of ACTUAL parse:    ${totalActualParse.toFixed(1)}ms  (avg ${(totalActualParse / (workerFiles.length || 1)).toFixed(2)}ms)`);
    console.log(`  Sum of queue wait:      ${totalQueueWait.toFixed(1)}ms  (avg ${(totalQueueWait / (workerFiles.length || 1)).toFixed(2)}ms)`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('  WORKER THREAD DISTRIBUTION:');
    Object.entries(byThread).forEach(([tid, info]) => {
      console.log(`    Thread ${tid}: ${info.count} files, total parse ${info.totalParseMs.toFixed(1)}ms, avg ${(info.totalParseMs / info.count).toFixed(2)}ms`);
    });
    console.log('───────────────────────────────────────────────────────────');
    console.log('  FILE SIZE DISTRIBUTION:');
    Object.entries(sizeBuckets).forEach(([bucket, files]) => {
      if (files.length === 0) return;
      const avgParse = files.reduce((s, f) => s + (f.actualParseMs || 0), 0) / files.length;
      const totalParse = files.reduce((s, f) => s + (f.actualParseMs || 0), 0);
      console.log(`    ${bucket}: ${files.length} files, total parse ${totalParse.toFixed(1)}ms, avg ${avgParse.toFixed(2)}ms`);
    });
    console.log('───────────────────────────────────────────────────────────');
    console.log('  TOP 10 SLOWEST (by actual parse in worker):');
    top10.forEach((f, i) => {
      console.log(`    ${i + 1}. ${f.name}  parse=${(f.actualParseMs || 0).toFixed(1)}ms  queueWait=${(f.queueWaitMs || 0).toFixed(1)}ms  thread=${f.threadId || '-'}  size=${f.sizeBytes}B`);
    });
    console.log('  BOTTOM 5 FASTEST:');
    bottom5.forEach((f) => {
      console.log(`    - ${f.name}  parse=${(f.actualParseMs || 0).toFixed(1)}ms  queueWait=${(f.queueWaitMs || 0).toFixed(1)}ms  thread=${f.threadId || '-'}  size=${f.sizeBytes}B`);
    });
    console.log('═══════════════════════════════════════════════════════════\n');
  }
};
const dotEnvWatcher = require('./dotenv-watcher');

const MAX_FILE_SIZE = 2.5 * 1024 * 1024;

const environmentSecretsStore = new EnvironmentSecretsStore();

const isBrunoConfigFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return path.normalize(dirname) === path.normalize(collectionPath) && basename === 'bruno.json';
};

const isEnvironmentsFolder = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const envDirectory = path.join(collectionPath, 'environments');

  return path.normalize(dirname) === path.normalize(envDirectory);
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
  if (path.normalize(dirname) !== path.normalize(collectionPath)) {
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

    const _fname = path.basename(pathname);
    const _fileNum = _parseTimings.files.length + 1;
    let _shouldLog = _fileNum <= 5 || _fileNum % 500 === 0;
    const _log = (step, detail = '') => {
      if (!_shouldLog) return;
      const elapsed = (performance.now() - _parseTimings.mountStart).toFixed(1);
      console.log(`[FLOW] t=${elapsed}ms  #${_fileNum}  ${_fname}  ${step}${detail ? '  ' + detail : ''}`);
    };

    const _t0 = performance.now();
    const fileStats = fs.statSync(pathname);
    // Also log all 100KB+ files
    if (fileStats.size > 102400) _shouldLog = true;
    _log('STEP-1: statSync + readFileSync START', `size=${fileStats.size}B`);
    let content = fs.readFileSync(pathname, 'utf8');
    const _tRead = performance.now();
    _log('STEP-2: readFile DONE', `readMs=${(_tRead - _t0).toFixed(1)}`);

    // If worker thread is not used, we can directly parse the file
    if (!useWorkerThread) {
      try {
        _log('STEP-3: parseRequest (non-worker) START');
        const _tParse0 = performance.now();
        file.data = await parseRequest(content, { format });
        const _tParse1 = performance.now();
        _log('STEP-4: parseRequest DONE', `parseMs=${(_tParse1 - _tParse0).toFixed(1)}`);
        file.partial = false;
        file.loading = false;
        file.size = sizeInMB(fileStats?.size);
        hydrateRequestWithUuid(file.data, pathname);
        _log('STEP-5: IPC send addFile (final, non-worker)');
        win.webContents.send('main:collection-tree-updated', 'addFile', file);
        _parseTimings.add({
          name: _fname,
          readMs: _tRead - _t0,
          metaParseMs: 0,
          actualParseMs: _tParse1 - _tParse0,
          queueWaitMs: 0,
          roundTripMs: _tParse1 - _tParse0,
          totalMs: _tParse1 - _t0,
          sizeBytes: fileStats.size,
          threadId: 'main',
          flowPath: 'non-worker'
        });
      } catch (error) {
        console.error(error);
      } finally {
        _log('STEP-6: markFileAsProcessed (non-worker)');
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

      _log('STEP-3: parseFileMeta START');
      const _tMeta0 = performance.now();
      const metaJson = parseFileMeta(content, format);
      const _tMeta1 = performance.now();
      _log('STEP-4: parseFileMeta DONE', `metaMs=${(_tMeta1 - _tMeta0).toFixed(2)}`);

      file.data = metaJson;
      file.partial = true;
      file.loading = false;
      file.size = sizeInMB(fileStats?.size);
      hydrateRequestWithUuid(file.data, pathname);
      _log('STEP-5: IPC send addFile (partial=true, loading=false)');
      win.webContents.send('main:collection-tree-updated', 'addFile', file);

      if (fileStats.size < MAX_FILE_SIZE) {
        const skipLoadingBadge = preferencesUtil.isBetaFeatureEnabled('skip-loading-badge-event');

        if (!skipLoadingBadge) {
          file.data = metaJson;
          file.partial = false;
          file.loading = true;
          hydrateRequestWithUuid(file.data, pathname);
          _log('STEP-6: IPC send addFile (partial=false, loading=true) [LOADING BADGE]');
          win.webContents.send('main:collection-tree-updated', 'addFile', file);
        } else {
          _log('STEP-6: SKIPPED loading badge (beta flag ON)');
        }

        _log('STEP-7: parseRequestViaWorker START (enqueue to worker)');
        const _tWorker0 = performance.now();
        file.data = await parseRequestViaWorker(content, {
          format,
          filename: pathname
        });
        const _tWorker1 = performance.now();

        const _timing = file.data?.__workerTiming;
        const _actualParseMs = _timing?.parseMs || 0;
        const _threadId = _timing?.threadId;
        if (file.data?.__workerTiming) delete file.data.__workerTiming;

        const _roundTripMs = _tWorker1 - _tWorker0;
        _log('STEP-8: parseRequestViaWorker DONE', `thread=${_threadId}  actualParse=${_actualParseMs.toFixed(1)}ms  queueWait=${(_roundTripMs - _actualParseMs).toFixed(1)}ms  roundTrip=${_roundTripMs.toFixed(1)}ms`);

        file.partial = false;
        file.loading = false;
        hydrateRequestWithUuid(file.data, pathname);
        _log('STEP-9: IPC send addFile (partial=false, loading=false) [FINAL DATA]');
        win.webContents.send('main:collection-tree-updated', 'addFile', file);

        _parseTimings.add({
          name: _fname,
          readMs: _tRead - _t0,
          metaParseMs: _tMeta1 - _tMeta0,
          actualParseMs: _actualParseMs,
          queueWaitMs: _roundTripMs - _actualParseMs,
          roundTripMs: _roundTripMs,
          totalMs: _tWorker1 - _t0,
          sizeBytes: fileStats.size,
          threadId: _threadId,
          flowPath: 'worker'
        });
      } else {
        _log('STEP-7: SKIPPED worker parse (file >= MAX_FILE_SIZE)');
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
      _log('STEP-10: markFileAsProcessed');
      watcher.markFileAsProcessed(win, collectionUid, pathname);
    }
  }
};

const addDirectory = async (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (path.normalize(pathname) === path.normalize(envDirectory)) {
    return;
  }

  const _dirName = path.basename(pathname);
  const _elapsed = () => (performance.now() - _parseTimings.mountStart).toFixed(1);

  let name = _dirName;
  let seq;

  const format = getCollectionFormat(collectionPath);
  const folderFilePath = path.join(pathname, `folder.${format}`);

  try {
    if (fs.existsSync(folderFilePath)) {
      console.log(`[FLOW-DIR] t=${_elapsed()}ms  ${_dirName}/  STEP-1: readFileSync folder.${format}`);
      let folderFileContent = fs.readFileSync(folderFilePath, 'utf8');
      console.log(`[FLOW-DIR] t=${_elapsed()}ms  ${_dirName}/  STEP-2: parseFolder START`);
      let folderData = await parseFolder(folderFileContent, { format });
      console.log(`[FLOW-DIR] t=${_elapsed()}ms  ${_dirName}/  STEP-3: parseFolder DONE`);
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

  console.log(`[FLOW-DIR] t=${_elapsed()}ms  ${_dirName}/  STEP-4: IPC send addDir`);
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
  try {
    if (!fs.existsSync(collectionPath)) {
      return;
    }
    console.log(`watcher unlink: ${pathname}`);

    if (isEnvironmentsFolder(pathname, collectionPath)) {
      return unlinkEnvironmentFile(win, pathname, collectionUid);
    }

    let format;
    try {
      format = getCollectionFormat(collectionPath);
    } catch (error) {
      console.error(`Error getting collection format for: ${collectionPath}`, error);
      return;
    }
    if (hasRequestExtension(pathname, format)) {
      const basename = path.basename(pathname);
      const dirname = path.dirname(pathname);

      if (basename === 'opencollection.yml' && path.normalize(dirname) === path.normalize(collectionPath)) {
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
  } catch (err) {
    console.error(`Error processing unlink event for: ${pathname}`, err);
  }
};

const unlinkDir = async (win, pathname, collectionUid, collectionPath) => {
  try {
    if (!fs.existsSync(collectionPath)) {
      return;
    }
    const envDirectory = path.join(collectionPath, 'environments');

    if (path.normalize(pathname) === path.normalize(envDirectory)) {
      return;
    }

    let format;
    try {
      format = getCollectionFormat(collectionPath);
    } catch (error) {
      console.error(`Error getting collection format for: ${collectionPath}`, error);
      return;
    }
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
  } catch (err) {
    console.error(`Error processing unlinkDir event for: ${pathname}`, err);
  }
};

const onWatcherSetupComplete = (win, watchPath, collectionUid, watcher) => {
  // Mark discovery as complete
  watcher.completeCollectionDiscovery(win, collectionUid);

  const collectionSnapshotState = snapshotManager.getCollection(watchPath);

  const hydratePayload = collectionSnapshotState
    ? {
        pathname: watchPath,
        environmentPath: collectionSnapshotState?.environment?.collection || '',
        selectedEnvironment: collectionSnapshotState?.selectedEnvironment || ''
      }
    : null;

  win.webContents.send('main:hydrate-app-with-ui-state-snapshot', hydratePayload);
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
      _parseTimings.printSummary();
      win.webContents.send('main:collection-loading-state-updated', {
        collectionUid,
        isLoading: false
      });

      // Scale down to 1 worker after mount completes to release memory,
      // but only if no other collections are still loading
      const parallelWorkers = preferencesUtil.isBetaFeatureEnabled('parallel-workers');
      if (parallelWorkers) {
        const anyStillLoading = Object.values(this.loadingStates).some(
          (s) => s.isDiscovering || s.isProcessing
        );
        if (!anyStillLoading) {
          configureWorkerConcurrency(1);
        }
      }
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
      _parseTimings.printSummary();
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

    // Configure worker concurrency based on beta flag (checked per collection open)
    const parallelWorkers = preferencesUtil.isBetaFeatureEnabled('parallel-workers');
    const sidebarOptimizations = preferencesUtil.isBetaFeatureEnabled('sidebar-optimizations');
    const skipLoadingBadge = preferencesUtil.isBetaFeatureEnabled('skip-loading-badge-event');
    configureWorkerConcurrency(parallelWorkers ? 4 : 1);

    console.log('\n══════════════════════════════════════════════════════');
    console.log('  [MOUNT-START] Collection mount initiated');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  Path:               ${watchPath}`);
    console.log(`  CollectionUid:      ${collectionUid}`);
    console.log(`  useWorkerThread:    ${useWorkerThread}`);
    console.log(`  Beta flags:`);
    console.log(`    sidebar-optimizations:    ${sidebarOptimizations}`);
    console.log(`    skip-loading-badge-event: ${skipLoadingBadge}`);
    console.log(`    parallel-workers:         ${parallelWorkers} (concurrency=${parallelWorkers ? 4 : 1})`);
    console.log('══════════════════════════════════════════════════════\n');

    this.initializeLoadingState(collectionUid);
    _parseTimings.reset();

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
          const basename = path.basename(filepath);

          // Ignore .env files - handled by dotenv-watcher
          if (basename === '.env' || basename.startsWith('.env.')) {
            return true;
          }

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

      dotEnvWatcher.addCollectionWatcher(win, watchPath, collectionUid);
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

    dotEnvWatcher.removeCollectionWatcher(watchPath);

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

  closeAllWatchers() {
    const pending = [];
    for (const [watchPath, watcher] of Object.entries(this.watchers)) {
      try {
        const result = watcher?.close();
        if (result && typeof result.then === 'function') pending.push(result);
      } catch (err) {}
    }
    this.watchers = {};
    return Promise.allSettled(pending);
  }
}

const collectionWatcher = new CollectionWatcher();

module.exports = collectionWatcher;
