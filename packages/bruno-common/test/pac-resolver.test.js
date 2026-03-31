
describe('pac-resolver wrapper', () => {
  beforeEach(() => {
    // reset module cache so mocks apply per-test
    jest.resetModules();
  });

  afterEach(() => {
    // ensure cache is cleared between tests
    const { clearCache } = require('../src/net/pac-resolver');
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

  test('throws when pacUrl is not provided', async () => {
    const { getPacResolver } = require('../src/net/pac-resolver');
    await expect(getPacResolver({})).rejects.toThrow('pacUrl must be provided');
  });

  test('downloads PAC and returns resolver that splits directives', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'function FindProxyForURL(url, host) { return "PROXY p.example:8080; DIRECT"; }' });
    jest.doMock('node-fetch', () => mockFetch);

    const { mockQjs, createPacResolverMock } = setupPacMocks(async (url, host) => 'PROXY p.example:8080; DIRECT');

    const { getPacResolver } = require('../src/net/pac-resolver');

    const pacUrl = 'http://example.com/proxy.pac';
    const wrapper = await getPacResolver({ pacUrl });

    expect(typeof wrapper.resolve).toBe('function');
    const directives = await wrapper.resolve('http://foo.example/');
    expect(directives).toEqual(['PROXY p.example:8080', 'DIRECT']);

    // createPacResolver should be called with the QJS instance and script text
    expect(createPacResolverMock).toHaveBeenCalledTimes(1);
    expect(createPacResolverMock).toHaveBeenCalledWith(mockQjs, expect.any(String));
    expect(mockFetch).toHaveBeenCalledWith(pacUrl, expect.any(Object));
  });

  test('caches resolver and returns same wrapper on repeated calls', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver, _CACHE } = require('../src/net/pac-resolver');

    const pacUrl = 'http://example.com/proxy.pac';
    const w1 = await getPacResolver({ pacUrl });
    const w2 = await getPacResolver({ pacUrl });

    expect(w1).toBe(w2);
    expect(_CACHE.size).toBeGreaterThan(0);
    expect(createPacResolverMock).toHaveBeenCalledTimes(1);
  });

  test('createWrapper returns empty array for non-string resolver output', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);
    setupPacMocks(async () => null);

    const { getPacResolver } = require('../src/net/pac-resolver');
    const wrapper = await getPacResolver({ pacUrl: 'http://example.com/proxy.pac' });
    const out = await wrapper.resolve('http://example.com/');
    expect(out).toEqual([]);
  });

  test('rejects when fetch throws a network error', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    jest.doMock('node-fetch', () => mockFetch);
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('../src/net/pac-resolver');
    await expect(getPacResolver({ pacUrl: 'http://unreachable/proxy.pac' })).rejects.toThrow('ECONNREFUSED');
  });

  test('rejects when PAC server returns a non-ok status', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    jest.doMock('node-fetch', () => mockFetch);
    jest.doMock('pac-resolver', () => ({ createPacResolver: jest.fn() }));
    jest.doMock('quickjs-emscripten', () => ({ getQuickJS: jest.fn(async () => ({})) }));

    const { getPacResolver } = require('../src/net/pac-resolver');
    await expect(getPacResolver({ pacUrl: 'http://example.com/missing.pac' })).rejects.toThrow('Failed to fetch PAC (404)');
  });

  test('re-downloads PAC after cache TTL expires', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);
    const { createPacResolverMock } = setupPacMocks(async () => 'DIRECT');

    const { getPacResolver } = require('../src/net/pac-resolver');

    const pacUrl = 'http://example.com/proxy.pac';
    const ttlMs = 100;

    // First call — downloads and caches
    const w1 = await getPacResolver({ pacUrl, opts: { cacheTtlMs: ttlMs } });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Simulate TTL expiry by moving Date.now() forward
    const realNow = Date.now;
    Date.now = () => realNow() + ttlMs + 1;
    try {
      const w2 = await getPacResolver({ pacUrl, opts: { cacheTtlMs: ttlMs } });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(w2).not.toBe(w1);
    } finally {
      Date.now = realNow;
    }
  });

  test('resolve propagates error from a malformed PAC script', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'not valid JS {{{{' });
    jest.doMock('node-fetch', () => mockFetch);
    setupPacMocks(async (url, host) => { throw new Error('invalid PAC script'); });

    const { getPacResolver } = require('../src/net/pac-resolver');
    const wrapper = await getPacResolver({ pacUrl: 'http://example.com/bad.pac' });
    await expect(wrapper.resolve('http://example.com/')).rejects.toThrow('invalid PAC script');
  });

  test('clearCache clears entries by prefix and entirely', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);
    setupPacMocks(async () => 'DIRECT');

    const { getPacResolver, _CACHE, clearCache } = require('../src/net/pac-resolver');
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
