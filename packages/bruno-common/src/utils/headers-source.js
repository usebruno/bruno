const norm = (name) => String(name ?? '').trim().toLowerCase();

// Normalize a headers collection (array of {name,value} or a plain name->value object) to a list.
export const toEntries = (headers) => {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers.map((h) => ({ name: h?.name, value: h?.value }));
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
};

// name(lowercased) -> header uid, for enabled headers in a definition list.
const enabledHeaderMap = (headers) => {
  const map = new Map();
  (Array.isArray(headers) ? headers : []).forEach((h) => {
    if (h && h.enabled !== false && norm(h.name)) map.set(norm(h.name), h.uid);
  });
  return map;
};

// The transport-level "default" headers (Accept, User-Agent, Accept-Encoding, Host, Connection, …)
// are added by the axios instance/adapter and never make it into the request definition. They exist
// only as `requestHeader` entries in the network timeline (the same source the Network tab reads).
const parseTimelineHeaders = (timeline) => {
  if (!Array.isArray(timeline)) return [];
  const out = [];
  timeline.forEach((entry) => {
    if (entry?.type !== 'requestHeader' || typeof entry.message !== 'string') return;
    const idx = entry.message.indexOf(':');
    if (idx === -1) return;
    const name = entry.message.slice(0, idx).trim();
    if (!name) return;
    out.push({ name, value: entry.message.slice(idx + 1).trim() });
  });
  return out;
};

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Best-effort static check: the 1-based line where this pre-request script sets the given header
// (via req.setHeader or a req.headers[...] / req.headers.x assignment), else null. Used only to
// attribute an already-detected script-set header to its level/line — a miss falls back to line 1.
const scriptHeaderLine = (script, name) => {
  if (!script || !name) return null;
  const n = escapeRegExp(name);
  const patterns = [
    new RegExp(`setHeader\\s*\\(\\s*[\`'"]${n}[\`'"]`, 'i'),
    new RegExp(`headers\\s*\\[\\s*[\`'"]${n}[\`'"]\\s*\\]`, 'i'),
    new RegExp(`headers\\s*\\.\\s*${n}(?![\\w-])`, 'i')
  ];
  const lines = String(script).split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (patterns.some((re) => re.test(lines[i]))) return i + 1;
  }
  return null;
};

/**
 * Attribute the headers actually sent with a request to their source and group them into a
 * collapsible sections tree. Header sources (default / collection / folder / request) each become a
 * section; script-set headers are grouped under a "Script" section with Collection / Folder / Request
 * Script sub-sections. Each non-default row carries `nav` metadata describing where to jump to (a
 * headers table row, or a pre-request script line).
 *
 * Names come from the request definition (collection / folder / request); resolved values come from
 * what was sent on the wire (the network timeline), falling back to the merged request object. A
 * header defined at multiple levels shows only under the level that wins: script > request > folder >
 * collection > (transport) default.
 *
 * `treePath` is the collection-root-to-item path (folders + the item), as produced by the app's
 * getTreePathFromCollectionToItem — passed in so this package stays free of app collection helpers.
 */
export const buildHeaderSections = ({ collection, item, treePath = [], request, timeline }) => {
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionHeaders = enabledHeaderMap(collectionRoot?.request?.headers || []);
  const collectionScript = collectionRoot?.request?.script?.req || '';

  const folderHeaders = new Map(); // name -> { folderUid, headerUid }; deeper folder wins
  const folderScripts = []; // { uid, script } in collection->item order
  treePath.forEach((node) => {
    if (node?.type !== 'folder') return;
    const folderRoot = node?.draft || node?.root || {};
    enabledHeaderMap(folderRoot?.request?.headers || []).forEach((headerUid, name) => {
      folderHeaders.set(name, { folderUid: node.uid, headerUid });
    });
    const s = folderRoot?.request?.script?.req || '';
    if (s) folderScripts.push({ uid: node.uid, script: s });
  });

  const itemHeaders = item?.draft ? item?.draft?.request?.headers || [] : item?.request?.headers || [];
  const requestHeaders = enabledHeaderMap(itemHeaders);
  const requestScript = item?.draft ? item?.draft?.request?.script?.req || '' : item?.request?.script?.req || '';

  // Headers the pre-request script added/changed via req.setHeader (recorded by the network layer).
  const scriptSetNames = new Set((Array.isArray(request?.scriptSetHeaders) ? request.scriptSetHeaders : []).map(norm));

  // Which level's script set this header, and where. { level, folderUid?, line } | null.
  const scriptInfoOf = (name) => {
    let line = scriptHeaderLine(requestScript, name);
    if (line) return { level: 'request', line };
    for (const f of folderScripts) {
      line = scriptHeaderLine(f.script, name);
      if (line) return { level: 'folder', folderUid: f.uid, line };
    }
    line = scriptHeaderLine(collectionScript, name);
    if (line) return { level: 'collection', line };
    return null;
  };

  // Prefer the wire log (resolved values); fall back to the merged request object.
  const sent = parseTimelineHeaders(timeline);
  const sentEntries = sent.length ? sent : toEntries(request?.headers);

  const buckets = { default: [], collection: [], folder: [], request: [] };
  const scriptBuckets = { collection: [], folder: [], request: [] };
  const seen = new Set();
  sentEntries.forEach((h) => {
    const key = norm(h.name);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const scriptInfo = scriptInfoOf(h.name);
    // A script setting a header wins over any definition it overrides, so it's checked first.
    if (scriptSetNames.has(key) || scriptInfo) {
      const level = scriptInfo?.level || 'request';
      scriptBuckets[level].push({
        name: h.name,
        value: h.value,
        nav: { kind: 'script', level, folderUid: scriptInfo?.folderUid, line: scriptInfo?.line || 1 }
      });
    } else if (requestHeaders.has(key)) {
      buckets.request.push({ name: h.name, value: h.value, nav: { kind: 'request', headerUid: requestHeaders.get(key) } });
    } else if (folderHeaders.has(key)) {
      const f = folderHeaders.get(key);
      buckets.folder.push({ name: h.name, value: h.value, nav: { kind: 'folder', folderUid: f.folderUid, headerUid: f.headerUid } });
    } else if (collectionHeaders.has(key)) {
      buckets.collection.push({ name: h.name, value: h.value, nav: { kind: 'collection', headerUid: collectionHeaders.get(key) } });
    } else {
      buckets.default.push({ name: h.name, value: h.value });
    }
  });

  const sections = [];
  const pushSection = (key, label, pillClass, entries) => {
    if (entries.length) sections.push({ key, label, pillClass, entries });
  };
  pushSection('default', 'Default Headers', 'tl-pill--default', buckets.default);
  pushSection('collection', 'Collection Headers', 'tl-pill--collection', buckets.collection);
  pushSection('folder', 'Folder Headers', 'tl-pill--folder', buckets.folder);
  pushSection('request', 'Request Headers', 'tl-pill--request', buckets.request);

  // Script section: shown whenever any script set a header. Its three sub-sections are always
  // rendered so the collection/folder/request split is visible even when some are empty.
  const scriptTotal = scriptBuckets.collection.length + scriptBuckets.folder.length + scriptBuckets.request.length;
  if (scriptTotal) {
    sections.push({
      key: 'script',
      label: 'Script',
      pillClass: 'tl-pill--script',
      children: [
        { key: 'collection-script', label: 'Collection Script', pillClass: 'tl-pill--collection', entries: scriptBuckets.collection },
        { key: 'folder-script', label: 'Folder Script', pillClass: 'tl-pill--folder', entries: scriptBuckets.folder },
        { key: 'request-script', label: 'Request Script', pillClass: 'tl-pill--request', entries: scriptBuckets.request }
      ]
    });
  }

  return sections;
};

// Flatten the sections tree into a single ordered list of header rows, preserving section order
// (default -> collection -> folder -> request -> script) for a single-table / single-list view.
export const flattenHeaderSections = (sections) => {
  const rows = [];
  const pushFrom = (section) => {
    if (Array.isArray(section.children)) {
      section.children.forEach(pushFrom);
      return;
    }
    section.entries.forEach((entry) => rows.push(entry));
  };
  (sections || []).forEach(pushFrom);
  return rows;
};
