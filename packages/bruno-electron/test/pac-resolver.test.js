describe('pac-resolver (electron)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    const { clearCache } = require('../src/utils/pac-resolver');
    clearCache();
    jest.clearAllMocks();
  });

  /** Mock pac-resolver (v7: { createPacResolver }) and quickjs-emscripten */
  const setupPacMocks = (resolverFn = async () => 'PROXY p.example:8080; DIRECT') => {
    const mockQjs = {};
    jest.doMock('quickjs-emscripten', () => ({
      getQuickJS: jest.fn(async () => mockQjs)
    }));
    const createPacResolverMock = jest.fn((qjs, script) => resolverFn);
    jest.doMock('pac-resolver', () => ({ createPacResolver: createPacResolverMock }));
    return { mockQjs, createPacResolverMock };
  };

  /** Mock fs.promises.readFile for success */
  const mockFsReadSuccess = (content) => {
    jest.doMock('fs', () => ({
      promises: { readFile: jest.fn().mockResolvedValue(content) }
    }));
  };

  /** Mock fs.promises.readFile to throw */
  const mockFsReadError = (err) => {
    jest.doMock('fs', () => ({
      promises: { readFile: jest.fn().mockRejectedValue(err) }
    }));
  };

  /** Mock axios.get for success */
  const mockAxiosSuccess = (text) => {
    jest.doMock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: text }) }));
  };

  /** Mock axios.get for a non-2xx HTTP response */
  const mockAxiosHttpError = (status) => {
    const err = Object.assign(new Error(`Request failed with status code ${status}`), {
      response: { status }
    });
    jest.doMock('axios', () => ({ get: jest.fn().mockRejectedValue(err) }));
  };

  /** Mock axios.get for a network-level error (no response) */
  const mockAxiosNetworkError = (message) => {
    jest.doMock('axios', () => ({ get: jest.fn().mockRejectedValue(new Error(message)) }));
  };

  test('throws when pacUrl is not provided', async () => {
    const { getPacResolver } = require('../src/utils/pac-resolver');
    await expect(getPacResolver({})).rejects.toThrow('pacUrl must be provided');
  });

  test('downloads PAC via axios and returns resolver that splits directives', async () => {
    const pacScript = 'function FindProxyForURL(url, host) { return "PROXY p.example:8080; DIRECT"; }';
    mockAxiosSuccess(pacScript);
    const { mockQjs, createPacResolverMock } = setupPacMocks(async () => 'PROXY p.example:8080; DIRECT');

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const { get: axiosGet } = require('axios');

    const pacUrl = 'http://example.com/proxy.pac';
    const wrapper = await getPacResolver({ pacUrl });

    const directives = await wrapper.resolve('http://foo.example/');
    expect(directives).toEqual(['PROXY p.example:8080', 'DIRECT']);
    expect(createPacResolverMock).toHaveBeenCalledWith(mockQjs, pacScript);
    expect(axiosGet).toHaveBeenCalledWith(pacUrl, expect.objectContaining({ proxy: false }));
  });

  test('passes TLS options to https.Agent for HTTPS pac URLs', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const mockAgentConstructor = jest.fn();
    jest.doMock('https', () => ({ Agent: mockAgentConstructor }));

    const { getPacResolver } = require('../src/utils/pac-resolver');

    const httpsAgentRequestFields = {
      ca: 'ca-cert-data',
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    };
    await getPacResolver({ pacUrl: 'https://secure.example.com/proxy.pac', httpsAgentRequestFields });

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

    const { getPacResolver } = require('../src/utils/pac-resolver');
    await getPacResolver({ pacUrl: 'http://example.com/proxy.pac' });

    expect(mockAgentConstructor).not.toHaveBeenCalled();
  });

  test('caches resolver and returns same wrapper on repeated calls', async () => {
    mockAxiosSuccess('script');
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver, _CACHE } = require('../src/utils/pac-resolver');
    const pacUrl = 'http://example.com/proxy.pac';

    const w1 = await getPacResolver({ pacUrl });
    const w2 = await getPacResolver({ pacUrl });

    expect(w1).toBe(w2);
    expect(_CACHE.size).toBeGreaterThan(0);
    expect(createPacResolverMock).toHaveBeenCalledTimes(1);
  });

  test('returns empty array when resolver returns non-string', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => null);

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const wrapper = await getPacResolver({ pacUrl: 'http://example.com/proxy.pac' });
    expect(await wrapper.resolve('http://example.com/')).toEqual([]);
  });

  test('rejects when axios throws a network error', async () => {
    mockAxiosNetworkError('ECONNREFUSED');
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('../src/utils/pac-resolver');
    await expect(getPacResolver({ pacUrl: 'http://unreachable/proxy.pac' })).rejects.toThrow('ECONNREFUSED');
  });

  test('rejects with readable message when PAC server returns non-2xx', async () => {
    mockAxiosHttpError(404);
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('../src/utils/pac-resolver');
    await expect(getPacResolver({ pacUrl: 'http://example.com/missing.pac' })).rejects.toThrow('Failed to fetch PAC (404)');
  });

  test('re-downloads PAC after cache TTL expires', async () => {
    const { get: axiosGet } = (() => {
      const m = jest.fn().mockResolvedValue({ data: 'script' });
      jest.doMock('axios', () => ({ get: m }));
      return { get: m };
    })();
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const pacUrl = 'http://example.com/proxy.pac';
    const ttlMs = 100;

    const w1 = await getPacResolver({ pacUrl, opts: { cacheTtlMs: ttlMs } });
    expect(axiosGet).toHaveBeenCalledTimes(1);

    const realNow = Date.now;
    Date.now = () => realNow() + ttlMs + 1;
    try {
      const w2 = await getPacResolver({ pacUrl, opts: { cacheTtlMs: ttlMs } });
      expect(axiosGet).toHaveBeenCalledTimes(2);
      expect(w2).not.toBe(w1);
    } finally {
      Date.now = realNow;
    }
  });

  test('resolve propagates error from a malformed PAC script', async () => {
    mockAxiosSuccess('not valid JS {{{{');
    setupPacMocks(async () => { throw new Error('invalid PAC script'); });

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const wrapper = await getPacResolver({ pacUrl: 'http://example.com/bad.pac' });
    await expect(wrapper.resolve('http://example.com/')).rejects.toThrow('invalid PAC script');
  });

  /** file:// PAC tests */
  test('reads PAC from filesystem for file:// URL and does not call axios', async () => {
    const pacScript = 'function FindProxyForURL(url, host) { return "PROXY p.example:8080"; }';
    mockFsReadSuccess(pacScript);
    const { mockQjs, createPacResolverMock } = setupPacMocks(async () => 'PROXY p.example:8080');
    const axiosGetMock = jest.fn();
    jest.doMock('axios', () => ({ get: axiosGetMock }));

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const { promises: { readFile } } = require('fs');

    const pacUrl = 'file:///Users/test/proxy.pac';
    const wrapper = await getPacResolver({ pacUrl });

    expect(readFile).toHaveBeenCalledWith('/Users/test/proxy.pac', 'utf8');
    expect(axiosGetMock).not.toHaveBeenCalled();
    expect(createPacResolverMock).toHaveBeenCalledWith(mockQjs, pacScript);

    const directives = await wrapper.resolve('http://foo.example/');
    expect(directives).toEqual(['PROXY p.example:8080']);
  });

  test('resolves Windows file:// URL to correct OS path', async () => {
    const pacScript = 'function FindProxyForURL(url, host) { return "DIRECT"; }';
    mockFsReadSuccess(pacScript);
    setupPacMocks(async () => 'DIRECT');

    // Mock fileURLToPath to simulate Windows path resolution
    jest.doMock('url', () => ({
      fileURLToPath: jest.fn(() => 'C:\\Users\\test\\proxy.pac')
    }));

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const { promises: { readFile } } = require('fs');
    const { fileURLToPath } = require('url');

    await getPacResolver({ pacUrl: 'file:///C:/Users/test/proxy.pac' });

    expect(fileURLToPath).toHaveBeenCalledWith('file:///C:/Users/test/proxy.pac');
    expect(readFile).toHaveBeenCalledWith('C:\\Users\\test\\proxy.pac', 'utf8');
  });

  test('rejects when file:// PAC file does not exist', async () => {
    const err = Object.assign(new Error('no such file or directory'), { code: 'ENOENT' });
    mockFsReadError(err);
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('../src/utils/pac-resolver');
    await expect(getPacResolver({ pacUrl: 'file:///nonexistent/proxy.pac' })).rejects.toThrow('no such file or directory');
  });

  test('caches resolver for file:// URL and reads file only once', async () => {
    mockFsReadSuccess('script');
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver } = require('../src/utils/pac-resolver');
    const { promises: { readFile } } = require('fs');

    const pacUrl = 'file:///Users/test/proxy.pac';
    const w1 = await getPacResolver({ pacUrl });
    const w2 = await getPacResolver({ pacUrl });

    expect(w1).toBe(w2);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(createPacResolverMock).toHaveBeenCalledTimes(1);
  });

  test('does not create https.Agent for file:// URL', async () => {
    mockFsReadSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const mockAgentConstructor = jest.fn();
    jest.doMock('https', () => ({ Agent: mockAgentConstructor }));

    const { getPacResolver } = require('../src/utils/pac-resolver');
    await getPacResolver({ pacUrl: 'file:///Users/test/proxy.pac' });

    expect(mockAgentConstructor).not.toHaveBeenCalled();
  });

  test('clearCache clears entries by prefix and entirely', async () => {
    mockAxiosSuccess('script');
    setupPacMocks(async () => 'DIRECT');

    const { getPacResolver, _CACHE, clearCache } = require('../src/utils/pac-resolver');
    await getPacResolver({ pacUrl: 'http://one/pac' });
    await getPacResolver({ pacUrl: 'http://two/pac' });

    expect(_CACHE.size).toBeGreaterThanOrEqual(2);

    clearCache('url:http://one');
    for (const key of Array.from(_CACHE.keys())) {
      expect(key.startsWith('url:http://one')).toBe(false);
    }

    clearCache();
    expect(_CACHE.size).toBe(0);
  });
});
