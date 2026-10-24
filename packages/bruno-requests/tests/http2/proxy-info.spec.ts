import { proxyUrlToProxyInfo } from '../../src/http2/proxy-info';

describe('proxyUrlToProxyInfo', () => {
  test('HTTP CONNECT proxy', () => {
    const info = proxyUrlToProxyInfo('http://localhost:8888');
    expect(info).toMatchObject({ kind: 'http', url: 'http://localhost:8888', key: 'http|http://localhost:8888' });
  });

  test('HTTPS CONNECT proxy carries proxy TLS fields', () => {
    const info = proxyUrlToProxyInfo('https://localhost:8443', { ca: 'CA', rejectUnauthorized: true });
    expect(info?.kind).toBe('https');
    expect(info?.proxyTls).toMatchObject({ ca: 'CA', rejectUnauthorized: true });
  });

  test('HTTP proxy does not carry TLS fields', () => {
    const info = proxyUrlToProxyInfo('http://localhost:8888', { ca: 'CA' });
    expect(info?.proxyTls).toBeUndefined();
  });

  test('proxy URL with credentials is preserved verbatim', () => {
    const info = proxyUrlToProxyInfo('http://u:p@localhost:8888');
    expect(info).toMatchObject({ kind: 'http', url: 'http://u:p@localhost:8888' });
  });

  test('SOCKS5 proxy with credentials', () => {
    const info = proxyUrlToProxyInfo('socks5://user:pass@localhost:1080');
    expect(info).toMatchObject({ kind: 'socks', url: 'socks5://user:pass@localhost:1080', key: 'socks|socks5://user:pass@localhost:1080' });
  });

  test('SOCKS4 proxy', () => {
    const info = proxyUrlToProxyInfo('socks4://localhost:1080');
    expect(info?.kind).toBe('socks');
    expect(info?.url).toBe('socks4://localhost:1080');
  });

  test('bare socks scheme is treated as socks', () => {
    const info = proxyUrlToProxyInfo('socks://localhost:1080');
    expect(info?.kind).toBe('socks');
  });

  test('missing or unparsable URL means a direct connection', () => {
    expect(proxyUrlToProxyInfo(null)).toBeNull();
    expect(proxyUrlToProxyInfo(undefined)).toBeNull();
    expect(proxyUrlToProxyInfo('')).toBeNull();
    expect(proxyUrlToProxyInfo('not a url')).toBeNull();
  });
});
