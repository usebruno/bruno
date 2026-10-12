import { buildHttp2Headers, CONNECTION_SPECIFIC_HEADERS } from '../../src/http2/headers';

const url = 'https://api.example.test:8443/v1/items?page=2&q=a%20b';

describe('buildHttp2Headers', () => {
  test('derives pseudo-headers from method and URL', () => {
    const h = buildHttp2Headers({ method: 'post', url });
    expect(h[':method']).toBe('POST');
    expect(h[':scheme']).toBe('https');
    expect(h[':authority']).toBe('api.example.test:8443');
    expect(h[':path']).toBe('/v1/items?page=2&q=a%20b');
  });

  test('uses "/" as the path for a bare origin and omits a default port from :authority', () => {
    const h = buildHttp2Headers({ method: 'GET', url: 'https://example.test' });
    expect(h[':path']).toBe('/');
    expect(h[':authority']).toBe('example.test');
  });

  test(':scheme is http for cleartext URLs', () => {
    expect(buildHttp2Headers({ method: 'GET', url: 'http://localhost:8080/x' })[':scheme']).toBe('http');
  });

  test('lowercases header names and keeps values', () => {
    const h = buildHttp2Headers({ method: 'GET', url, headers: { 'Content-Type': 'application/json', 'X-Trace-ID': 'abc' } });
    expect(h['content-type']).toBe('application/json');
    expect(h['x-trace-id']).toBe('abc');
    expect(h['Content-Type']).toBeUndefined();
  });

  test('strips every connection-specific header, whatever its case', () => {
    const headers = Object.fromEntries([...CONNECTION_SPECIFIC_HEADERS].map((n) => [n.toUpperCase(), 'x']));
    const h = buildHttp2Headers({ method: 'GET', url, headers: { ...headers, 'x-keep': '1' } });
    for (const name of CONNECTION_SPECIFIC_HEADERS) expect(h[name]).toBeUndefined();
    expect(h['x-keep']).toBe('1');
  });

  test('moves Host into :authority and does not send a host header', () => {
    const h = buildHttp2Headers({ method: 'GET', url, headers: { Host: 'virtual.example.test' } });
    expect(h[':authority']).toBe('virtual.example.test');
    expect(h.host).toBeUndefined();
  });

  test('keeps te only when it is exactly "trailers"', () => {
    expect(buildHttp2Headers({ method: 'GET', url, headers: { TE: 'Trailers' } }).te).toBe('trailers');
    expect(buildHttp2Headers({ method: 'GET', url, headers: { te: 'gzip, trailers' } }).te).toBeUndefined();
    expect(buildHttp2Headers({ method: 'GET', url, headers: { te: 'gzip' } }).te).toBeUndefined();
  });

  test('preserves multi-valued headers as arrays and stringifies numbers', () => {
    const h = buildHttp2Headers({ method: 'GET', url, headers: { 'cookie': ['a=1', 'b=2'], 'content-length': 42 } });
    expect(h.cookie).toEqual(['a=1', 'b=2']);
    expect(h['content-length']).toBe('42');
  });

  test('drops headers whose value is undefined or null', () => {
    const h = buildHttp2Headers({ method: 'GET', url, headers: { 'x-a': undefined, 'x-b': null, 'x-c': '' } });
    expect('x-a' in h).toBe(false);
    expect('x-b' in h).toBe(false);
    expect(h['x-c']).toBe('');
  });

  test('rejects caller-supplied pseudo-headers', () => {
    expect(() => buildHttp2Headers({ method: 'GET', url, headers: { ':authority': 'evil.test' } })).toThrow(/pseudo-header/);
    expect(() => buildHttp2Headers({ method: 'GET', url, headers: { ':path': '/other' } })).toThrow(/pseudo-header/);
  });

  test('does not mutate the input headers object', () => {
    const input = { 'Connection': 'keep-alive', 'Host': 'h.test', 'X-A': '1' };
    const copy = { ...input };
    buildHttp2Headers({ method: 'GET', url, headers: input });
    expect(input).toEqual(copy);
  });
});
