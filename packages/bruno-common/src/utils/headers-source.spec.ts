import { describe, it, expect } from '@jest/globals';
import { toEntries, buildHeaderRows } from './headers-source';

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
