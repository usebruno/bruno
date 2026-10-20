import http2 from 'node:http2';
import { buildHttp2RequestHeaders, parseHttp2ResponseHeaders } from '../headers';

describe('buildHttp2RequestHeaders', () => {
  it('builds pseudo-headers from method and URL', () => {
    const h2 = buildHttp2RequestHeaders('GET', 'https://api.example.com/users?page=2');
    expect(h2[':method']).toBe('GET');
    expect(h2[':scheme']).toBe('https');
    expect(h2[':authority']).toBe('api.example.com');
    expect(h2[':path']).toBe('/users?page=2');
  });

  it('upper-cases the method and defaults to GET', () => {
    expect(buildHttp2RequestHeaders('post', 'https://x.test/')[':method']).toBe('POST');
    expect(buildHttp2RequestHeaders('', 'https://x.test/')[':method']).toBe('GET');
  });

  it('includes the port in :authority and brackets IPv6', () => {
    expect(buildHttp2RequestHeaders('GET', 'https://x.test:8443/')[':authority']).toBe('x.test:8443');
    expect(buildHttp2RequestHeaders('GET', 'https://[::1]:8443/a')[':authority']).toBe('[::1]:8443');
  });

  it(':path is pathname + search only, never the full URL', () => {
    expect(buildHttp2RequestHeaders('GET', 'https://x.test/a/b?q=1&r=2')[':path']).toBe('/a/b?q=1&r=2');
    expect(buildHttp2RequestHeaders('GET', 'https://x.test')[':path']).toBe('/');
  });

  it('lower-cases header names and passes values through', () => {
    const h2 = buildHttp2RequestHeaders('GET', 'https://x.test/', { 'Content-Type': 'application/json', 'X-Foo': ['a', 'b'] });
    expect(h2['content-type']).toBe('application/json');
    expect(h2['x-foo']).toEqual(['a', 'b']);
  });

  it('folds Host into :authority (drops the Host header)', () => {
    const h2 = buildHttp2RequestHeaders('GET', 'https://x.test/', { Host: 'spoof.test' });
    expect(h2['host']).toBeUndefined();
    expect(h2[':authority']).toBe('x.test');
  });

  it('strips connection-specific headers', () => {
    const h2 = buildHttp2RequestHeaders('GET', 'https://x.test/', {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5',
      'Proxy-Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'Upgrade': 'h2c'
    });
    expect(Object.keys(h2).filter((k) => !k.startsWith(':'))).toEqual([]);
  });

  it('keeps te only when it is exactly "trailers"', () => {
    expect(buildHttp2RequestHeaders('GET', 'https://x.test/', { TE: 'trailers' })['te']).toBe('trailers');
    expect(buildHttp2RequestHeaders('GET', 'https://x.test/', { TE: 'gzip' })['te']).toBeUndefined();
  });

  it('drops caller-supplied pseudo-headers', () => {
    const h2 = buildHttp2RequestHeaders('GET', 'https://x.test/real', { ':path': '/evil', ':method': 'DELETE' });
    expect(h2[':path']).toBe('/real');
    expect(h2[':method']).toBe('GET');
  });

  it('skips undefined / null header values', () => {
    const h2 = buildHttp2RequestHeaders('GET', 'https://x.test/', { 'X-A': undefined, 'X-B': null, 'X-C': 'keep' });
    expect(h2['x-a']).toBeUndefined();
    expect(h2['x-b']).toBeUndefined();
    expect(h2['x-c']).toBe('keep');
  });
});

describe('parseHttp2ResponseHeaders', () => {
  it('splits :status into a numeric status', () => {
    const { status, headers } = parseHttp2ResponseHeaders({ ':status': 204, 'content-type': 'application/json' });
    expect(status).toBe(204);
    expect(headers['content-type']).toBe('application/json');
    expect(headers[':status']).toBeUndefined();
  });

  it('coerces a string :status to a number', () => {
    expect(parseHttp2ResponseHeaders({ ':status': '200' as unknown as string }).status).toBe(200);
  });

  it('drops other pseudo-headers and keeps array values', () => {
    const { headers } = parseHttp2ResponseHeaders({ ':status': 200, ':foo': 'x', 'set-cookie': ['a=1', 'b=2'] });
    expect(headers[':foo']).toBeUndefined();
    expect(headers['set-cookie']).toEqual(['a=1', 'b=2']);
  });

  it('ignores the sensitiveHeaders symbol Node attaches', () => {
    const raw: Record<string, string> & { [http2.sensitiveHeaders]?: string[] } = { ':status': '200', 'authorization': 'secret' };
    raw[http2.sensitiveHeaders] = ['authorization'];
    const { status, headers } = parseHttp2ResponseHeaders(raw);
    expect(status).toBe(200);
    expect(headers['authorization']).toBe('secret');
  });
});
