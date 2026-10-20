const path = require('node:path');
const { utilityProcess } = require('electron');

let nextId = 1;
/** @type {import('electron').UtilityProcess | null} */
let worker = null;
/** @type {Map<number, { resolve: Function, reject: Function, onHit: Function }>} */
const pending = new Map();

const utilityEntry = path.join(__dirname, 'ripgrep-utility.js');

const ensureWorker = () => {
  if (worker) return worker;
  worker = utilityProcess.fork(utilityEntry, [], { serviceName: 'bruno-ripgrep' });
  worker.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    const job = pending.get(msg.id);
    if (!job) return;
    if (msg.type === 'hit') job.onHit(msg.collectionPath, msg.relativePath);
    if (msg.type === 'complete') {
      pending.delete(msg.id);
      job.resolve();
    }
    if (msg.type === 'error') {
      pending.delete(msg.id);
      job.reject(new Error(msg.message || 'ripgrep discovery failed'));
    }
  });
  worker.on('exit', () => {
    worker = null;
    for (const [id, job] of pending) {
      pending.delete(id);
      job.reject(new Error('ripgrep utility process exited'));
    }
  });
  return worker;
};

const discoverCollections = ({ term, collections, onHit }) => {
  const id = nextId++;
  const child = ensureWorker();
  const promise = new Promise((resolve, reject) => {
    pending.set(id, {
      resolve,
      reject,
      onHit: (collectionPath, relativePath) => onHit?.(collectionPath, relativePath)
    });
    child.postMessage({ type: 'discover', id, term, collections });
  });
  return { id, promise };
};

const cancelDiscovery = (id) => {
  if (!worker || id == null) return;
  worker.postMessage({ type: 'cancel', id });
  pending.delete(id);
};

const shutdownRipgrepHost = () => {
  for (const id of [...pending.keys()]) cancelDiscovery(id);
  if (worker) {
    worker.kill();
    worker = null;
  }
};

module.exports = { discoverCollections, cancelDiscovery, shutdownRipgrepHost };
