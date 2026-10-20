const mockSend = jest.fn();
jest.mock('@usebruno/requests', () => ({ sendHttp2Request: (...args) => mockSend(...args) }));

const { createHttp2Adapter } = require('./http2-adapter');

const baseResult = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  data: Buffer.from('{"ok":true}'),
  httpVersion: '2.0'
};

describe('createHttp2Adapter', () => {
  beforeEach(() => mockSend.mockReset());

  it('passes a normalized request to sendHttp2Request', async () => {
    mockSend.mockResolvedValue(baseResult);
    const headers = { toJSON: () => ({ 'content-type': 'application/json' }) };
    await createHttp2Adapter({ tlsOptions: { ca: 'CA' } })({
      method: 'post',
      url: 'https://x.test/a',
      headers,
      data: 'body',
      timeout: 1000,
      lookup: 'LK',
      responseType: 'arraybuffer'
    });
    expect(mockSend).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://x.test/a',
      headers: { 'content-type': 'application/json' },
      body: 'body',
      tlsOptions: { ca: 'CA' },
      lookup: 'LK',
      timeout: 1000
    });
  });

  it('returns the arraybuffer body as a Buffer and fills statusText', async () => {
    mockSend.mockResolvedValue(baseResult);
    const res = await createHttp2Adapter({})({ url: 'https://x.test/', responseType: 'arraybuffer' });
    expect(Buffer.isBuffer(res.data)).toBe(true);
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.config.url).toBe('https://x.test/');
    expect(res.httpVersion).toBe('2.0');
  });

  it('decodes a non-arraybuffer body to a string', async () => {
    mockSend.mockResolvedValue({ ...baseResult, data: Buffer.from('hello') });
    const res = await createHttp2Adapter({})({ url: 'https://x.test/', responseType: 'text' });
    expect(res.data).toBe('hello');
  });

  it('returns a readable stream for responseType "stream" that yields the full body', async () => {
    mockSend.mockResolvedValue({ ...baseResult, data: Buffer.from('streamed-body') });
    const res = await createHttp2Adapter({})({ url: 'https://x.test/', responseType: 'stream' });
    expect(typeof res.data.on).toBe('function');
    const chunks = [];
    for await (const chunk of res.data) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString()).toBe('streamed-body');
  });

  it('rejects with an AxiosError carrying the response when validateStatus fails', async () => {
    mockSend.mockResolvedValue({ ...baseResult, status: 404 });
    await expect(
      createHttp2Adapter({})({ url: 'https://x.test/', validateStatus: (s) => s < 400 })
    ).rejects.toMatchObject({ name: 'AxiosError', response: { status: 404 } });
  });

  it('resolves 5xx when validateStatus is permissive', async () => {
    mockSend.mockResolvedValue({ ...baseResult, status: 500 });
    const res = await createHttp2Adapter({})({ url: 'https://x.test/', validateStatus: () => true });
    expect(res.status).toBe(500);
  });

  it('sets Basic Authorization from URL credentials (url-decoded)', async () => {
    mockSend.mockResolvedValue(baseResult);
    await createHttp2Adapter({})({ url: 'https://user:p%40ss@x.test/', headers: {} });
    expect(mockSend.mock.calls[0][0].headers['Authorization']).toBe(`Basic ${Buffer.from('user:p@ss').toString('base64')}`);
  });

  it('URL credentials override an existing Authorization header', async () => {
    mockSend.mockResolvedValue(baseResult);
    await createHttp2Adapter({})({ url: 'https://user:pass@x.test/', headers: { Authorization: 'Basic folderCreds' } });
    expect(mockSend.mock.calls[0][0].headers['Authorization']).toBe(`Basic ${Buffer.from('user:pass').toString('base64')}`);
  });

  it('leaves an existing Authorization header when the URL has no credentials', async () => {
    mockSend.mockResolvedValue(baseResult);
    await createHttp2Adapter({})({ url: 'https://x.test/', headers: { Authorization: 'Bearer tok' } });
    expect(mockSend.mock.calls[0][0].headers['Authorization']).toBe('Bearer tok');
  });

  it('decompresses a gzip response body and drops content-encoding', async () => {
    const gz = require('node:zlib').gzipSync(Buffer.from('{"ok":true}'));
    mockSend.mockResolvedValue({
      status: 200,
      headers: { 'content-encoding': 'gzip', 'content-length': String(gz.length) },
      data: gz,
      httpVersion: '2.0'
    });
    const res = await createHttp2Adapter({})({ url: 'https://x.test/', responseType: 'arraybuffer' });
    expect(res.data.toString()).toBe('{"ok":true}');
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('maps a transport rejection to an AxiosError', async () => {
    mockSend.mockRejectedValue(new Error('boom'));
    await expect(createHttp2Adapter({})({ url: 'https://x.test/' })).rejects.toMatchObject({
      name: 'AxiosError',
      message: 'boom'
    });
  });

  it('defaults the method to GET', async () => {
    mockSend.mockResolvedValue(baseResult);
    await createHttp2Adapter({})({ url: 'https://x.test/' });
    expect(mockSend.mock.calls[0][0].method).toBe('GET');
  });
});
