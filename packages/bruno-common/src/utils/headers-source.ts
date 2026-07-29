// A header as stored in a request/collection/folder definition.
type Header = { name?: string; value?: unknown; enabled?: boolean };
// A resolved name/value pair (value may be non-string until toHeaderValue stringifies it).
type HeaderEntry = { name?: string; value?: unknown };
// A row ready for display: name + stringified value.
type HeaderRow = { name: string; value: string };
// The `root` of a collection/folder holds its request-level headers.
type RequestRoot = { request?: { headers?: Header[] } };
// A node on the collection-root-to-item path: folders (type 'folder', headers under root/draft) and
// the leaf request item (headers under request/draft).
type CollectionNode = { type?: string; root?: RequestRoot; draft?: RequestRoot; request?: { headers?: Header[] } };
// A network-timeline entry (only request/requestHeader entries are inspected here).
type TimelineEntry = { type?: string; message?: unknown };

const norm = (name: unknown): string => String(name ?? '').trim().toLowerCase();

// Normalize a headers collection (array of {name,value} or a plain name->value object) to a list.
export const toEntries = (headers: Header[] | Record<string, unknown> | null | undefined): HeaderEntry[] => {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers.map((h) => ({ name: h?.name, value: h?.value }));
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
};

// Header values are strings on the wire, but a script may set a non-string (req.setHeader('x', {...}))
// — JSON-encode objects/arrays so the UI shows the value instead of "[object Object]".
const toHeaderValue = (value: unknown): string => {
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
const enabledHeaderNames = (headers: Header[]): Set<string> => {
  const names = new Set<string>();
  (Array.isArray(headers) ? headers : []).forEach((h) => {
    if (h && h.enabled !== false && norm(h.name)) names.add(norm(h.name));
  });
  return names;
};

// The transport-level "default" headers (Accept, User-Agent, Accept-Encoding, Host, Connection, …)
// are added by the axios instance/adapter and never make it into the request definition. They exist
// only as `requestHeader` entries in the network timeline (the same source the Network tab reads).
const parseTimelineHeaders = (timeline: TimelineEntry[] | undefined): HeaderEntry[] => {
  if (!Array.isArray(timeline)) return [];
  // A followed redirect accumulates every hop in one timeline (one 'request' marker per hop). The
  // headers that belong to the response being shown are the final hop's, so scan only from the last
  // 'request' marker - otherwise a header that changed across hops (Host, Cookie, ...) would show
  // the original request's value, and one the final request dropped (e.g. Content-Length after a
  // 302 -> GET) would still appear.
  let hopStart = 0;
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i]?.type === 'request') {
      hopStart = i;
      break;
    }
  }
  const out: HeaderEntry[] = [];
  for (let i = hopStart; i < timeline.length; i++) {
    const entry = timeline[i];
    if (entry?.type !== 'requestHeader' || typeof entry.message !== 'string') continue;
    const idx = entry.message.indexOf(':');
    if (idx === -1) continue;
    const name = entry.message.slice(0, idx).trim();
    if (!name) continue;
    out.push({ name, value: entry.message.slice(idx + 1).trim() });
  }
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
export const buildHeaderRows = ({
  collection,
  item,
  treePath = [],
  request,
  timeline
}: {
  collection?: { draft?: { root?: RequestRoot }; root?: RequestRoot };
  item?: CollectionNode;
  treePath?: CollectionNode[];
  request?: { headers?: Header[] | Record<string, unknown>; scriptSetHeaders?: string[] };
  timeline?: TimelineEntry[];
}): HeaderRow[] => {
  const collectionRoot: RequestRoot = collection?.draft?.root || collection?.root || {};
  const collectionNames = enabledHeaderNames(collectionRoot?.request?.headers || []);

  const folderNames = new Set<string>();
  treePath.forEach((node) => {
    if (node?.type !== 'folder') return;
    const folderRoot: RequestRoot = node?.draft || node?.root || {};
    enabledHeaderNames(folderRoot?.request?.headers || []).forEach((n) => folderNames.add(n));
  });

  const itemHeaders = item?.draft ? item?.draft?.request?.headers || [] : item?.request?.headers || [];
  const requestNames = enabledHeaderNames(itemHeaders);

  // Headers the pre-request script added/changed via req.setHeader (recorded by the network layer).
  const rawScriptSetHeaders = request?.scriptSetHeaders;
  const scriptSetNames = new Set((Array.isArray(rawScriptSetHeaders) ? rawScriptSetHeaders : []).map(norm));

  // Prefer the wire log (resolved values); fall back to the merged request object.
  const sent = parseTimelineHeaders(timeline);
  const sentEntries = sent.length ? sent : toEntries(request?.headers);

  const buckets: Record<'default' | 'collection' | 'folder' | 'request' | 'script', HeaderRow[]> = {
    default: [],
    collection: [],
    folder: [],
    request: [],
    script: []
  };
  sentEntries.forEach((h) => {
    const key = norm(h.name);
    if (!key) return;
    // Every sent occurrence gets a row: a header may legitimately be sent more than once, and the
    // Network tab lists each one, so collapsing here would make the two views disagree.
    const row: HeaderRow = { name: h.name ?? '', value: toHeaderValue(h.value) };
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
