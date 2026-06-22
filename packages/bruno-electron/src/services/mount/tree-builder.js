const path = require('node:path');
const {
  posixifyPath,
  idForAbsolutePath,
  uidForSeed,
  defaultClassify
} = require('../../utils/mount');

const REQUEST_EXT_RE = /\.(bru|yml|yaml)$/i;
const stripExt = (basename) => basename.replace(REQUEST_EXT_RE, '');

const isSeqValid = (seq) => Number.isFinite(seq) && Number.isInteger(seq) && seq > 0;

// lists that get deterministic uids; section tag keeps reorders within one list local
const REQUEST_UID_PATHS = [
  ['request.params', 'params'],
  ['request.headers', 'headers'],
  ['request.vars.req', 'vars.req'],
  ['request.vars.res', 'vars.res'],
  ['request.assertions', 'assertions'],
  ['request.body.formUrlEncoded', 'body.formUrlEncoded'],
  ['request.body.multipartForm', 'body.multipartForm'],
  ['request.body.file', 'body.file']
];

const EXAMPLE_UID_PATHS = [
  ['request.params', 'params'],
  ['request.headers', 'headers'],
  ['request.body.formUrlEncoded', 'body.formUrlEncoded'],
  ['request.body.multipartForm', 'body.multipartForm'],
  ['request.body.file', 'body.file'],
  ['response.headers', 'response.headers']
];

const hydrateListAt = (root, dotPath, seed, section) => {
  let cur = root;
  for (const p of dotPath.split('.')) {
    if (!cur || typeof cur !== 'object') return;
    cur = cur[p];
  }
  if (!Array.isArray(cur)) return;
  cur.forEach((item, i) => {
    item.uid = uidForSeed(`${seed}#${section}#${i}`);
  });
};

const hydrateRequestUuids = (data, parentUid, absolutePath) => {
  if (!data || typeof data !== 'object') return;
  const seed = posixifyPath(absolutePath);
  for (const [p, sec] of REQUEST_UID_PATHS) hydrateListAt(data, p, seed, sec);
  if (!Array.isArray(data.examples)) return;
  data.examples.forEach((example, i) => {
    const exSeed = `${seed}#example#${i}`;
    example.uid = uidForSeed(exSeed);
    if (parentUid) example.itemUid = parentUid;
    for (const [p, sec] of EXAMPLE_UID_PATHS) hydrateListAt(example, p, exSeed, sec);
  });
};

// alpha by name, then any folder with a valid seq pins to that position (v1 quirk)
const sortByNameThenSequence = (items) => {
  const sorted = [...items].sort((a, b) =>
    a.name && b.name ? a.name.localeCompare(b.name) : 0
  );
  const withoutSeq = sorted.filter((f) => !isSeqValid(f.seq));
  const withSeq = sorted.filter((f) => isSeqValid(f.seq)).sort((a, b) => a.seq - b.seq);

  withSeq.forEach((item) => {
    const existing = withoutSeq[item.seq - 1];
    const collides = Array.isArray(existing)
      ? existing[0]?.seq === item.seq
      : existing?.seq === item.seq;
    if (collides) {
      const group = Array.isArray(existing) ? [...existing, item] : [existing, item];
      withoutSeq.splice(item.seq - 1, 1, group);
    } else {
      withoutSeq.splice(item.seq - 1, 0, item);
    }
  });
  return withoutSeq.flat();
};

const sortLevel = (items) => {
  const folders = items.filter((i) => i.type === 'folder');
  const requests = items.filter((i) => i.type !== 'folder');
  const sortedFolders = sortByNameThenSequence(folders);
  for (const f of sortedFolders) f.items = sortLevel(f.items);
  const sortedRequests = [...requests].sort((a, b) => (a.seq ?? 1) - (b.seq ?? 1));
  return [...sortedFolders, ...sortedRequests];
};

const ensureFolder = (collectionPath, items, segments, uidFor) => {
  let cursor = items;
  let acc = '';
  let last = null;
  for (const seg of segments) {
    acc = acc ? path.join(acc, seg) : seg;
    const absolutePath = path.join(collectionPath, acc);
    let folder = cursor.find((i) => i.type === 'folder' && i.filename === seg);
    if (!folder) {
      folder = {
        uid: uidFor(absolutePath),
        name: seg,
        filename: seg,
        pathname: absolutePath,
        type: 'folder',
        collapsed: true,
        items: []
      };
      cursor.push(folder);
    }
    cursor = folder.items;
    last = folder;
  }
  return { cursor, folder: last };
};

const buildRequestNode = (absolutePath, basename, entry, uidOverrides, uidFor) => {
  const uid = uidOverrides?.get(absolutePath) || uidFor(absolutePath);
  const data = entry.data || {};
  hydrateRequestUuids(data, uid, absolutePath);
  return {
    uid,
    name: data.name || stripExt(basename),
    type: data.type || 'http-request',
    seq: data.seq,
    tags: data.tags,
    request: data.request,
    settings: data.settings,
    examples: data.examples,
    filename: basename,
    pathname: absolutePath,
    draft: null,
    partial: false,
    loading: false,
    ...(entry.error ? { error: entry.error, partial: true } : {})
  };
};

const buildEnvironmentNode = (collectionPath, relativePath, entry, uidFor) => {
  const basename = path.basename(relativePath);
  const absolutePath = path.join(collectionPath, relativePath);
  const data = entry.data || {};
  return {
    uid: uidFor(absolutePath),
    name: stripExt(basename),
    variables: data.variables || [],
    ...(entry.error ? { error: entry.error } : {})
  };
};

const buildTree = (collectionPath, parserResults, options = {}) => {
  const uidOverrides = options.uidOverrides;
  const uidFor = options.uidFor || idForAbsolutePath;
  const transientEntries = options.transientEntries || [];

  const tree = {
    pathname: collectionPath,
    brunoConfig: null,
    root: null,
    items: [],
    environments: []
  };

  const folderRoots = new Map();
  const requests = [];

  for (const [relativePath, entry] of parserResults) {
    const cls = defaultClassify(relativePath);
    if (!cls) continue;

    if (cls.type === 'config') {
      tree.brunoConfig = entry.error ? null : entry.data;
    } else if (cls.type === 'collection') {
      if (!entry.error) {
        const data = entry.data;
        if (data && typeof data === 'object' && 'collectionRoot' in data && 'brunoConfig' in data) {
          hydrateRequestUuids(data.collectionRoot, null, collectionPath);
          tree.root = data.collectionRoot;
          tree.brunoConfig = data.brunoConfig;
        } else {
          hydrateRequestUuids(data, null, collectionPath);
          tree.root = data;
        }
      }
    } else if (cls.type === 'folder') {
      folderRoots.set(path.dirname(relativePath), entry);
    } else if (cls.type === 'environment') {
      tree.environments.push(buildEnvironmentNode(collectionPath, relativePath, entry, uidFor));
    } else {
      requests.push({ relativePath, entry });
    }
  }

  for (const { relativePath, entry } of requests) {
    const segments = path.dirname(relativePath).split(path.sep).filter((s) => s && s !== '.');
    const { cursor } = ensureFolder(collectionPath, tree.items, segments, uidFor);
    cursor.push(buildRequestNode(
      path.join(collectionPath, relativePath),
      path.basename(relativePath),
      entry,
      uidOverrides,
      uidFor
    ));
  }

  for (const [dirRel, entry] of folderRoots) {
    const segments = dirRel.split(path.sep).filter((s) => s && s !== '.');
    const { folder } = ensureFolder(collectionPath, tree.items, segments, uidFor);
    if (!folder) continue;
    const meta = entry.data?.meta || {};
    if (meta.name) folder.name = meta.name;
    if (isSeqValid(meta.seq)) folder.seq = meta.seq;
    if (!entry.error) {
      hydrateRequestUuids(entry.data, folder.uid, folder.pathname);
      folder.root = entry.data;
    }
  }

  for (const t of transientEntries) {
    if (!t || !t.absolutePath) continue;
    const node = buildRequestNode(
      t.absolutePath,
      path.basename(t.absolutePath),
      t,
      uidOverrides,
      uidFor
    );
    node.isTransient = true;
    tree.items.push(node);
  }

  tree.items = sortLevel(tree.items);
  return tree;
};

module.exports = { buildTree };
