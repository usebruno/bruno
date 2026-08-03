const { configureRequest } = require('../../src/ipc/network/index');

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

  describe('with variables in the url and no interpolation values', () => {
    it('does not prepend http:// to {{baseUrl}}/api/v1 (template variable)', async () => {
      const url = '{{baseUrl}}/api/v1';
      const request = { method: 'GET', url, body: {} };
      expect.assertions(2);
      try {
        await configureRequest(null, {}, request, null, null, null, null);
      } catch (err) {
        expect(err.message).toBe('Invalid URL');
      } finally {
        expect(request.url).toEqual(url);
      }
    });

    it('does not prepend http:// to {{baseUrl}} alone (template variable)', async () => {
      const url = '{{baseUrl}}';
      const request = { method: 'GET', url, body: {} };
      expect.assertions(2);
      try {
        await configureRequest(null, {}, request, null, null, null, null);
      } catch (err) {
        expect(err.message).toBe('Invalid URL');
      } finally {
        expect(request.url).toEqual(url);
      }
    });
  });
});
