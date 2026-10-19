const path = require('node:path');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const { getRipgrepPath } = require('./ripgrep-path');
const {
  normalizeRoots,
  ownerForAbsolutePath,
  relativePathAllowed,
  pathStringMatchesTerm,
  collectionNameMatches,
  buildContentArgs,
  buildFilesArgs
} = require('./discover-collections');

/** @type {Map<number, { children: import('node:child_process').ChildProcess[], emitted: Set<string> }>} */
const active = new Map();

const emitCandidate = (id, collectionPath, emitted) => {
  const key = collectionPath;
  if (emitted.has(key)) return;
  emitted.add(key);
  process.parentPort.postMessage({ type: 'candidate', id, collectionPath });
};

const killJob = (id) => {
  const job = active.get(id);
  if (!job) return;
  for (const child of job.children) {
    try {
      child.kill();
    } catch (_) {}
  }
  active.delete(id);
};

const runRipgrepLines = (args, onLine, onDone) => {
  const child = spawn(args[0], args.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => onLine(line.trim()));
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-4000);
  });
  child.on('close', (code) => {
    rl.close();
    if (code === 0 || code === 1) onDone(null);
    else onDone(new Error(stderr || `ripgrep exited ${code}`));
  });
  return child;
};

const handleDiscover = ({ id, term, collections }) => {
  killJob(id);
  const roots = normalizeRoots(collections || []);
  const emitted = new Set();
  const children = [];
  active.set(id, { children, emitted });

  for (const entry of roots) {
    if (collectionNameMatches(entry.name, term)) {
      emitCandidate(id, entry.root, emitted);
    }
  }

  if (!roots.length) {
    process.parentPort.postMessage({ type: 'complete', id });
    active.delete(id);
    return;
  }

  let pending = 2;
  let failed = null;
  const finishScan = (err) => {
    if (err && !failed) failed = err;
    pending -= 1;
    if (pending > 0) return;
    killJob(id);
    if (failed) {
      process.parentPort.postMessage({ type: 'error', id, message: failed.message });
    } else {
      process.parentPort.postMessage({ type: 'complete', id });
    }
  };

  const onPath = (absolutePath) => {
    const owner = ownerForAbsolutePath(absolutePath, roots);
    if (!owner) return;
    const relativePath = path.relative(owner.root, absolutePath);
    if (!relativePathAllowed(owner, relativePath)) return;
    emitCandidate(id, owner.root, emitted);
  };

  const rgPath = getRipgrepPath();
  children.push(runRipgrepLines(buildContentArgs(rgPath, term, roots), onPath, finishScan));
  children.push(runRipgrepLines(buildFilesArgs(rgPath, roots), (line) => {
    const owner = ownerForAbsolutePath(line, roots);
    if (!owner) return;
    const relativePath = path.relative(owner.root, line);
    if (!relativePathAllowed(owner, relativePath)) return;
    if (pathStringMatchesTerm(relativePath, term)) {
      emitCandidate(id, owner.root, emitted);
    }
  }, finishScan));
};

process.parentPort.on('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'discover') handleDiscover(msg);
  if (msg.type === 'cancel') killJob(msg.id);
});
