const path = require('node:path');
const { spawn } = require('node:child_process');
const { rgPath } = require('@vscode/ripgrep');
const { defaultClassify } = require('../../utils/mount');

const RG_PATH = rgPath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const BATCH_SIZE = 200;
const NARROW_LIMIT = 2000;
const HISTORY_SIZE = 10;
const ARGS_LENGTH_LIMIT = 30000;
const RG_ARGS = [
  '--files-with-matches',
  '--ignore-case',
  '--no-ignore',
  '--hidden',
  '--glob', '*.bru',
  '--glob', '*.yml',
  '--glob', '*.yaml',
  '--glob', '!**/node_modules/**',
  '--glob', '!**/.git/**',
  '--glob', '!**/.svn/**',
  '--glob', '!**/.hg/**',
  '--glob', '!**/.bruno/**'
];

let current = null;
const history = new Map();

const post = (message) => process.parentPort.postMessage(message);

const escapeRegex = (text) => text.replace(/[\\^$.|?*+()[\]{}]/g, '\\$&');

const isCurrent = (id) => current?.id === id;

const stop = () => {
  if (!current) return;
  current.child?.kill();
  current = null;
};

const chunkPaths = (relativePaths) => {
  const chunks = [];
  let chunk = [];
  let length = 0;
  for (const relativePath of relativePaths) {
    if (chunk.length && length + relativePath.length + 1 > ARGS_LENGTH_LIMIT) {
      chunks.push(chunk);
      chunk = [];
      length = 0;
    }
    chunk.push(relativePath);
    length += relativePath.length + 1;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
};

const findNarrowing = (entries = [], query) => entries
  .filter((entry) => query.toLowerCase().includes(entry.query.toLowerCase()))
  .reduce((best, entry) => (!best || entry.paths.length < best.paths.length ? entry : best), null);

const remember = (root, query, paths) => {
  if (paths.length > NARROW_LIMIT) return;
  history.set(root, [{ query, paths }, ...(history.get(root) || [])].slice(0, HISTORY_SIZE));
};

const searchRoot = (id, root, query, targets, narrowed) => new Promise((resolve) => {
  const pattern = `(?m)^[ \\t]*(?:name|url)[ \\t]*:[^\\r\\n]*?${escapeRegex(query)}`;
  const child = spawn(RG_PATH, [...RG_ARGS, '--regexp', pattern, '--', ...targets], {
    cwd: narrowed ? root : undefined,
    stdio: ['ignore', 'pipe', 'ignore']
  });
  current.child = child;

  let buffer = '';
  let paths = [];
  const matched = [];

  const flush = () => {
    if (paths.length && isCurrent(id)) post({ type: 'batch', id, root, paths });
    paths = [];
  };

  const collect = (line) => {
    if (!line) return;
    const relativePath = path.relative(root, path.resolve(root, line));
    if (defaultClassify(relativePath)?.type !== 'request') return;
    paths.push(relativePath);
    if (matched.length <= NARROW_LIMIT) matched.push(relativePath);
    if (paths.length >= BATCH_SIZE) flush();
  };

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    if (!isCurrent(id)) return;
    const lines = (buffer + chunk).split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(collect);
  });

  child.on('error', () => resolve({ matched, failed: true }));

  child.on('close', (code) => {
    if (isCurrent(id)) {
      collect(buffer);
      flush();
    }
    resolve({ matched, failed: code === 2 });
  });
});

const search = async ({ id, roots, query }) => {
  stop();
  current = { id, child: null };

  for (const root of query ? roots : []) {
    const prior = findNarrowing(history.get(root), query);
    const rootMatches = [];
    let failed = false;
    for (const targets of prior ? chunkPaths(prior.paths) : [[root]]) {
      const result = await searchRoot(id, root, query, targets, Boolean(prior));
      if (!isCurrent(id)) return;
      if (rootMatches.length <= NARROW_LIMIT) rootMatches.push(...result.matched);
      failed = failed || result.failed;
    }
    if (failed) history.delete(root);
    else remember(root, query, rootMatches);
  }

  if (isCurrent(id)) {
    current = null;
    post({ type: 'done', id });
  }
};

process.parentPort.on('message', ({ data }) => {
  if (data.type === 'search') search(data);
  else if (data.type === 'cancel') {
    stop();
    history.clear();
  }
});
