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

describe('index: configureRequest', () => {
  it('Should add \'http://\' to the URL if no protocol is specified', async () => {
    const request = { method: 'GET', url: 'test-domain', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://test-domain');
  });

  it('Should NOT add \'http://\' to the URL if a protocol is specified', async () => {
    const request = { method: 'GET', url: 'ftp://test-domain', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('ftp://test-domain');
  });
});
