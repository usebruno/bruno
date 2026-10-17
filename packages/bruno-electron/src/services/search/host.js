const path = require('node:path');
const { spawn } = require('node:child_process');
const { rgPath } = require('@vscode/ripgrep');
const { defaultClassify } = require('../../utils/mount');
const { getPool, JobType } = require('../pool');

const RG_PATH = rgPath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const BATCH_SIZE = 200;
const NARROW_LIMIT = 2000;
const HISTORY_SIZE = 10;
const ARGS_LENGTH_LIMIT = 30000;
const RG_ARGS = [
  '--files-with-matches',
  '--multiline',
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
getPool({ minWorkers: 'max' });

const post = (message) => process.parentPort.postMessage(message);

const escapeRegex = (text) => text.replace(/[\\^$.|?*+()[\]{}]/g, '\\$&');

const namePatterns = (query) => {
  const term = escapeRegex(query);
  return [
    `(?m)^meta[ \\t]*\\{[ \\t]*\\r?\\n(?:(?:[^}\\r\\n][^\\r\\n]*)?\\r?\\n)*?[ \\t]*name[ \\t]*:[^\\r\\n]*?${term}`,
    `(?m)^info:[ \\t]*\\r?\\n(?:(?:  [^\\r\\n]*)?\\r?\\n)*?  name:[^\\r\\n]*?${term}`
  ];
};

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
  const patterns = namePatterns(query).flatMap((pattern) => ['--regexp', pattern]);
  const child = spawn(RG_PATH, [...RG_ARGS, ...patterns, '--', ...targets], {
    cwd: narrowed ? root : undefined,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  current.child = child;

  let buffer = '';
  let stderr = '';
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
    matched.push(relativePath);
    if (paths.length >= BATCH_SIZE) flush();
  };

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    if (!isCurrent(id)) return;
    const lines = (buffer + chunk).split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(collect);
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  child.on('error', (error) => resolve({ matched, error: error.message }));

  child.on('close', (code) => {
    if (isCurrent(id)) {
      collect(buffer);
      flush();
    }
    resolve({ matched, error: code === 2 ? stderr.trim() : null });
  });
});

const search = async ({ id, roots, query }) => {
  stop();
  current = { id, child: null };

  let total = 0;
  const errors = [];
  for (const root of query ? roots : []) {
    const prior = findNarrowing(history.get(root), query);
    const narrowed = Boolean(prior);
    const rootMatches = [];
    let rootError = null;
    for (const targets of narrowed ? chunkPaths(prior.paths) : [[root]]) {
      const { matched, error } = await searchRoot(id, root, query, targets, narrowed);
      if (!isCurrent(id)) return;
      rootMatches.push(...matched);
      rootError = rootError || error;
    }
    total += rootMatches.length;
    if (rootError) {
      history.delete(root);
      errors.push({ root, error: rootError });
    } else {
      remember(root, query, rootMatches);
    }
  }

  if (!isCurrent(id)) return;
  current = null;
  post({ type: 'done', id, total, errors });
};

const parse = async ({ requestId, collectionPath, files }) => {
  const settled = await Promise.allSettled(files.map((file) => getPool().run(JobType.ParseFile, { collectionPath, ...file })));
  const results = settled.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  post({ type: 'parsed', requestId, results });
};

process.parentPort.on('message', ({ data }) => {
  if (data.type === 'search') search(data);
  else if (data.type === 'cancel') {
    stop();
    history.clear();
  } else if (data.type === 'parse') parse(data);
});
