'use strict';
/**
 * packages/bruno-cli/src/docs/build-yaml.js
 *
 * Converts the normalized collection object (from load-collection.js) into a
 * single OpenCollection YAML string suitable for embedding in the HTML viewer.
 *
 * Key serialization choices:
 *  - lineWidth: -1    → URLs and long values are never broken across lines
 *  - noRefs: true     → no YAML anchors/aliases; the viewer may not support them
 *  - sortKeys: false  → preserve semantic order (info before http before docs, etc.)
 *  - Multiline strings (body.data, script code) serialize as YAML block literals
 *    automatically when they contain newlines — js-yaml handles this.
 */

const yaml = require('js-yaml');

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {CollectionModel} collection
 * @returns {string}  Valid YAML string
 */
function buildYaml(collection) {
  const doc = assembleDocument(collection);

  return yaml.dump(doc, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '\'',
    forceQuotes: false,
    condenseFlow: false,
    sortKeys: false
  });
}

/**
 * Validates that the produced YAML can be round-tripped.
 * @param {string} yamlStr
 * @returns {{ valid: boolean, error?: string }}
 */
function validateYaml(yamlStr) {
  try {
    const parsed = yaml.load(yamlStr);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'YAML parsed to a non-object value' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ── Document assembly ─────────────────────────────────────────────────────────

function assembleDocument(col) {
  const doc = { opencollection: col.opencollection || '1.0.0' };

  doc.info = compact({ ...col.info });

  if (col.config && Object.keys(col.config).length > 0) {
    doc.config = col.config;
  }

  if (col.environments && col.environments.length > 0) {
    doc.environments = col.environments.map(serializeEnvironment);
  }

  if (col.items && col.items.length > 0) {
    doc.items = col.items.map(serializeItem);
  }

  return doc;
}

// ── Environments ──────────────────────────────────────────────────────────────

function serializeEnvironment(env) {
  return {
    name: env.name,
    variables: (env.variables || []).map((v) => compact({
      name: v.name,
      value: v.value ?? '',
      enabled: v.enabled !== false ? undefined : false, // omit if true (default)
      secret: v.secret || undefined
    }))
  };
}

// ── Items (folders and requests) ──────────────────────────────────────────────

function serializeItem(item) {
  return item.type === 'folder' ? serializeFolder(item) : serializeRequest(item);
}

function serializeFolder(folder) {
  const out = {
    type: 'folder',
    name: folder.name
  };

  if (Number.isFinite(folder.seq)) out.seq = folder.seq;
  if (folder.description) out.description = folder.description;
  if (folder.auth) out.auth = folder.auth;
  if (folder.config && Object.keys(folder.config).length > 0) out.config = folder.config;

  if (folder.items && folder.items.length > 0) {
    out.items = folder.items.map(serializeItem);
  }

  return out;
}

function serializeRequest(req) {
  // Determine protocol key: http | graphql | grpc | websocket
  const protocolKey = ['http', 'graphql', 'grpc', 'websocket'].find((k) => req[k]);

  const out = {};

  // info block always first
  out.info = serializeRequestInfo(req.info);

  // protocol block
  if (protocolKey && req[protocolKey]) {
    out[protocolKey] = serializeProtocolBlock(req[protocolKey]);
  }

  // optional blocks — only if present
  if (req.runtime) {
    const r = serializeRuntime(req.runtime);
    if (r) out.runtime = r;
  }

  if (req.docs) out.docs = req.docs;
  if (req.examples && req.examples.length > 0) out.examples = req.examples;
  if (req.settings && Object.keys(req.settings).length > 0) out.settings = req.settings;

  return out;
}

function serializeRequestInfo(info) {
  return compact({
    name: info.name,
    type: info.type || 'http',
    seq: Number.isFinite(info.seq) ? info.seq : undefined,
    description: info.description || undefined
  });
}

function serializeProtocolBlock(block) {
  if (!block || typeof block !== 'object') return {};

  const out = {};

  if (block.method) out.method = block.method;
  if (block.url) out.url = block.url;
  if (block.path) out.path = block.path;

  if (Array.isArray(block.headers) && block.headers.length > 0) {
    out.headers = block.headers;
  }

  if (Array.isArray(block.params) && block.params.length > 0) {
    out.params = block.params;
  }

  if (block.body) {
    const body = serializeBody(block.body);
    if (body) out.body = body;
  }

  if (block.auth !== undefined && block.auth !== null) {
    out.auth = block.auth;
  }

  return out;
}

function serializeBody(body) {
  if (!body || !body.type || body.type === 'none') return null;

  const out = { type: body.type };

  if (body.data !== undefined && body.data !== null && body.data !== '') {
    // Force to string. If it contains newlines, js-yaml will use block literal (|).
    out.data = String(body.data);
  }

  if (Array.isArray(body.fields) && body.fields.length > 0) {
    out.fields = body.fields;
  }

  return out;
}

function serializeRuntime(runtime) {
  if (!runtime) return null;
  const out = {};

  if (Array.isArray(runtime.scripts) && runtime.scripts.length > 0) {
    out.scripts = runtime.scripts.map((s) => ({
      type: s.type || 'pre-request',
      code: String(s.code || '') // multiline → block literal automatically
    }));
  }

  if (runtime.auth) out.auth = runtime.auth;
  if (runtime.vars) out.vars = runtime.vars;

  return Object.keys(out).length > 0 ? out : null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Remove keys whose value is undefined (not null — null is a valid YAML value). */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

module.exports = { buildYaml, validateYaml };
