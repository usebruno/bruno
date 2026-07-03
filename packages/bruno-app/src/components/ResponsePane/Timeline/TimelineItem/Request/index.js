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

// Attribute each header that was actually sent to its source. Names come from the request
// definition (collection / folder / request), resolved values come from what was sent on the wire
// (the network timeline, or the merged request object as a fallback). A header defined at multiple
// levels shows only under the level that wins: request > folder > collection > (transport) default.
const buildHeaderGroups = ({ collection, item, request, timeline }) => {
  const collectionRoot = collection?.draft?.root || collection?.root || {};
  const collectionNames = new Set(enabledHeaderNames(get(collectionRoot, 'request.headers', [])));

  const treePath = getTreePathFromCollectionToItem(collection, item) || [];
  const folderNames = new Set();
  treePath.forEach((node) => {
    if (node?.type !== 'folder') return;
    const folderRoot = node?.draft || node?.root || {};
    enabledHeaderNames(get(folderRoot, 'request.headers', [])).forEach((n) => folderNames.add(n));
  });

  const itemHeaders = item?.draft ? get(item, 'draft.request.headers', []) : get(item, 'request.headers', []);
  const requestNames = new Set(enabledHeaderNames(itemHeaders));

  // Prefer the wire log (resolved values); fall back to the merged request object.
  const sent = parseTimelineHeaders(timeline);
  const sentEntries = sent.length ? sent : toEntries(request?.headers);

  const buckets = { default: [], collection: [], folder: [], request: [] };
  const seen = new Set();
  sentEntries.forEach((h) => {
    const key = norm(h.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (requestNames.has(key)) buckets.request.push(h);
    else if (folderNames.has(key)) buckets.folder.push(h);
    else if (collectionNames.has(key)) buckets.collection.push(h);
    else buckets.default.push(h);
  });

  return [
    { key: 'default', label: 'Default', pillClass: 'tl-pill--default', entries: buckets.default },
    { key: 'collection', label: 'Collection', pillClass: 'tl-pill--collection', entries: buckets.collection },
    { key: 'folder', label: 'Folder', pillClass: 'tl-pill--folder', entries: buckets.folder },
    { key: 'request', label: 'Request', pillClass: 'tl-pill--request', entries: buckets.request }
  ];
};

const Request = ({ collection, request, item, timeline }) => {
  let { headers, data, dataBuffer, error } = request || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  const headerGroups = buildHeaderGroups({ collection, item, request, timeline });

  return (
    <>
      <Headers groups={headerGroups} />
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
