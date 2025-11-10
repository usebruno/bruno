
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

  test('throws when pacUrl is not provided', async () => {
    const { getPacResolver } = require('../src/net/pac-resolver');
    await expect(getPacResolver({})).rejects.toThrow('pacUrl must be provided');
  });

  test('downloads PAC and returns resolver that splits directives', async () => {
    // Mock node-fetch to return a successful response with script text
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'function FindProxyForURL(url, host) { return "PROXY p.example:8080; DIRECT"; }' });
    jest.doMock('node-fetch', () => mockFetch);

    // Mock pac-resolver to return a resolver function based on the script
    const pacMock = jest.fn((script) => {
      return async (url, host) => {
        // return the string format expected by the wrapper
        return 'PROXY p.example:8080; DIRECT';
      };
    });
    jest.doMock('pac-resolver', () => pacMock);

    const { getPacResolver } = require('../src/net/pac-resolver');

    const pacUrl = 'http://example.com/proxy.pac';
    const wrapper = await getPacResolver({ pacUrl });

    expect(typeof wrapper.resolve).toBe('function');
    const directives = await wrapper.resolve('http://foo.example/');
    expect(directives).toEqual(['PROXY p.example:8080', 'DIRECT']);

    // pac-resolver should have been called with the script text
    expect(pacMock).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(pacUrl, expect.any(Object));
  });

  test('caches resolver and returns same wrapper on repeated calls', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);

    const pacMock = jest.fn((script) => {
      return async (url, host) => 'DIRECT';
    });
    jest.doMock('pac-resolver', () => pacMock);

    const { getPacResolver, _CACHE } = require('../src/net/pac-resolver');

    const pacUrl = 'http://example.com/proxy.pac';
    const w1 = await getPacResolver({ pacUrl });
    const w2 = await getPacResolver({ pacUrl });

    expect(w1).toBe(w2);
    expect(_CACHE.size).toBeGreaterThan(0);
    expect(pacMock).toHaveBeenCalledTimes(1);
  });

  test('createWrapper returns empty array for non-string resolver output', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);

    const pacMock = jest.fn((script) => {
      return async (url, host) => null; // simulate invalid return
    });
    jest.doMock('pac-resolver', () => pacMock);

    const { getPacResolver } = require('../src/net/pac-resolver');
    const wrapper = await getPacResolver({ pacUrl: 'http://example.com/proxy.pac' });
    const out = await wrapper.resolve('http://example.com/');
    expect(out).toEqual([]);
  });

  test('clearCache clears entries by prefix and entirely', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => 'script' });
    jest.doMock('node-fetch', () => mockFetch);

    const pacMock = jest.fn((script) => async (url, host) => 'DIRECT');
    jest.doMock('pac-resolver', () => pacMock);

    const { getPacResolver, _CACHE, clearCache } = require('../src/net/pac-resolver');
    await getPacResolver({ pacUrl: 'http://one/pac' });
    await getPacResolver({ pacUrl: 'http://two/pac' });

    expect(_CACHE.size).toBeGreaterThanOrEqual(2);

    // clear only keys starting with url:http://one
    clearCache('url:http://one');
    for (const key of Array.from(_CACHE.keys())) {
      expect(key.startsWith('url:http://one')).toBe(false);
    }

    // clear all
    clearCache();
    expect(_CACHE.size).toBe(0);
  });
});
