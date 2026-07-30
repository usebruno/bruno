import { describe, it, expect } from '@jest/globals';
import { toEntries, buildHeaderRows, orderTimelineHeadersBySource } from './headers-source';

describe('toEntries', () => {
  it('returns an empty list for null/undefined', () => {
    expect(toEntries(null)).toEqual([]);
    expect(toEntries(undefined)).toEqual([]);
  });

  it('maps an array of {name,value} to name/value entries', () => {
    expect(toEntries([{ name: 'Accept', value: '*/*' }, { name: 'X-A', value: '1' }])).toEqual([
      { name: 'Accept', value: '*/*' },
      { name: 'X-A', value: '1' }
    ]);
  });

  it('maps a plain name->value object to entries', () => {
    expect(toEntries({ 'Accept': '*/*', 'X-A': '1' })).toEqual([
      { name: 'Accept', value: '*/*' },
      { name: 'X-A', value: '1' }
    ]);
  });

  it('stringifies non-string values so consumers can render them directly', () => {
    expect(toEntries({ 'set-cookie': ['a=1', 'b=2'], 'content-length': 42, 'x-obj': { a: 1 } })).toEqual([
      { name: 'set-cookie', value: '["a=1","b=2"]' },
      { name: 'content-length', value: '42' },
      { name: 'x-obj', value: '{"a":1}' }
    ]);
  });

  it('renders a null/undefined value as an empty string rather than "null"', () => {
    expect(toEntries({ 'x-null': null, 'x-undef': undefined })).toEqual([
      { name: 'x-null', value: '' },
      { name: 'x-undef', value: '' }
    ]);
  });
});

// A requestHeader timeline entry as produced by the network layer.
const reqHeader = (message: string) => ({ type: 'requestHeader', message });

describe('buildHeaderRows', () => {
  it('returns [] when there is no timeline and no request headers', () => {
    expect(buildHeaderRows({ collection: {}, item: {}, treePath: [], request: {}, timeline: [] })).toEqual([]);
  });

  it('groups headers by source: default -> collection -> folder -> request -> script, regardless of wire order', () => {
    // Deliberately shuffled wire order to prove the grouping is deterministic.
    const timeline = [
      reqHeader('request-header: rv'),
      reqHeader('accept: */*'),
      reqHeader('collection-script-header: csv'),
      reqHeader('folder-header: fv'),
      reqHeader('host: localhost'),
      reqHeader('collection-header: cv')
    ];
    const collection = { root: { request: { headers: [{ name: 'collection-header', value: 'cv', enabled: true }] } } };
    const request = { headers: [{ name: 'request-header', value: 'rv', enabled: true }], scriptSetHeaders: ['collection-script-header'] };
    const item = { request };
    const treePath = [
      { type: 'folder', root: { request: { headers: [{ name: 'folder-header', value: 'fv', enabled: true }] } } },
      item
    ];

    const rows = buildHeaderRows({ collection, item, treePath, request, timeline });

    expect(rows.map((r) => r.name)).toEqual([
      'accept', // default (transport)
      'host', // default (transport)
      'collection-header', // collection
      'folder-header', // folder
      'request-header', // request
      'collection-script-header' // script
    ]);
  });

  it('attributes a header to the script when the script overrides a definition', () => {
    // The header is defined at collection, folder AND request level, and the script then overwrote
    // it. Only the winning level should claim it, and the row carries the value that went on the wire.
    const headers = [{ name: 'x-token', value: 'from-definition', enabled: true }];
    const collection = { root: { request: { headers } } };
    const request = { headers, scriptSetHeaders: ['x-token'] };
    const item = { request };
    const treePath = [{ type: 'folder', root: { request: { headers } } }, item];

    const rows = buildHeaderRows({
      collection,
      item,
      treePath,
      request,
      timeline: [{ type: 'request', message: 'GET /' }, reqHeader('x-token: from-script')]
    });

    expect(rows).toEqual([{ name: 'x-token', value: 'from-script' }]);
  });

  it('attributes a header to the request level when it also exists at folder and collection level', () => {
    // Same precedence chain one step down: request beats folder beats collection.
    const headers = [{ name: 'x-scope', value: 'v', enabled: true }];
    const collection = { root: { request: { headers } } };
    const request = { headers };
    const item = { request };
    const treePath = [{ type: 'folder', root: { request: { headers } } }, item];

    const rows = buildHeaderRows({
      collection,
      item,
      treePath,
      request,
      timeline: [{ type: 'request', message: 'GET /' }, reqHeader('x-scope: v'), reqHeader('accept: */*')]
    });

    // One row only, and it sorts after the transport default — i.e. it landed in the request bucket,
    // not the collection or folder one.
    expect(rows).toEqual([
      { name: 'accept', value: '*/*' },
      { name: 'x-scope', value: 'v' }
    ]);
  });

  it('matches header names case-insensitively when attributing a source', () => {
    // Wire logs "Host" but the definition/name comparison is lowercased.
    const rows = buildHeaderRows({
      collection: { root: { request: { headers: [{ name: 'X-Custom', value: 'v', enabled: true }] } } },
      item: {},
      treePath: [],
      request: {},
      timeline: [reqHeader('X-CUSTOM: v'), reqHeader('Host: localhost')]
    });

    // X-CUSTOM (wire) attributed to the collection bucket, Host to default -> collection after default.
    expect(rows).toEqual([
      { name: 'Host', value: 'localhost' },
      { name: 'X-CUSTOM', value: 'v' }
    ]);
  });

  it('ignores disabled definition headers when attributing a source', () => {
    const rows = buildHeaderRows({
      collection: { root: { request: { headers: [{ name: 'x-disabled', value: 'v', enabled: false }] } } },
      item: {},
      treePath: [],
      request: {},
      timeline: [reqHeader('x-disabled: v')]
    });

    // Not counted as a collection header -> falls into the default bucket, but still shown.
    expect(rows).toEqual([{ name: 'x-disabled', value: 'v' }]);
  });

  it('keeps both rows for a header sent twice in one hop', () => {
    // The network log lists each occurrence, so collapsing them here would make the Request tab and
    // the Network tab disagree about the same request.
    const rows = buildHeaderRows({
      collection: {},
      item: {},
      treePath: [],
      request: {},
      timeline: [{ type: 'request', message: 'GET /' }, reqHeader('accept: first'), reqHeader('accept: second')]
    });

    expect(rows).toEqual([
      { name: 'accept', value: 'first' },
      { name: 'accept', value: 'second' }
    ]);
  });

  it('omits a defined header a pre-request script deleted', () => {
    // Rows come only from what was sent, so a header defined at request level but removed by the
    // script (via req.deleteHeader) must not linger from the definition.
    const rows = buildHeaderRows({
      collection: {},
      item: { request: { headers: [{ name: 'x-kept', value: 'v', enabled: true }, { name: 'x-deleted', value: 'v', enabled: true }] } },
      treePath: [],
      request: {},
      timeline: [{ type: 'request', message: 'GET /' }, reqHeader('x-kept: v')]
    });

    expect(rows).toEqual([{ name: 'x-kept', value: 'v' }]);
  });

  it('falls back to the merged request headers when the timeline has no requestHeader entries', () => {
    const rows = buildHeaderRows({
      collection: {},
      item: {},
      treePath: [],
      request: { headers: [{ name: 'X-From-Request', value: 'v', enabled: true }] },
      timeline: [{ type: 'response', message: 'HTTP/1.1 200 OK' }]
    });

    expect(rows).toEqual([{ name: 'X-From-Request', value: 'v' }]);
  });

  it('JSON-encodes object header values (fallback path) instead of "[object Object]"', () => {
    const rows = buildHeaderRows({
      collection: {},
      item: {},
      treePath: [],
      request: { headers: { 'x-json': { a: 1 } } },
      timeline: []
    });

    expect(rows).toEqual([{ name: 'x-json', value: '{"a":1}' }]);
  });

  describe('redirects (multi-hop timeline)', () => {
    // A followed redirect accumulates every hop in one timeline, one 'request' marker per hop.
    const redirectTimeline = [
      { type: 'request', message: 'POST http://a.example/old' },
      reqHeader('accept: */*'),
      reqHeader('content-length: 12'),
      reqHeader('host: a.example'),
      { type: 'response', message: 'HTTP/1.1 302 Found' },
      { type: 'responseHeader', message: 'location: http://b.example/new' },
      { type: 'request', message: 'GET http://b.example/new' },
      reqHeader('accept: */*'),
      reqHeader('host: b.example')
    ];

    it('shows the final hop values for headers that changed across hops', () => {
      const rows = buildHeaderRows({ collection: {}, item: {}, treePath: [], request: {}, timeline: redirectTimeline });

      expect(rows.find((r) => r.name === 'host')?.value).toBe('b.example');
    });

    it('omits a header the final request dropped (Content-Length after 302 -> GET)', () => {
      const rows = buildHeaderRows({ collection: {}, item: {}, treePath: [], request: {}, timeline: redirectTimeline });

      expect(rows.some((r) => r.name === 'content-length')).toBe(false);
      expect(rows.map((r) => r.name)).toEqual(['accept', 'host']);
    });
  });
});

/**
 * The network log rendered by the Response pane's Timeline > Network tab and by the DevTools
 * Console > Network > request-details Network tab. Both render this timeline directly, so ordering it
 * here is what keeps them consistent with the request-headers table for the same request.
 */
describe('orderTimelineHeadersBySource', () => {
  // The wire order Bruno actually produces: axios' Accept/User-Agent, then the definition headers,
  // then the transport headers Node appends while serializing.
  const wireOrderTimeline = [
    { type: 'separator' },
    { type: 'info', message: 'Preparing request to http://localhost:6000/x' },
    { type: 'request', message: 'GET http://localhost:6000/x' },
    reqHeader('Accept: application/json, text/plain, */*'),
    reqHeader('User-Agent: bruno-runtime/2.0.0'),
    reqHeader('collection-header-1: cv'),
    reqHeader('folder-header-1: fv'),
    reqHeader('request-header-1: rv'),
    reqHeader('script-header-1: sv'),
    reqHeader('request-start-time: 1785410976047'),
    reqHeader('Accept-Encoding: gzip, compress, deflate, br'),
    reqHeader('Host: localhost:6000'),
    reqHeader('Connection: keep-alive'),
    { type: 'response', message: 'HTTP/1.1 200 OK' }
  ];

  const definition = (name: string) => [{ name, value: 'v', enabled: true }];
  const request = { headers: definition('request-header-1'), scriptSetHeaders: ['script-header-1'] };
  const item = { request };
  const context = {
    collection: { root: { request: { headers: definition('collection-header-1') } } },
    item,
    treePath: [{ type: 'folder', root: { request: { headers: definition('folder-header-1') } } }, item],
    request
  };

  const headerLines = (timeline: Array<{ type?: string; message?: unknown }>) =>
    timeline.filter((e) => e.type === 'requestHeader').map((e) => e.message);

  it('groups the transport defaults ahead of the definition headers they were serialized between', () => {
    const ordered = orderTimelineHeadersBySource(wireOrderTimeline, context);

    expect(headerLines(ordered)).toEqual([
      // default (transport) — request-start-time/Accept-Encoding/Host/Connection are pulled up from
      // after the definition headers, where the wire had them.
      'Accept: application/json, text/plain, */*',
      'User-Agent: bruno-runtime/2.0.0',
      'request-start-time: 1785410976047',
      'Accept-Encoding: gzip, compress, deflate, br',
      'Host: localhost:6000',
      'Connection: keep-alive',
      'collection-header-1: cv',
      'folder-header-1: fv',
      'request-header-1: rv',
      'script-header-1: sv'
    ]);
  });

  it('orders the log the same way the request-headers table orders its rows', () => {
    // The invariant the two views share: same names, same order, for the same request.
    const ordered = orderTimelineHeadersBySource(wireOrderTimeline, context);
    const rows = buildHeaderRows({ ...context, timeline: wireOrderTimeline });

    const loggedNames = headerLines(ordered).map((line) => String(line).split(':')[0]);
    expect(loggedNames).toEqual(rows.map((r) => r.name));
  });

  it('leaves every non-header entry in place', () => {
    const ordered = orderTimelineHeadersBySource(wireOrderTimeline, context);

    expect(ordered.map((entry) => entry.type)).toEqual(wireOrderTimeline.map((entry) => entry.type));
    expect(ordered).toHaveLength(wireOrderTimeline.length);
  });

  it('keeps each hop of a redirect ordered by its own headers', () => {
    // hop 1 sends Content-Length, hop 2 does not. Ranking both hops from the final hop would leave
    // hop 1's content-length stranded at the end of its own block.
    const timeline = [
      { type: 'request', message: 'POST http://a.example/old' },
      reqHeader('Content-Length: 12'),
      reqHeader('collection-header-1: cv'),
      reqHeader('Host: a.example'),
      { type: 'response', message: 'HTTP/1.1 302 Found' },
      { type: 'request', message: 'GET http://b.example/new' },
      reqHeader('collection-header-1: cv'),
      reqHeader('Host: b.example')
    ];

    const ordered = orderTimelineHeadersBySource(timeline, context);

    expect(headerLines(ordered)).toEqual([
      // hop 1: its own transport defaults first, then the collection header.
      'Content-Length: 12',
      'Host: a.example',
      'collection-header-1: cv',
      // hop 2: same grouping, its own Host value.
      'Host: b.example',
      'collection-header-1: cv'
    ]);
  });

  it('keeps both occurrences of a header sent twice, in wire order', () => {
    const timeline = [
      { type: 'request', message: 'GET /' },
      reqHeader('x-multi: first'),
      reqHeader('Host: localhost'),
      reqHeader('x-multi: second')
    ];

    const ordered = orderTimelineHeadersBySource(timeline, { collection: {}, item: {}, treePath: [], request: {} });

    // All three are transport defaults here, so the block keeps wire order and neither x-multi is lost.
    expect(headerLines(ordered)).toEqual(['x-multi: first', 'Host: localhost', 'x-multi: second']);
  });

  it('keeps an unparseable header line rather than dropping it', () => {
    const timeline = [
      { type: 'request', message: 'GET /' },
      reqHeader('collection-header-1: cv'),
      { type: 'requestHeader', message: 'malformed-no-colon' },
      reqHeader('Host: localhost')
    ];

    const ordered = orderTimelineHeadersBySource(timeline, context);

    // Host (default) leads, the collection header follows, and the unrankable line lands last.
    expect(headerLines(ordered)).toEqual(['Host: localhost', 'collection-header-1: cv', 'malformed-no-colon']);
  });

  it('returns [] for a missing timeline and leaves a header-free timeline untouched', () => {
    expect(orderTimelineHeadersBySource(undefined, context)).toEqual([]);

    const noHeaders = [{ type: 'request', message: 'GET /' }, { type: 'response', message: 'HTTP/1.1 200 OK' }];
    expect(orderTimelineHeadersBySource(noHeaders, context)).toEqual(noHeaders);
  });

  it('does not reorder a hop with a single header', () => {
    const timeline = [{ type: 'request', message: 'GET /' }, reqHeader('Host: localhost')];

    expect(orderTimelineHeadersBySource(timeline, context)).toEqual(timeline);
  });
});
