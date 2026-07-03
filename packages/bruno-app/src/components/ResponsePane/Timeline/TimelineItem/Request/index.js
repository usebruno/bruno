import get from 'lodash/get';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
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

const enabledHeaderNames = (headers) =>
  (Array.isArray(headers) ? headers : [])
    .filter((h) => h && h.enabled !== false && norm(h.name))
    .map((h) => norm(h.name));

// The transport-level "default" headers (Accept, User-Agent, Accept-Encoding, request-start-time, …)
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

// Best-effort static check: does this pre-request script set the given header (via req.setHeader or
// a req.headers[...] / req.headers.x assignment)? Used only to attribute an already-detected
// script-set header to its level, so a false miss just falls back to Request Script.
const scriptSetsHeader = (script, name) => {
  if (!script || !name) return false;
  const n = escapeRegExp(name);
  return (
    new RegExp(`setHeader\\s*\\(\\s*[\`'"]${n}[\`'"]`, 'i').test(script)
      || new RegExp(`headers\\s*\\[\\s*[\`'"]${n}[\`'"]\\s*\\]`, 'i').test(script)
      || new RegExp(`headers\\s*\\.\\s*${n}(?![\\w-])`, 'i').test(script)
  );
};

// Build the collapsible sections tree for the Headers block. Header sources (default / collection /
// folder / request) each become a section; script-set headers are grouped under a "Script" section
// with Collection / Folder / Request Script sub-sections.
const buildHeaderSections = ({ collection, item, request, timeline }) => {
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionNames = new Set(enabledHeaderNames(get(collectionRoot, 'request.headers', [])));
  const collectionScript = get(collectionRoot, 'request.script.req', '') || '';

  const treePath = getTreePathFromCollectionToItem(collection, item) || [];
  const folderNames = new Set();
  const folderScripts = [];
  treePath.forEach((node) => {
    if (node?.type !== 'folder') return;
    const folderRoot = node?.draft || node?.root || {};
    enabledHeaderNames(get(folderRoot, 'request.headers', [])).forEach((n) => folderNames.add(n));
    const s = get(folderRoot, 'request.script.req', '') || '';
    if (s) folderScripts.push(s);
  });

  const itemHeaders = item?.draft ? get(item, 'draft.request.headers', []) : get(item, 'request.headers', []);
  const requestNames = new Set(enabledHeaderNames(itemHeaders));
  const requestScript = item?.draft ? get(item, 'draft.request.script.req', '') : get(item, 'request.script.req', '');

  // Headers the pre-request script added/changed via req.setHeader (recorded by the network layer).
  const scriptSetNames = new Set((Array.isArray(request?.scriptSetHeaders) ? request.scriptSetHeaders : []).map(norm));

  // Which level's script set this header (request wins, then folder, then collection). null if none.
  const scriptLevelOf = (name) => {
    if (scriptSetsHeader(requestScript, name)) return 'request';
    if (folderScripts.some((s) => scriptSetsHeader(s, name))) return 'folder';
    if (scriptSetsHeader(collectionScript, name)) return 'collection';
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
    const row = { name: h.name, value: h.value };
    const level = scriptLevelOf(h.name);
    // A script setting a header wins over any definition it overrides, so it's checked first.
    if (scriptSetNames.has(key) || level) scriptBuckets[level || 'request'].push(row);
    else if (requestNames.has(key)) buckets.request.push(row);
    else if (folderNames.has(key)) buckets.folder.push(row);
    else if (collectionNames.has(key)) buckets.collection.push(row);
    else buckets.default.push(row);
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
  let { headers, data, dataBuffer, error } = request || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  const headerSections = buildHeaderSections({ collection, item, request, timeline });

  return (
    <>
      <Headers sections={headerSections} />
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
