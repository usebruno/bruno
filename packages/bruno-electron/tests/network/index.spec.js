const { configureRequest, promisifyStream, hasStreamHeaders, measureResponseTime } = require('../../src/ipc/network/index');
const { Readable } = require('stream');

describe('index: hasStreamHeaders', () => {
  it('returns true when content-type is text/event-stream', () => {
    const h = { get: (k) => (k === 'content-type' ? 'text/event-stream' : null) };
    expect(hasStreamHeaders(h)).toBe(true);
  });

  it('returns true when content-type includes charset alongside text/event-stream', () => {
    const h = { get: (k) => (k === 'content-type' ? 'text/event-stream; charset=utf-8' : null) };
    expect(hasStreamHeaders(h)).toBe(true);
  });

  it('returns false for application/json', () => {
    const h = { get: (k) => (k === 'content-type' ? 'application/json' : null) };
    expect(hasStreamHeaders(h)).toBe(false);
  });

  it('returns false when content-type header is missing', () => {
    const h = { get: () => null };
    expect(hasStreamHeaders(h)).toBe(false);
  });
});

describe('index: promisifyStream', () => {
  it('resolves with concatenated chunks on close', async () => {
    const stream = new Readable({ read() {} });
    const resultPromise = promisifyStream(stream, null, false);
    stream.emit('data', Buffer.from('hello '));
    stream.emit('data', Buffer.from('world'));
    stream.emit('close');
    const result = await resultPromise;
    expect(Buffer.from(result).toString()).toBe('hello world');
  });

  it('resolves immediately on first data chunk when closeOnFirst is true', async () => {
    const stream = new Readable({ read() {} });
    const resultPromise = promisifyStream(stream, null, true);
    stream.push(Buffer.from('first'));
    const result = await resultPromise;
    expect(Buffer.from(result).toString()).toBe('first');
  });

  it('calls abortController.abort() when closeOnFirst is true', async () => {
    const stream = new Readable({ read() {} });
    const abortController = { abort: jest.fn() };
    const resultPromise = promisifyStream(stream, abortController, true);
    stream.push(Buffer.from('data'));
    await resultPromise;
    expect(abortController.abort).toHaveBeenCalled();
  });

  it('rejects when stream emits error', async () => {
    const stream = new Readable({ read() {} });
    const resultPromise = promisifyStream(stream, null, false);
    stream.emit('error', new Error('stream error'));
    await expect(resultPromise).rejects.toThrow('stream error');
  });
});

describe('index: measureResponseTime', () => {
  it('returns elapsed ms from request-start-time for non-stream response', () => {
    const start = Date.now() - 150;
    const config = { headers: { 'request-start-time': start } };
    const headers = { get: () => null };
    expect(measureResponseTime(config, headers, false)).toBeGreaterThanOrEqual(150);
  });

  it('falls back to Number(request-duration) when request-start-time is absent', () => {
    const config = {};
    const headers = { get: (k) => (k === 'request-duration' ? '300' : null) };
    expect(measureResponseTime(config, headers, false)).toBe(300);
  });

  it('returns Number(request-duration) for stream (SSE) response', () => {
    const config = {};
    const headers = { get: (k) => (k === 'request-duration' ? '50' : null) };
    expect(measureResponseTime(config, headers, true)).toBe(50);
  });

  it('returns 0 when both request-start-time and request-duration are absent', () => {
    const config = {};
    const headers = { get: () => null };
    expect(measureResponseTime(config, headers, true)).toBe(0);
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
