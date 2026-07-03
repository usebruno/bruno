import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import {
  addTab,
  updateRequestPaneTab,
  updateScriptPaneTab,
  setFocusErrorLine,
  setFocusHeaderRow
} from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import BodyBlock from '../Common/Body/index';
import Headers, { toEntries } from '../Common/Headers/index';

const safeStringifyJSONIfNotString = (obj) => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '[Unserializable Object]';
  }
};

const norm = (name) => String(name ?? '').trim().toLowerCase();

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

// Build the collapsible sections tree for the Headers block. Header sources (default / collection /
// folder / request) each become a section; script-set headers are grouped under a "Script" section
// with Collection / Folder / Request Script sub-sections. Each non-default row carries `nav` metadata
// describing where to jump to (a headers table row, or a pre-request script line).
const buildHeaderSections = ({ collection, item, request, timeline }) => {
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionHeaders = enabledHeaderMap(get(collectionRoot, 'request.headers', []));
  const collectionScript = get(collectionRoot, 'request.script.req', '') || '';

  const treePath = getTreePathFromCollectionToItem(collection, item) || [];
  const folderHeaders = new Map(); // name -> { folderUid, headerUid }; deeper folder wins
  const folderScripts = []; // { uid, script } in collection->item order
  treePath.forEach((node) => {
    if (node?.type !== 'folder') return;
    const folderRoot = node?.draft || node?.root || {};
    enabledHeaderMap(get(folderRoot, 'request.headers', [])).forEach((headerUid, name) => {
      folderHeaders.set(name, { folderUid: node.uid, headerUid });
    });
    const s = get(folderRoot, 'request.script.req', '') || '';
    if (s) folderScripts.push({ uid: node.uid, script: s });
  });

  const itemHeaders = item?.draft ? get(item, 'draft.request.headers', []) : get(item, 'request.headers', []);
  const requestHeaders = enabledHeaderMap(itemHeaders);
  const requestScript = item?.draft ? get(item, 'draft.request.script.req', '') : get(item, 'request.script.req', '');

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

const Request = ({ collection, request, item, timeline }) => {
  const dispatch = useDispatch();
  let { headers, data, dataBuffer, error } = request || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  const headerSections = buildHeaderSections({ collection, item, request, timeline });

  // Open (mounting if needed) the tab/sub-tab where this header comes from, then flash the row/line.
  const handleNavigate = (nav) => {
    if (!nav || !collection?.uid) return;
    const requestedAt = Date.now();

    if (nav.kind === 'collection') {
      dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
      dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: 'headers' }));
      if (nav.headerUid) dispatch(setFocusHeaderRow({ uid: collection.uid, tableId: 'collection-headers', headerUid: nav.headerUid, requestedAt }));
    } else if (nav.kind === 'folder' && nav.folderUid) {
      dispatch(addTab({ uid: nav.folderUid, collectionUid: collection.uid, type: 'folder-settings' }));
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: nav.folderUid, tab: 'headers' }));
      if (nav.headerUid) dispatch(setFocusHeaderRow({ uid: nav.folderUid, tableId: 'folder-headers', headerUid: nav.headerUid, requestedAt }));
    } else if (nav.kind === 'request' && item?.uid) {
      dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'request' }));
      dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'headers' }));
      if (nav.headerUid) dispatch(setFocusHeaderRow({ uid: item.uid, tableId: 'request-headers', headerUid: nav.headerUid, requestedAt }));
    } else if (nav.kind === 'script') {
      const line = nav.line || 1;
      const focus = (uid) => dispatch(setFocusErrorLine({ uid, scriptPhase: 'pre-request', line, variant: 'info', requestedAt }));
      if (nav.level === 'collection') {
        dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
        dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: collection.uid, scriptPaneTab: 'pre-request' }));
        focus(collection.uid);
      } else if (nav.level === 'folder' && nav.folderUid) {
        dispatch(addTab({ uid: nav.folderUid, collectionUid: collection.uid, type: 'folder-settings' }));
        dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: nav.folderUid, tab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: nav.folderUid, scriptPaneTab: 'pre-request' }));
        focus(nav.folderUid);
      } else if (item?.uid) {
        dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'request' }));
        dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: 'pre-request' }));
        focus(item.uid);
      }
    }
  };

  return (
    <>
      <Headers sections={headerSections} onNavigate={handleNavigate} />
      <BodyBlock
        collection={collection}
        data={data}
        dataBuffer={dataBuffer}
        error={error}
        headers={headers}
        item={item}
        type="request"
      />
    </>
  );
};

export default Request;
