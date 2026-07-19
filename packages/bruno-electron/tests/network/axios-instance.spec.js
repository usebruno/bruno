// Mock electron before requiring axios-instance
jest.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0'
  }
}));

// Mock preferences
const mockShouldStoreCookies = jest.fn(() => true);
const mockShouldSendCookies = jest.fn(() => true);

jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    shouldStoreCookies: mockShouldStoreCookies,
    shouldSendCookies: mockShouldSendCookies,
    isSslSessionCachingEnabled: () => true
  }
}));

// Mock cookies
const mockAddCookieToJar = jest.fn();
const mockGetCookieStringForUrl = jest.fn();

jest.mock('../../src/utils/cookies', () => ({
  addCookieToJar: mockAddCookieToJar,
  getCookieStringForUrl: mockGetCookieStringForUrl
}));

// Mock proxy-util
jest.mock('../../src/utils/proxy-util', () => ({
  setupProxyAgents: jest.fn()
}));

// Mock form-data
jest.mock('../../src/utils/form-data', () => ({
  createFormData: jest.fn()
}));

const { makeAxiosInstance } = require('../../src/ipc/network/axios-instance');

function createStubAdapter() {
  let capturedConfig = null;

  const adapter = (config) => {
    capturedConfig = config;
    return Promise.resolve({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });
  };

  adapter.getConfig = () => capturedConfig;

  return adapter;
}

describe('axios-instance: default headers', () => {
  beforeEach(() => {
    mockAddCookieToJar.mockReset();
    mockGetCookieStringForUrl.mockReset();
  });

  test('setting User-Agent does not clobber the axios default Accept header', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });

    // axios.create() sets Accept by default; assigning a new object to defaults.headers.common
    // would nuke it. Guard against that regression.
    expect(stubAdapter.getConfig().headers['Accept']).toMatch(/application\/json/);
  });

  test('sets User-Agent header to bruno-runtime version', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });

    expect(stubAdapter.getConfig().headers['User-Agent']).toMatch(/^bruno-runtime\//);
  });

  test('does not store or inject cookie jar cookies on redirects when request cookie automation is disabled', async () => {
    mockGetCookieStringForUrl.mockReturnValue('session=from-jar');
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance({ storeCookies: false, sendCookies: false });
    const redirectError = {
      config: {
        url: 'https://api.example.com/start',
        method: 'get',
        headers: { Cookie: 'manual=value' },
        metadata: { timeline: [] },
        adapter: stubAdapter
      },
      response: {
        status: 302,
        headers: {
          'location': 'https://api.example.com/target',
          'set-cookie': ['session=from-response']
        }
      }
    };

    await instance.interceptors.response.handlers[0].rejected(redirectError);

    expect(mockGetCookieStringForUrl).not.toHaveBeenCalled();
    expect(mockAddCookieToJar).not.toHaveBeenCalled();
    expect(stubAdapter.getConfig().headers.Cookie).toBe('manual=value');
  });

  test('strips inherited sensitive headers and injects only target cookies on cross-origin redirects', async () => {
    mockGetCookieStringForUrl.mockImplementation((url) =>
      url === 'https://other.example.com/target' ? 'target=from-jar' : '');
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance({ storeCookies: false, sendCookies: true });
    const redirectError = {
      config: {
        url: 'https://api.example.com/start',
        method: 'get',
        headers: {
          'Authorization': 'Bearer secret',
          'Proxy-Authorization': 'Basic secret',
          'Cookie': 'source=manual',
          'X-Custom': 'keep'
        },
        metadata: { timeline: [] },
        adapter: stubAdapter
      },
      response: {
        status: 302,
        headers: {
          location: 'https://other.example.com/target'
        }
      }
    };

    await instance.interceptors.response.handlers[0].rejected(redirectError);

    const headers = stubAdapter.getConfig().headers;
    expect(headers.Authorization).toBeUndefined();
    expect(headers['Proxy-Authorization']).toBeUndefined();
    expect(headers['X-Custom']).toBe('keep');
    expect(Object.keys(headers).filter((name) => name.toLowerCase() === 'cookie')).toHaveLength(1);
    expect(headers.get('cookie')).toBe('target=from-jar');
  });

  test('merges cookies without duplicate headers and preserves jar precedence on same-origin redirects', async () => {
    mockGetCookieStringForUrl.mockReturnValue('session=from-jar');
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance({ storeCookies: false, sendCookies: true });
    const redirectError = {
      config: {
        url: 'https://api.example.com/start',
        method: 'get',
        headers: { Cookie: 'session=manual; manual=value' },
        metadata: { timeline: [] },
        adapter: stubAdapter
      },
      response: {
        status: 302,
        headers: {
          location: 'https://api.example.com/target'
        }
      }
    };

    await instance.interceptors.response.handlers[0].rejected(redirectError);

    const headers = stubAdapter.getConfig().headers;
    expect(Object.keys(headers).filter((name) => name.toLowerCase() === 'cookie')).toHaveLength(1);
    expect(headers.get('cookie')).toBe('session=from-jar; manual=value');
  });
});

describe('axios-instance: DNS lookup behavior (GitHub #7343)', () => {
  let axiosInstance;

  beforeEach(() => {
    axiosInstance = makeAxiosInstance();
  });

  test('should set custom lookup function for localhost URLs', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://localhost:3000/api/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should set custom lookup function for 127.0.0.1 URLs', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://127.0.0.1:8080/api/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should set custom lookup function for ::1 (IPv6 localhost) URLs', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://[::1]:8080/api/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should set custom lookup function for *.localhost domains (RFC 6761)', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://api.localhost:3000/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should NOT set custom lookup for external domains', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'https://api.example.com/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeUndefined();
  });

  test('should NOT set custom lookup for httpbin.org', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'https://httpbin.org/get',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeUndefined();
  });

  test('should clear inherited lookup when URL changes from localhost to external domain', async () => {
    // This simulates what happens during a redirect:
    // 1. Original request to localhost sets lookup
    // 2. Redirect spreads config including lookup
    // 3. New request to external domain should clear the lookup
    const stubAdapter = createStubAdapter();
    const inheritedLookup = (_hostname, _options, callback) => {
      callback(null, '127.0.0.1', 4);
    };

    await axiosInstance({
      url: 'https://external-auth-provider.com/oauth/authorize',
      method: 'get',
      adapter: stubAdapter,
      lookup: inheritedLookup // Simulates inherited lookup from redirect
    });

    const config = stubAdapter.getConfig();
    // The lookup should be cleared for external domains
    expect(config.lookup).toBeUndefined();
  });

  test('should replace inherited lookup with a fresh one when redirecting localhost to localhost', async () => {
    // Simulates a redirect from one localhost endpoint to another:
    // the inherited lookup from the original request should be replaced
    // (not just kept) by a fresh localhost lookup function.
    const stubAdapter = createStubAdapter();
    const inheritedLookup = (_hostname, _options, callback) => {
      callback(null, '127.0.0.1', 4);
    };

    await axiosInstance({
      url: 'http://localhost:3182/redirected',
      method: 'get',
      adapter: stubAdapter,
      lookup: inheritedLookup // Simulates inherited lookup from redirect
    });

    const config = stubAdapter.getConfig();
    // Should have a lookup set for localhost, but it should be a fresh one
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
    expect(config.lookup).not.toBe(inheritedLookup);
  });
});
