const { configureRequest } = require('../../src/ipc/network/index');
const { hasExplicitScheme } = require('@usebruno/common').utils;

// Unit tests: hasExplicitScheme (fast, no network/crypto/QuickJS)
describe('hasExplicitScheme', () => {
  // should return false
  const noScheme = [
    ['bare hostname', 'test-domain'],
    ['localhost', 'localhost'],
    ['localhost:port (key regression)', 'localhost:8080'],
    ['localhost:port/path', 'localhost:8080/path'],
    ['127.0.0.1:port', '127.0.0.1:3000'],
    ['bare IP', '192.168.1.1'],
    ['IP:port', '192.168.1.1:8080'],
    ['hostname with path', 'example.com/api/v1']
  ];

  for (const [label, url] of noScheme) {
    it(`false (no explicit scheme) — ${label}`, () => {
      expect(hasExplicitScheme(url)).toBe(false);
    });
  }

  // should return true
  const withScheme = [
    ['http://', 'http://example.com'],
    ['https://', 'https://example.com'],
    ['ftp://', 'ftp://test-domain'],
    ['ws://', 'ws://example.com/socket'],
    ['wss://', 'wss://example.com/socket'],
    ['custom scheme', 'myapp://deep-link']
  ];

  for (const [label, url] of withScheme) {
    it(`true (has explicit scheme) — ${label}`, () => {
      expect(hasExplicitScheme(url)).toBe(true);
    });
  }

  // startsWith('{{') guard in configureRequest bypasses scheme detection
  it('{{baseUrl}}/api — no scheme injection for template variables', async () => {
    const url = '{{baseUrl}}/api/v1';
    expect(hasExplicitScheme(url)).toBe(false);

    const request = { method: 'GET', url, body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual(url);
  });

  it('{{baseUrl}} alone — no scheme injection for template variables', async () => {
    const url = '{{baseUrl}}';
    expect(hasExplicitScheme(url)).toBe(false);

    const request = { method: 'GET', url, body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual(url);
  });
});

// Integration tests: full configureRequest (URL must survive cookie-jar parse)
describe('index: configureRequest — URL normalization', () => {
  it('prepends http:// to localhost:port', async () => {
    const request = { method: 'GET', url: 'localhost:8080', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://localhost:8080');
  });

  it('prepends http:// to localhost', async () => {
    const request = { method: 'GET', url: 'localhost', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://localhost');
  });

  it('prepends http:// to 127.0.0.1:port', async () => {
    const request = { method: 'GET', url: '127.0.0.1:3000', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://127.0.0.1:3000');
  });

  it('prepends http:// to example.com/api/v1', async () => {
    const request = { method: 'GET', url: 'example.com/api/v1', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://example.com/api/v1');
  });

  it('does not prepend http:// to http://example.com', async () => {
    const request = { method: 'GET', url: 'http://example.com', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://example.com');
  });

  it('does not prepend http:// to https://example.com', async () => {
    const request = { method: 'GET', url: 'https://example.com', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('https://example.com');
  });

  it('does not prepend http:// to ftp://test-domain', async () => {
    const request = { method: 'GET', url: 'ftp://test-domain', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('ftp://test-domain');
  });

  it('does not prepend http:// to ws://example.com/socket', async () => {
    const request = { method: 'GET', url: 'ws://example.com/socket', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('ws://example.com/socket');
  });
});
