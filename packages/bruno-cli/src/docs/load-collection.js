'use strict';
/**
 * packages/bruno-cli/src/docs/load-collection.js
 *
 * Reads a Bruno collection from disk and returns a normalized JS object.
 * Supports both:
 *   - OpenCollection YAML format (Bruno v3+, files: opencollection.yml + *.yml)
 *   - Classic .bru format (uses @usebruno/lang, same as the run command)
 *
 * The returned shape is:
 * {
 *   opencollection: '1.0.0',
 *   info: { name, version?, description? },
 *   config: {},
 *   environments: [{ name, variables: [{name, value, enabled, secret?}] }],
 *   items: [ FolderItem | RequestItem ]
 * }
 *
 * FolderItem:  { type:'folder', name, seq, description?, items: [...] }
 * RequestItem: { type:'request', info:{name,type,seq}, http:{...}, docs?, examples?, runtime?, settings? }
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Re-use @usebruno/lang for .bru files, exactly as run.js does.
// We lazy-require so the module only fails if someone actually has a .bru collection.
let _bruUtils = null;
/** Lazy-load and cache the @usebruno/lang bridge utility. */
function getBruUtils() {
  if (!_bruUtils) {
    try {
      _bruUtils = require('../utils/bru'); // the existing bru.js util in the CLI
    } catch {
      throw new Error(
        'Could not load @usebruno/lang. Make sure you are running inside the bruno-cli package.'
      );
    }
  }
  return _bruUtils;
}

// Directories that are never collection items
const SKIP_DIRS = new Set(['environments', 'node_modules', '.git', '.bruno']);

// Files at the root of a directory that are metadata, not requests
const META_FILES = new Set(['opencollection.yml', 'folder.yml', 'collection.yml', 'bruno.json']);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {string} collectionDir  Absolute path to the collection root
 * @param {{ titleOverride?: string }} options
 * @returns {CollectionModel}
 */
function loadCollection(collectionDir, { titleOverride = null } = {}) {
  const isOpenCollection = fs.existsSync(path.join(collectionDir, 'opencollection.yml'));

  const rootMeta = readRootMeta(collectionDir, isOpenCollection);
  const environments = readEnvironments(collectionDir, isOpenCollection);
  const items = isOpenCollection
    ? readOpenCollectionItems(collectionDir, collectionDir)
    : readBruItems(collectionDir, collectionDir);

  sortItems(items);

  return {
    opencollection: '1.0.0',
    info: {
      name: titleOverride || rootMeta.name || path.basename(collectionDir),
      ...(rootMeta.version ? { version: rootMeta.version } : {}),
      ...(rootMeta.description ? { description: rootMeta.description } : {})
    },
    config: rootMeta.config || {},
    environments,
    items
  };
}

// ── Root metadata ─────────────────────────────────────────────────────────────

/**
 * Read collection-level metadata (name, version, description, config)
 * from either opencollection.yml or bruno.json.
 * @param {string} collectionDir
 * @param {boolean} isOpenCollection
 * @returns {{ name: string|null, version: string|null, description: string|null, config: object }}
 */
function readRootMeta(collectionDir, isOpenCollection) {
  if (isOpenCollection) {
    const raw = loadYamlFile(path.join(collectionDir, 'opencollection.yml')) || {};
    const info = raw.info || raw;
    return {
      name: info.name || null,
      version: info.version || null,
      description: info.description || null,
      config: raw.config || {}
    };
  }

  // .bru format — read bruno.json
  const bruJson = path.join(collectionDir, 'bruno.json');
  if (fs.existsSync(bruJson)) {
    try {
      const d = JSON.parse(fs.readFileSync(bruJson, 'utf8'));
      return { name: d.name || null, version: d.version || null, description: null, config: {} };
    } catch { /* fall through */ }
  }

  return { name: null, version: null, description: null, config: {} };
}

// ── Environments ──────────────────────────────────────────────────────────────

/**
 * Read all environment files from the environments/ sub-directory.
 * Supports .yml (OpenCollection) and .bru (classic) formats.
 * @param {string} collectionDir
 * @param {boolean} isOpenCollection
 * @returns {Array<{ name: string, variables: Array }>}
 */
function readEnvironments(collectionDir, isOpenCollection) {
  const envDir = path.join(collectionDir, 'environments');
  if (!fs.existsSync(envDir)) return [];

  const results = [];
  for (const file of safeReaddir(envDir)) {
    const fp = path.join(envDir, file);

    if (isOpenCollection && file.endsWith('.yml')) {
      const raw = loadYamlFile(fp);
      if (!raw) continue;
      results.push({
        name: raw.name || path.basename(file, '.yml'),
        variables: normalizeEnvVars(raw.variables || raw.vars || [])
      });
      continue;
    }

    if (!isOpenCollection && file.endsWith('.bru')) {
      try {
        const { bruToEnvJson } = getBruUtils();
        const bru = fs.readFileSync(fp, 'utf8');
        const env = bruToEnvJson(bru);
        results.push({
          name: env.name || path.basename(file, '.bru'),
          variables: normalizeEnvVars(env.variables || [])
        });
      } catch { /* skip malformed env */ }
    }
  }
  return results;
}

/**
 * Normalise environment variables to a consistent { name, value, enabled, secret? } shape.
 * @param {Array} vars
 * @returns {Array}
 */
function normalizeEnvVars(vars) {
  if (!Array.isArray(vars)) return [];
  return vars
    .filter((v) => v && (v.name || v.key))
    .map((v) => ({
      name: v.name || v.key,
      value: v.value ?? '',
      enabled: v.enabled !== false,
      ...(v.secret ? { secret: true } : {})
    }));
}

// ── OpenCollection YAML items ─────────────────────────────────────────────────

/**
 * Recursively scan a directory for OpenCollection YAML items.
 * Directories become folders, .yml files become requests.
 * @param {string} dir
 * @param {string} rootDir
 * @returns {Array}
 */
function readOpenCollectionItems(dir, rootDir) {
  const items = [];

  for (const entry of safeReaddirWithTypes(dir)) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const folder = readOpenCollectionFolder(path.join(dir, entry.name), rootDir);
      if (folder) items.push(folder);
    } else if (entry.isFile() && entry.name.endsWith('.yml')) {
      if (META_FILES.has(entry.name)) continue;
      const req = readOpenCollectionRequest(path.join(dir, entry.name));
      if (req) items.push(req);
    }
  }
  return items;
}

/**
 * Read a folder.yml and recursively collect its child items.
 * @param {string} folderPath
 * @param {string} rootDir
 * @returns {object|null}
 */
function readOpenCollectionFolder(folderPath, rootDir) {
  const metaFile = path.join(folderPath, 'folder.yml');
  const raw = fs.existsSync(metaFile) ? (loadYamlFile(metaFile) || {}) : {};
  const m = raw.meta || raw;

  const children = readOpenCollectionItems(folderPath, rootDir);
  sortItems(children);

  return {
    type: 'folder',
    name: m.name || formatDirName(path.basename(folderPath)),
    seq: toSeq(m.seq),
    ...(m.description ? { description: m.description } : {}),
    ...(raw.auth ? { auth: raw.auth } : {}),
    ...(raw.config && Object.keys(raw.config).length ? { config: raw.config } : {}),
    items: children
  };
}

/**
 * Parse a single OpenCollection YAML request file.
 * Detects the protocol (http/graphql/grpc/websocket) and normalises the block.
 * @param {string} filePath
 * @returns {object|null}
 */
function readOpenCollectionRequest(filePath) {
  const raw = loadYamlFile(filePath);
  if (!raw || typeof raw !== 'object') return null;

  const type = (raw.info && raw.info.type) || detectProtocol(raw);
  if (!type) return null;

  const protocolKey = type; // 'http' | 'graphql' | 'grpc' | 'websocket'
  const proto = raw[protocolKey] || (type === 'http' ? raw.http : null) || {};

  const req = {
    type: 'request',
    info: {
      name: (raw.info && raw.info.name) || path.basename(filePath, '.yml'),
      type,
      seq: toSeq(raw.info && raw.info.seq)
    },
    [protocolKey]: normalizeProtocolBlock(proto, raw)
  };

  if (raw.runtime) req.runtime = normalizeRuntime(raw.runtime, raw.script);
  else if (raw.script && (raw.script.req || raw.script.res)) req.runtime = normalizeRuntime({}, raw.script);

  if (raw.docs && hasDocContent(raw.docs)) req.docs = raw.docs;
  if (Array.isArray(raw.examples) && raw.examples.length > 0) req.examples = raw.examples;
  if (raw.settings && Object.keys(raw.settings).length > 0) req.settings = raw.settings;

  return req;
}

// ── .bru items ────────────────────────────────────────────────────────────────

/**
 * Recursively scan a directory for .bru items.
 * @param {string} dir
 * @param {string} rootDir
 * @returns {Array}
 */
function readBruItems(dir, rootDir) {
  const items = [];
  const { bruToJson } = getBruUtils();

  for (const entry of safeReaddirWithTypes(dir)) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const folder = readBruFolder(path.join(dir, entry.name), rootDir);
      if (folder) items.push(folder);
    } else if (entry.isFile() && entry.name.endsWith('.bru')) {
      if (entry.name === 'collection.bru' || entry.name === 'folder.bru') continue;
      try {
        const raw = bruToJson(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
        const req = normalizeBruRequest(raw);
        if (req) items.push(req);
      } catch { /* skip malformed request */ }
    }
  }
  return items;
}

/**
 * Read a folder.bru for metadata, then recursively collect child items.
 * @param {string} folderPath
 * @param {string} rootDir
 * @returns {object|null}
 */
function readBruFolder(folderPath, rootDir) {
  const { collectionBruToJson } = getBruUtils();
  let name = formatDirName(path.basename(folderPath));
  let seq = Infinity;

  const folderBru = path.join(folderPath, 'folder.bru');
  if (fs.existsSync(folderBru)) {
    try {
      const raw = collectionBruToJson(fs.readFileSync(folderBru, 'utf8'));
      name = raw.name || name;
      seq = toSeq(raw.seq);
    } catch { /* use defaults */ }
  }

  const children = readBruItems(folderPath, rootDir);
  sortItems(children);

  return { type: 'folder', name, seq, items: children };
}

/**
 * Converts the shape returned by bruToJson (run.js format) to our canonical shape.
 */
function normalizeBruRequest(bruJson) {
  if (!bruJson || !bruJson.name) return null;

  const method = (bruJson.request && bruJson.request.method) || 'GET';
  const url = (bruJson.request && bruJson.request.url) || '';

  return {
    type: 'request',
    info: {
      name: bruJson.name,
      type: bruJson.type === 'graphql-request' ? 'graphql' : 'http',
      seq: toSeq(bruJson.seq)
    },
    http: {
      method,
      url,
      ...(bruJson.request.headers && bruJson.request.headers.length ? { headers: bruJson.request.headers } : {}),
      ...(bruJson.request.params && bruJson.request.params.length ? { params: bruJson.request.params } : {}),
      ...(bruJson.request.body && bruJson.request.body.mode !== 'none' ? { body: normalizeBruBody(bruJson.request.body) } : {}),
      ...(bruJson.request.auth ? { auth: bruJson.request.auth } : {})
    },
    ...(bruJson.request.script ? { runtime: normalizeRuntime({}, bruJson.request.script) } : {})
  };
}

/**
 * Normalise a .bru body object to { type, data }.
 * @param {object} body
 * @returns {object|null}
 */
function normalizeBruBody(body) {
  if (!body || body.mode === 'none') return null;

  const data = body[body.mode];

  return {
    type: body.mode || 'text',
    data: typeof data === 'object'
      ? JSON.stringify(data, null, 2)
      : data || ''
  };
}

// ── Normalization helpers ─────────────────────────────────────────────────────

/**
 * Normalise a protocol block (http/graphql/grpc/websocket) to a consistent shape.
 * Coerces method to uppercase string.  Returns empty object if input is falsy.
 * @param {object} proto
 * @param {object} rawRequest  The full raw request (fallback for auth)
 * @returns {object}
 */
function normalizeProtocolBlock(proto, rawRequest) {
  if (!proto || typeof proto !== 'object') return {};

  const out = {};
  if (proto.method) out.method = String(proto.method).toUpperCase();
  if (proto.url) out.url = proto.url;
  if (proto.path) out.path = proto.path; // grpc

  if (Array.isArray(proto.headers) && proto.headers.length)
    out.headers = normalizeKvArray(proto.headers);

  if (Array.isArray(proto.params) && proto.params.length)
    out.params = normalizeKvArray(proto.params);
  else if (Array.isArray(proto.query) && proto.query.length)
    out.params = normalizeKvArray(proto.query);

  if (proto.body && proto.body.type && proto.body.type !== 'none') {
    const type = proto.body.type;

    out.body = { type };

    if (type === 'form-urlencoded' || type === 'multipart-form') {
      if (Array.isArray(proto.body.fields) && proto.body.fields.length) {
        out.body.fields = normalizeKvArray(proto.body.fields);
      }
      return out;
    }

    if (proto.body.data !== undefined && proto.body.data !== null && proto.body.data !== '') {
      if (typeof proto.body.data === 'object') {
        out.body.data = JSON.stringify(proto.body.data, null, 2);
      } else {
        out.body.data = String(proto.body.data);
      }
    }
  }
  const auth = proto.auth || rawRequest.auth;
  if (auth) out.auth = typeof auth === 'string' ? auth : { ...auth };

  return out;
}

/**
 * Normalise an array of { name, key, value, ... } objects to { name, value, enabled?, description? }.
 * Filters out entries without a name or key.
 * @param {Array} arr
 * @returns {Array}
 */
function normalizeKvArray(arr) {
  return arr
    .filter((i) => i && (i.name || i.key))
    .map((i) => ({
      name: i.name || i.key,
      value: i.value ?? '',
      ...(i.enabled === false ? { enabled: false } : {}),
      ...(i.description ? { description: i.description } : {})
    }));
}

/**
 * Normalise runtime scripts from both OpenCollection (runtime.scripts) and legacy .bru (script.req/res) formats.
 * @param {object} runtime
 * @param {object} [legacyScript]
 * @returns {object|undefined}
 */
function normalizeRuntime(runtime, legacyScript) {
  const scripts = [];

  if (Array.isArray(runtime.scripts)) {
    for (const s of runtime.scripts) {
      if (s && s.code) scripts.push({ type: s.type || 'pre-request', code: String(s.code) });
    }
  }

  // Legacy .bru script block: { req, res }
  if (legacyScript) {
    if (legacyScript.req) scripts.push({ type: 'pre-request', code: String(legacyScript.req) });
    if (legacyScript.res) scripts.push({ type: 'post-response', code: String(legacyScript.res) });
  }

  const out = {};
  if (scripts.length) out.scripts = scripts;
  if (runtime.auth) out.auth = runtime.auth;
  if (runtime.vars) out.vars = runtime.vars;

  return Object.keys(out).length ? out : undefined;
}

// ── Detection helpers ─────────────────────────────────────────────────────────

/**
 * Detect the request protocol from the top-level keys of a raw OpenCollection request.
 * @param {object} raw
 * @returns {string|null}
 */
function detectProtocol(raw) {
  if (raw.http) return 'http';
  if (raw.graphql) return 'graphql';
  if (raw.grpc) return 'grpc';
  if (raw.websocket) return 'websocket';
  if (raw.info && raw.info.name) return 'http'; // fallback
  return null;
}

function hasDocContent(docs) {
  return !!(docs && (docs.description || docs.content || docs.body || docs.markdown));
}

// ── Sorting ───────────────────────────────────────────────────────────────────

/**
 * Sort items in-place by seq, then by name (case-insensitive).
 * @param {Array} items
 */
function sortItems(items) {
  items.sort((a, b) => {
    const sa = toSeq(a.seq ?? (a.info && a.info.seq));
    const sb = toSeq(b.seq ?? (b.info && b.info.seq));
    if (sa !== sb) return sa - sb;
    const na = a.name || (a.info && a.info.name) || '';
    const nb = b.name || (b.info && b.info.name) || '';
    return na.localeCompare(nb);
  });
}

// ── Low-level utils ───────────────────────────────────────────────────────────

/** Read and parse a YAML file, returning null on any failure. */
function loadYamlFile(fp) {
  try {
    return yaml.load(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

/** Safe directory listing that returns empty array on error. */
function safeReaddir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}

/** Safe directory listing with file-type metadata. */
function safeReaddirWithTypes(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

/** Convert a value to a numeric sequence number, defaulting to Infinity. */
function toSeq(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : Infinity;
}

/** Convert a directory name (kebab-case, snake_case) to Title Case. */
function formatDirName(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = { loadCollection };
