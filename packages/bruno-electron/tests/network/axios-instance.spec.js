// Mock electron before requiring axios-instance
jest.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0'
  }
}));

// Mock preferences
jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    shouldStoreCookies: () => false,
    shouldSendCookies: () => false,
    isSslSessionCachingEnabled: () => true
  }
}));

// Mock cookies
jest.mock('../../src/utils/cookies', () => ({
  addCookieToJar: jest.fn(),
  getCookieStringForUrl: jest.fn()
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
