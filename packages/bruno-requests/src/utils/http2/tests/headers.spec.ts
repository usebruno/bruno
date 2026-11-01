import { buildHttp2RequestHeaders, CONNECTION_HEADERS } from '../headers';

describe('buildHttp2RequestHeaders', () => {
  it('builds the four pseudo-headers from the URL and method', () => {
    const { headers } = buildHttp2RequestHeaders({ method: 'get', url: 'https://api.test:8443/v1/items?q=1' });
    expect(headers[':method']).toBe('GET');
    expect(headers[':scheme']).toBe('https');
    expect(headers[':authority']).toBe('api.test:8443');
    expect(headers[':path']).toBe('/v1/items?q=1');
  });

  it('defaults the path to "/" and keeps the query string (drops the fragment)', () => {
    expect(buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test' }).headers[':path']).toBe('/');
    expect(buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test/a?b=2#frag' }).headers[':path']).toBe('/a?b=2');
  });

  it('lowercases header names and drops null/undefined values', () => {
    const { headers } = buildHttp2RequestHeaders({
      method: 'GET',
      url: 'https://x.test/',
      headers: { 'X-Custom': 'v', 'Content-Type': 'application/json', 'skip': undefined as any, 'none': null as any }
    });
    expect(headers['x-custom']).toBe('v');
    expect(headers['content-type']).toBe('application/json');
    expect('skip' in headers).toBe(false);
    expect('none' in headers).toBe(false);
  });

  it('maps a Host header to :authority and strips it as a regular header', () => {
    const { headers, stripped } = buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test/', headers: { Host: 'vhost.test' } });
    expect(headers[':authority']).toBe('vhost.test');
    expect('host' in headers).toBe(false);
    expect(stripped).toContain('Host');
  });

  it('never lets a caller inject pseudo-headers', () => {
    const { headers } = buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test/', headers: { ':path': '/evil', ':method': 'DELETE' } });
    expect(headers[':path']).toBe('/');
    expect(headers[':method']).toBe('GET');
  });

  it('strips connection-specific headers and reports them', () => {
    const { headers, stripped } = buildHttp2RequestHeaders({
      method: 'GET',
      url: 'https://x.test/',
      headers: { 'Connection': 'keep-alive', 'Keep-Alive': 'timeout=5', 'Transfer-Encoding': 'chunked', 'Upgrade': 'h2c', 'HTTP2-Settings': 'x' }
    });
    for (const name of CONNECTION_HEADERS) expect(name in headers).toBe(false);
    expect(stripped).toEqual(expect.arrayContaining(['Connection', 'Keep-Alive', 'Transfer-Encoding', 'Upgrade', 'HTTP2-Settings']));
  });

  describe('TE header (RFC 9113 §8.2.2)', () => {
    it('passes TE: trailers through (case/space-insensitive)', () => {
      expect(buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test/', headers: { TE: 'trailers' } }).headers['te']).toBe('trailers');
      expect(buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test/', headers: { te: '  Trailers ' } }).headers['te']).toBe('trailers');
    });

    it('strips any other TE value (Node would reject it)', () => {
      const { headers, stripped } = buildHttp2RequestHeaders({ method: 'GET', url: 'https://x.test/', headers: { TE: 'gzip, deflate' } });
      expect('te' in headers).toBe(false);
      expect(stripped).toContain('TE');
    });
  });
});
