// A header as stored in a request/collection/folder definition.
type Header = { name?: string; value?: unknown; enabled?: boolean };
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

// Header values are strings on the wire, but a script may set a non-string (req.setHeader('x', {...}))
// and a response header may arrive as an array (set-cookie) or a number — JSON-encode objects/arrays
// so the UI shows the value instead of "[object Object]" (React would throw on a raw object child).
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

/**
 * Normalize a headers collection (array of {name,value} or a plain name->value object) to display
 * rows. Values are stringified here so every consumer can render them directly — callers must not
 * have to know whether a value arrived as a string, a number, an array, or an object.
 */
export const toEntries = (headers: Header[] | Record<string, unknown> | null | undefined): HeaderRow[] => {
  if (!headers) return [];
  const list = Array.isArray(headers)
    ? headers.map((h) => ({ name: h?.name, value: h?.value }))
    : Object.entries(headers).map(([name, value]) => ({ name, value }));
  return list.map(({ name, value }) => ({ name: name ?? '', value: toHeaderValue(value) }));
};

// Lowercased names of the enabled headers in a definition list.
const enabledHeaderNames = (headers: Header[]): Set<string> => {
  const names = new Set<string>();
  (Array.isArray(headers) ? headers : []).forEach((h) => {
    if (h && h.enabled !== false && norm(h.name)) names.add(norm(h.name));
  });
  return names;
};

// A requestHeader entry's message is "name: value"; null when it isn't a parseable header line.
const splitHeaderMessage = (message: unknown): HeaderRow | null => {
  if (typeof message !== 'string') return null;
  const idx = message.indexOf(':');
  if (idx === -1) return null;
  const name = message.slice(0, idx).trim();
  if (!name) return null;
  return { name, value: message.slice(idx + 1).trim() };
};

// The transport-level "default" headers (Accept, User-Agent, Accept-Encoding, Host, Connection, …)
// are added by the axios instance/adapter and never make it into the request definition. They exist
// only as `requestHeader` entries in the network timeline (the same source the Network tab reads).
const parseTimelineHeaders = (timeline: TimelineEntry[] | undefined): HeaderRow[] => {
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
  const out: HeaderRow[] = [];
  for (let i = hopStart; i < timeline.length; i++) {
    const entry = timeline[i];
    if (entry?.type !== 'requestHeader') continue;
    const header = splitHeaderMessage(entry.message);
    if (header) out.push(header);
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
  sentEntries.forEach((row) => {
    const key = norm(row.name);
    if (!key) return;
    // Every sent occurrence gets a row: a header may legitimately be sent more than once, and the
    // Network tab lists each one, so collapsing here would make the two views disagree.
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

type HeaderSourceContext = Parameters<typeof buildHeaderRows>[0];

// Reorder one hop's requestHeader entries to buildHeaderRows' order. Entries of any other type keep
// their position, so the surrounding trace (request line, TLS/proxy info, response) is untouched.
const orderHopHeaders = (hop: TimelineEntry[], context: HeaderSourceContext): TimelineEntry[] => {
  const slots: number[] = [];
  hop.forEach((entry, i) => {
    if (entry?.type === 'requestHeader') slots.push(i);
  });
  if (slots.length < 2) return hop;

  // Ranked from this hop alone: hops of a redirect carry different headers, so a rank map built from
  // one hop would sink another hop's unique headers (Content-Length dropped on a 302 -> GET) to its tail.
  // A name sent more than once gets one rank per occurrence, in order, so the k-th occurrence on the
  // wire lands on the k-th row of that name - duplicates keep their wire order instead of collapsing
  // onto the first one's position.
  const ranks = new Map<string, number[]>();
  buildHeaderRows({ ...context, timeline: hop }).forEach((row, i) => {
    const key = norm(row.name);
    if (!key) return;
    const queue = ranks.get(key);
    if (queue) queue.push(i);
    else ranks.set(key, [i]);
  });

  const nextRankOf = (entry: TimelineEntry): number => {
    const header = splitHeaderMessage(entry?.message);
    const queue = header ? ranks.get(norm(header.name)) : undefined;
    // An unparseable line has no source; keep it after the ranked ones rather than dropping it.
    if (!queue?.length) return Number.MAX_SAFE_INTEGER;
    return queue.shift() as number;
  };

  // Ranks are claimed walking the hop in wire order, so this must map before it sorts.
  const ordered = slots
    .map((i) => ({ entry: hop[i], rank: nextRankOf(hop[i]) }))
    .sort((a, b) => a.rank - b.rank)
    .map((slot) => slot.entry);
  const out = [...hop];
  slots.forEach((slot, k) => {
    out[slot] = ordered[k];
  });
  return out;
};

/**
 * The network timeline with each hop's request headers reordered by source, matching what
 * buildHeaderRows shows in the request-headers table.
 *
 * Serialization order interleaves the transport headers — axios puts Accept and User-Agent ahead of the
 * definition headers while Node appends request-start-time, Accept-Encoding, Host and Connection after
 * them — so a log in pure wire order splits that group and reads inconsistently with the table for the
 * same request. The header *set* is unchanged; only the order within each hop's block moves.
 *
 * A followed redirect (or a digest/NTLM retry) accumulates every hop in one timeline, one 'request'
 * marker per hop, and each hop is ordered independently so headers never move between hops.
 */
export const orderTimelineHeadersBySource = (
  timeline: TimelineEntry[] | undefined,
  context: HeaderSourceContext
): TimelineEntry[] => {
  if (!Array.isArray(timeline)) return [];

  const out: TimelineEntry[] = [];
  let hop: TimelineEntry[] = [];
  const flushHop = () => {
    if (hop.length) out.push(...orderHopHeaders(hop, context));
    hop = [];
  };
  timeline.forEach((entry) => {
    if (entry?.type === 'request') flushHop();
    hop.push(entry);
  });
  flushHop();
  return out;
};
