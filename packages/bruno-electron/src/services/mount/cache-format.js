const { REQUEST_UID_PATHS, EXAMPLE_UID_PATHS } = require('./tree-builder');

const DEFAULTS_KEY = '__defaults';

const nullDefault = (value) => value === null;
const emptyListDefault = (value) => Array.isArray(value) && value.length === 0;

const DEFAULTS = [
  ...[
    'settings', 'app', 'fileContent', 'root', 'filename', 'pathname',
    'request.tests', 'request.docs',
    'request.auth.awsv4', 'request.auth.basic', 'request.auth.bearer', 'request.auth.digest', 'request.auth.ntlm',
    'request.auth.oauth2', 'request.auth.wsse', 'request.auth.apikey', 'request.auth.akamaiEdgegrid',
    'request.body.json', 'request.body.text', 'request.body.xml', 'request.body.sparql', 'request.body.graphql',
    'request.script.req', 'request.script.res'
  ].map((dotPath) => ({ dotPath, isDefault: nullDefault, empty: () => null })),
  ...[
    'tags', 'items', 'examples',
    'request.headers', 'request.params', 'request.assertions',
    'request.body.formUrlEncoded', 'request.body.multipartForm', 'request.body.file',
    'request.vars.req', 'request.vars.res'
  ].map((dotPath) => ({ dotPath, isDefault: emptyListDefault, empty: () => [] }))
].map((entry) => {
  const segments = entry.dotPath.split('.');
  return { ...entry, parents: segments.slice(0, -1), key: segments[segments.length - 1] };
});

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const peek = (root, parents) => {
  let node = root;
  for (const segment of parents) {
    node = node[segment];
    if (!isObject(node)) return null;
  }
  return node;
};

const copyAlong = (root, parents, copies) => {
  let node = root;
  for (const segment of parents) {
    const child = node[segment];
    let copy = copies.get(child);
    if (!copy) {
      copy = { ...child };
      copies.set(child, copy);
      copies.set(copy, copy);
      node[segment] = copy;
    }
    node = copy;
  }
  return node;
};

const withoutUid = (item) => {
  if (!isObject(item) || !('uid' in item)) return item;
  const rest = { ...item };
  delete rest.uid;
  return rest;
};

const stripListUids = (root, uidPaths, copies) => {
  for (const [dotPath] of uidPaths) {
    const segments = dotPath.split('.');
    const parents = segments.slice(0, -1);
    const key = segments[segments.length - 1];
    const container = peek(root, parents);
    if (!container || !Array.isArray(container[key])) continue;
    copyAlong(root, parents, copies)[key] = container[key].map(withoutUid);
  }
};

const withoutExampleUids = (example) => {
  if (!isObject(example)) return example;
  const copy = { ...example };
  delete copy.uid;
  delete copy.itemUid;
  stripListUids(copy, EXAMPLE_UID_PATHS, new Map());
  return copy;
};

const toCacheData = (data) => {
  if (!isObject(data)) return data;

  const root = { ...data };
  const copies = new Map();
  let mask = 0;

  delete root.uid;
  stripListUids(root, REQUEST_UID_PATHS, copies);
  if (Array.isArray(root.examples)) root.examples = root.examples.map(withoutExampleUids);

  DEFAULTS.forEach(({ parents, key, isDefault }, index) => {
    const container = peek(root, parents);
    if (!container || !(key in container) || !isDefault(container[key])) return;
    delete copyAlong(root, parents, copies)[key];
    mask += 2 ** index;
  });

  if (mask) root[DEFAULTS_KEY] = mask;
  return root;
};

const fromCacheData = (data) => {
  if (!isObject(data) || typeof data[DEFAULTS_KEY] !== 'number') return data;

  const mask = data[DEFAULTS_KEY];
  delete data[DEFAULTS_KEY];
  DEFAULTS.forEach(({ parents, key, empty }, index) => {
    if (Math.floor(mask / 2 ** index) % 2 !== 1) return;
    let node = data;
    for (const segment of parents) {
      if (!isObject(node[segment])) node[segment] = {};
      node = node[segment];
    }
    node[key] = empty();
  });
  return data;
};

module.exports = { toCacheData, fromCacheData, DEFAULTS };
