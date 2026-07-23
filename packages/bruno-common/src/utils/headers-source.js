const norm = (name) => String(name ?? '').trim().toLowerCase();

// Normalize a headers collection (array of {name,value} or a plain name->value object) to a list.
export const toEntries = (headers) => {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers.map((h) => ({ name: h?.name, value: h?.value }));
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
};

// Header values are strings on the wire, but a script may set a non-string (req.setHeader('x', {...}))
// — JSON-encode objects/arrays so the UI shows the value instead of "[object Object]".
const toHeaderValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
};

// Lowercased names of the enabled headers in a definition list.
const enabledHeaderNames = (headers) => {
  const names = new Set();
  (Array.isArray(headers) ? headers : []).forEach((h) => {
    if (h && h.enabled !== false && norm(h.name)) names.add(norm(h.name));
  });
  return names;
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

/**
 * The headers actually sent with a request, as a single list ordered by source:
 * default -> collection -> folder -> request -> script. A header defined at multiple levels appears
 * once, under the level that wins: script > request > folder > collection > (transport) default.
 *
 * Names come from the request definition (collection / folder / request) and `scriptSetHeaders`;
 * resolved values come from what was sent on the wire (the network timeline), falling back to the
 * merged request object.
 *
 * `treePath` is the collection-root-to-item path (folders + the item), as produced by the app's
 * getTreePathFromCollectionToItem - passed in so this package stays free of app collection helpers.
 */
export const buildHeaderRows = ({ collection, item, treePath = [], request, timeline }) => {
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionNames = enabledHeaderNames(collectionRoot?.request?.headers || []);

  const folderNames = new Set();
  treePath.forEach((node) => {
    if (node?.type !== 'folder') return;
    const folderRoot = node?.draft || node?.root || {};
    enabledHeaderNames(folderRoot?.request?.headers || []).forEach((n) => folderNames.add(n));
  });

  const itemHeaders = item?.draft ? item?.draft?.request?.headers || [] : item?.request?.headers || [];
  const requestNames = enabledHeaderNames(itemHeaders);

  // Headers the pre-request script added/changed via req.setHeader (recorded by the network layer).
  const scriptSetNames = new Set((Array.isArray(request?.scriptSetHeaders) ? request.scriptSetHeaders : []).map(norm));

  // Prefer the wire log (resolved values); fall back to the merged request object.
  const sent = parseTimelineHeaders(timeline);
  const sentEntries = sent.length ? sent : toEntries(request?.headers);

  const buckets = { default: [], collection: [], folder: [], request: [], script: [] };
  const seen = new Set();
  sentEntries.forEach((h) => {
    const key = norm(h.name);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const row = { name: h.name, value: toHeaderValue(h.value) };
    // A script setting a header wins over any definition it overrides, so it's checked first.
    if (scriptSetNames.has(key)) buckets.script.push(row);
    else if (requestNames.has(key)) buckets.request.push(row);
    else if (folderNames.has(key)) buckets.folder.push(row);
    else if (collectionNames.has(key)) buckets.collection.push(row);
    else buckets.default.push(row);
  });

  return [
    ...buckets.default,
    ...buckets.collection,
    ...buckets.folder,
    ...buckets.request,
    ...buckets.script
  ];
};
