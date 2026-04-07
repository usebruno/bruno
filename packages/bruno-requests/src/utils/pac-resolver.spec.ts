describe('pac-resolver (shared)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    const { clearPacCache } = require('./pac-resolver');
    clearPacCache();
    jest.clearAllMocks();
  });

  /** Mock pac-resolver (v7: { createPacResolver }) and quickjs-emscripten */
  const setupPacMocks = (resolverFn: (...args: any[]) => Promise<any> = async () => 'PROXY p.example:8080; DIRECT') => {
    jest.doMock('quickjs-emscripten', () => ({
      getQuickJS: jest.fn(async () => ({}))
    }));
    const createPacResolverMock = jest.fn((_qjs: any, _script: any) => resolverFn);
    jest.doMock('pac-resolver', () => ({ createPacResolver: createPacResolverMock }));
    return { createPacResolverMock };
  };

  const mockFsReadSuccess = (content: string) => {
    jest.doMock('fs/promises', () => ({
      readFile: jest.fn().mockResolvedValue(content)
    }));
  };

  const mockFsReadError = (err: Error) => {
    jest.doMock('fs/promises', () => ({
      readFile: jest.fn().mockRejectedValue(err)
    }));
  };

  const mockAxiosSuccess = (text: string) => {
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: text }) }));
  };

  const mockAxiosHttpError = (status: number) => {
    const err = Object.assign(new Error(`Request failed with status code ${status}`), {
      response: { status }
    });
    jest.doMock('axios', () => ({ get: jest.fn().mockRejectedValue(err) }));
  };

  const mockAxiosNetworkError = (message: string) => {
    jest.doMock('axios', () => ({ get: jest.fn().mockRejectedValue(new Error(message)) }));
  };

  test('throws when pacSource is not provided', async () => {
    const { getPacResolver } = require('./pac-resolver');
    await expect(getPacResolver({})).rejects.toThrow('pacSource must be provided');
  });

  test('downloads PAC via axios and returns resolver that splits directives', async () => {
    const pacScript = 'function FindProxyForURL(url, host) { return "PROXY p.example:8080; DIRECT"; }';
    mockAxiosSuccess(pacScript);
    const { createPacResolverMock } = setupPacMocks(async () => 'PROXY p.example:8080; DIRECT');

    const { getPacResolver } = require('./pac-resolver');
    const { get: axiosGet } = require('axios');

    const pacSource = 'http://example.com/proxy.pac';
    const wrapper = await getPacResolver({ pacSource });

    const directives = await wrapper.resolve('http://foo.example/');
    expect(directives).toEqual(['PROXY p.example:8080', 'DIRECT']);
    expect(createPacResolverMock).toHaveBeenCalledWith(expect.any(Object), pacScript);
    expect(axiosGet).toHaveBeenCalledWith(pacSource, expect.objectContaining({ proxy: false }));
  });

  test('passes TLS options to https.Agent for HTTPS pac URLs', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const mockAgentConstructor = jest.fn();
    jest.doMock('https', () => ({ Agent: mockAgentConstructor }));

    const { getPacResolver } = require('./pac-resolver');

    const httpsAgentRequestFields = {
      ca: 'ca-cert-data',
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    };
    await getPacResolver({ pacSource: 'https://secure.example.com/proxy.pac', httpsAgentRequestFields });

    expect(mockAgentConstructor).toHaveBeenCalledWith({
      ca: 'ca-cert-data',
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    });
  });

  test('does not create https.Agent for HTTP pac URLs', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const mockAgentConstructor = jest.fn();
    jest.doMock('https', () => ({ Agent: mockAgentConstructor }));

    const { getPacResolver } = require('./pac-resolver');
    await getPacResolver({ pacSource: 'http://example.com/proxy.pac' });

    expect(mockAgentConstructor).not.toHaveBeenCalled();
  });

  test('caches resolver and returns same wrapper on repeated calls', async () => {
    mockAxiosSuccess('script');
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver, _CACHE } = require('./pac-resolver');
    const pacSource = 'http://example.com/proxy.pac';

    const w1 = await getPacResolver({ pacSource });
    const w2 = await getPacResolver({ pacSource });

    expect(w1).toBe(w2);
    expect(_CACHE.size).toBeGreaterThan(0);
    expect(createPacResolverMock).toHaveBeenCalledTimes(1);
  });

  test('returns empty array when resolver returns non-string', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => null);

    const { getPacResolver } = require('./pac-resolver');
    const wrapper = await getPacResolver({ pacSource: 'http://example.com/proxy.pac' });
    expect(await wrapper.resolve('http://example.com/')).toEqual([]);
  });

  test('rejects when axios throws a network error', async () => {
    mockAxiosNetworkError('ECONNREFUSED');
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('./pac-resolver');
    await expect(getPacResolver({ pacSource: 'http://unreachable/proxy.pac' })).rejects.toThrow('ECONNREFUSED');
  });

  test('rejects with readable message when PAC server returns non-2xx', async () => {
    mockAxiosHttpError(404);
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('./pac-resolver');
    await expect(getPacResolver({ pacSource: 'http://example.com/missing.pac' })).rejects.toThrow('Failed to fetch PAC (404)');
  });

  test('re-downloads PAC after cache TTL expires', async () => {
    const axiosGetMock = jest.fn().mockResolvedValue({ data: 'script' });
    jest.doMock('axios', () => ({ get: axiosGetMock }));
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver } = require('./pac-resolver');
    const pacSource = 'http://example.com/proxy.pac';
    const ttlMs = 100;

    const w1 = await getPacResolver({ pacSource, opts: { cacheTtlMs: ttlMs } });
    expect(axiosGetMock).toHaveBeenCalledTimes(1);

    const realNow = Date.now;
    Date.now = () => realNow() + ttlMs + 1;
    try {
      const w2 = await getPacResolver({ pacSource, opts: { cacheTtlMs: ttlMs } });
      expect(axiosGetMock).toHaveBeenCalledTimes(2);
      expect(w2).not.toBe(w1);
    } finally {
      Date.now = realNow;
    }
  });

  test('resolve propagates error from a malformed PAC script', async () => {
    mockAxiosSuccess('not valid JS {{{{');
    setupPacMocks(async () => { throw new Error('invalid PAC script'); });

    const { getPacResolver } = require('./pac-resolver');
    const wrapper = await getPacResolver({ pacSource: 'http://example.com/bad.pac' });
    await expect(wrapper.resolve('http://example.com/')).rejects.toThrow('invalid PAC script');
  });

  /** file:// PAC tests */
  test('reads PAC from filesystem for file:// URL and does not call axios', async () => {
    const pacScript = 'function FindProxyForURL(url, host) { return "PROXY p.example:8080"; }';
    const expectedPath = '/Users/test/proxy.pac';
    mockFsReadSuccess(pacScript);
    const { createPacResolverMock } = setupPacMocks(async () => 'PROXY p.example:8080');
    const axiosGetMock = jest.fn();
    jest.doMock('axios', () => ({ get: axiosGetMock }));
    jest.doMock('url', () => ({ fileURLToPath: jest.fn(() => expectedPath) }));

    const { getPacResolver } = require('./pac-resolver');
    const { readFile } = require('fs/promises');

    const pacSource = 'file:///Users/test/proxy.pac';
    const wrapper = await getPacResolver({ pacSource });

    expect(readFile).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(axiosGetMock).not.toHaveBeenCalled();
    expect(createPacResolverMock).toHaveBeenCalledWith(expect.any(Object), pacScript);

    const directives = await wrapper.resolve('http://foo.example/');
    expect(directives).toEqual(['PROXY p.example:8080']);
  });

  test('resolves Windows file:// URL to correct OS path', async () => {
    const pacScript = 'function FindProxyForURL(url, host) { return "DIRECT"; }';
    mockFsReadSuccess(pacScript);
    setupPacMocks(async () => 'DIRECT');

    jest.doMock('url', () => ({
      fileURLToPath: jest.fn(() => 'C:\\Users\\test\\proxy.pac')
    }));

    const { getPacResolver } = require('./pac-resolver');
    const { readFile } = require('fs/promises');
    const { fileURLToPath } = require('url');

    await getPacResolver({ pacSource: 'file:///C:/Users/test/proxy.pac' });

    expect(fileURLToPath).toHaveBeenCalledWith('file:///C:/Users/test/proxy.pac');
    expect(readFile).toHaveBeenCalledWith('C:\\Users\\test\\proxy.pac', 'utf8');
  });

  test('rejects when file:// PAC file does not exist', async () => {
    const err = Object.assign(new Error('no such file or directory'), { code: 'ENOENT' });
    mockFsReadError(err);
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('./pac-resolver');
    await expect(getPacResolver({ pacSource: 'file:///nonexistent/proxy.pac' })).rejects.toThrow('no such file or directory');
  });

  test('caches resolver for file:// URL and reads file only once', async () => {
    mockFsReadSuccess('script');
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver } = require('./pac-resolver');
    const { readFile } = require('fs/promises');

    const pacSource = 'file:///Users/test/proxy.pac';
    const w1 = await getPacResolver({ pacSource });
    const w2 = await getPacResolver({ pacSource });

    expect(w1).toBe(w2);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(createPacResolverMock).toHaveBeenCalledTimes(1);
  });

  test('does not create https.Agent for file:// URL', async () => {
    mockFsReadSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const mockAgentConstructor = jest.fn();
    jest.doMock('https', () => ({ Agent: mockAgentConstructor }));

    const { getPacResolver } = require('./pac-resolver');
    await getPacResolver({ pacSource: 'file:///Users/test/proxy.pac' });

    expect(mockAgentConstructor).not.toHaveBeenCalled();
  });

  test('clearPacCache clears entries by prefix and entirely', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const { getPacResolver, _CACHE, clearPacCache } = require('./pac-resolver');
    await getPacResolver({ pacSource: 'http://one/pac' });
    await getPacResolver({ pacSource: 'http://two/pac' });

    expect(_CACHE.size).toBeGreaterThanOrEqual(2);

    clearPacCache('url:http://one');
    for (const key of Array.from(_CACHE.keys()) as string[]) {
      expect(key.startsWith('url:http://one')).toBe(false);
    }

    clearPacCache();
    expect(_CACHE.size).toBe(0);
  });
});
