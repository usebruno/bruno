const path = require('node:path');
const { app, utilityProcess } = require('electron');

const STOP_POLL_MS = 250;
const SHUTDOWN_TIMEOUT_MS = 3000;

const runs = new Map();
let child = null;
let nextId = 1;
let writtenBatches = 0;

const handleMessage = ({ type, id, message }) => {
  const run = runs.get(id);
  if (!run) return;
  if (type === 'work') {
    run.onWork?.();
  } else if (type === 'write') {
    writtenBatches += 1;
    run.onWrite?.();
  } else if (type === 'done') {
    writtenBatches += 1;
    runs.delete(id);
    run.resolve();
  } else if (type === 'error') {
    runs.delete(id);
    run.reject(new Error(message));
  }
};

const getChild = () => {
  if (child) return child;
  const host = utilityProcess.fork(path.join(__dirname, 'host.js'), [], {
    serviceName: 'bruno-search-index',
    env: { ...process.env, BRUNO_APP_VERSION: app.getVersion() }
  });
  host.on('message', handleMessage);
  host.on('exit', () => {
    if (child === host) child = null;
    for (const run of runs.values()) run.reject(new Error('The search index process exited'));
    runs.clear();
  });
  host.postMessage({ type: 'init', userData: app.getPath('userData') });
  child = host;
  return host;
};

const indexCollection = ({ fileIndex, onWork, onWrite, shouldStop, ...options }) => new Promise((resolve, reject) => {
  const id = nextId++;
  const host = getChild();
  const stopPoll = shouldStop && setInterval(() => {
    if (shouldStop()) host.postMessage({ type: 'stop', id });
  }, STOP_POLL_MS);
  const settle = (finish) => (value) => {
    clearInterval(stopPoll);
    finish(value);
  };
  runs.set(id, { onWork, onWrite, resolve: settle(resolve), reject: settle(reject) });
  host.postMessage({ type: 'index', id, options: { ...options, fileCache: Boolean(fileIndex) } });
});

const getWrittenBatches = () => writtenBatches;

const shutdownIndexer = () => new Promise((resolve) => {
  const host = child;
  if (!host) return resolve();
  const killTimer = setTimeout(() => host.kill(), SHUTDOWN_TIMEOUT_MS);
  host.once('exit', () => {
    clearTimeout(killTimer);
    resolve();
  });
  host.postMessage({ type: 'shutdown' });
});

module.exports = { indexCollection, getWrittenBatches, shutdownIndexer };
