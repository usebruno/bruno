const { configureRequest, promisifyStream, hasStreamHeaders } = require('../../src/ipc/network/index');
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
