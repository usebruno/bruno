const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jsyaml = require('js-yaml');
const { dereference } = require('@apidevtools/json-schema-ref-parser');

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const arrayToJsonPointer = (tokens) => `/${tokens.map((t) => String(t).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;

const collectIdsAndAnchors = (node, currentPath, currentId, idMap, anchorMap) => {
  if (Array.isArray(node)) {
    node.forEach((item, index) => collectIdsAndAnchors(item, [...currentPath, index], currentId, idMap, anchorMap));
    return;
  }
  if (!isPlainObject(node)) return;

  if (typeof node.$id === 'string') {
    idMap.set(node.$id, currentPath);
    currentId = node.$id;
  }
  if (typeof node.$anchor === 'string' && currentId) {
    anchorMap.set(`${currentId}#${node.$anchor}`, currentPath);
  }

  for (const [key, value] of Object.entries(node)) {
    collectIdsAndAnchors(value, [...currentPath, key], currentId, idMap, anchorMap);
  }
};

const isRemoteUri = (value) => /^([a-z][a-z0-9+.-]*:)?\/\//i.test(value);

const rewriteIdBasedRefs = (node, idMap, anchorMap) => {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteIdBasedRefs(item, idMap, anchorMap));
  }
  if (!isPlainObject(node)) return node;

  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && !value.startsWith('#') && !isRemoteUri(value)) {
      const hashIndex = value.indexOf('#');
      const base = hashIndex === -1 ? value : value.slice(0, hashIndex);
      const fragment = hashIndex === -1 ? null : value.slice(hashIndex + 1);

      if (fragment == null && idMap.has(base)) {
        result[key] = `#${arrayToJsonPointer(idMap.get(base))}`;
        continue;
      }
      if (fragment != null && anchorMap.has(`${base}#${fragment}`)) {
        result[key] = `#${arrayToJsonPointer(anchorMap.get(`${base}#${fragment}`))}`;
        continue;
      }
    }
    result[key] = rewriteIdBasedRefs(value, idMap, anchorMap);
  }
  return result;
};

const IDENTIFYING_SCHEMA_FIELDS = ['type', 'title', 'description'];

const truncateCycles = (value, ancestors = new Set()) => {
  if (value === null || typeof value !== 'object') return value;

  if (ancestors.has(value)) {
    if (Array.isArray(value)) return [];
    const stub = {};
    for (const field of IDENTIFYING_SCHEMA_FIELDS) {
      if (typeof value[field] === 'string') stub[field] = value[field];
    }
    return stub;
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => truncateCycles(item, nextAncestors));
  }
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = truncateCycles(val, nextAncestors);
  }
  return result;
};

const resolveOpenApiSpecRefs = async (pathname) => {
  if (!pathname || !fs.existsSync(pathname)) {
    return { error: 'Spec file not found' };
  }

  let normalizedPathname = pathname;
  try {
    const parsed = jsyaml.load(fs.readFileSync(pathname, 'utf8'));
    const idMap = new Map();
    const anchorMap = new Map();
    collectIdsAndAnchors(parsed, [], null, idMap, anchorMap);

    if (idMap.size > 0) {
      normalizedPathname = path.join(
        path.dirname(pathname),
        `.bruno-openapi-resolve-${crypto.randomUUID()}.json`
      );
      fs.writeFileSync(normalizedPathname, JSON.stringify(rewriteIdBasedRefs(parsed, idMap, anchorMap)));
    }

    const spec = await dereference(normalizedPathname);
    return { spec: truncateCycles(spec) };
  } catch (error) {
    return { error: error.message || 'Failed to resolve spec references' };
  } finally {
    if (normalizedPathname !== pathname) {
      fs.rmSync(normalizedPathname, { force: true });
    }
  }
};

module.exports = { resolveOpenApiSpecRefs, truncateCycles, rewriteIdBasedRefs, collectIdsAndAnchors };
