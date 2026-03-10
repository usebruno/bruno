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

describe('axios-instance: DNS lookup behavior (GitHub #7343)', () => {
  let axiosInstance;
  let requestInterceptor;

  beforeEach(() => {
    axiosInstance = makeAxiosInstance();
    // Get the request interceptor
    requestInterceptor = axiosInstance.interceptors.request.handlers[0];
  });

  test('should set custom lookup function for localhost URLs', async () => {
    const config = {
      url: 'http://localhost:3000/api/test',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    expect(result.lookup).toBeDefined();
    expect(typeof result.lookup).toBe('function');
  });

  test('should set custom lookup function for 127.0.0.1 URLs', async () => {
    const config = {
      url: 'http://127.0.0.1:8080/api/test',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    expect(result.lookup).toBeDefined();
    expect(typeof result.lookup).toBe('function');
  });

  test('should set custom lookup function for ::1 (IPv6 localhost) URLs', async () => {
    const config = {
      url: 'http://[::1]:8080/api/test',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    expect(result.lookup).toBeDefined();
    expect(typeof result.lookup).toBe('function');
  });

  test('should set custom lookup function for *.localhost domains (RFC 6761)', async () => {
    const config = {
      url: 'http://api.localhost:3000/test',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    expect(result.lookup).toBeDefined();
    expect(typeof result.lookup).toBe('function');
  });

  test('should NOT set custom lookup for external domains', async () => {
    const config = {
      url: 'https://api.example.com/test',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    expect(result.lookup).toBeUndefined();
  });

  test('should NOT set custom lookup for httpbin.org', async () => {
    const config = {
      url: 'https://httpbin.org/get',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    expect(result.lookup).toBeUndefined();
  });

  test('should clear inherited lookup when URL changes from localhost to external domain', async () => {
    // This simulates what happens during a redirect:
    // 1. Original request to localhost sets lookup
    // 2. Redirect spreads config including lookup
    // 3. New request to external domain should clear the lookup
    const configWithInheritedLookup = {
      url: 'https://external-auth-provider.com/oauth/authorize',
      method: 'get',
      headers: {},
      lookup: (_hostname, _options, callback) => {
        // This is the localhost lookup that was inherited
        callback(null, '127.0.0.1', 4);
      }
    };

    const result = await requestInterceptor.fulfilled(configWithInheritedLookup);

    // The lookup should be cleared for external domains
    expect(result.lookup).toBeUndefined();
  });

  test('should preserve lookup functionality when redirecting localhost to localhost', async () => {
    const config = {
      url: 'http://localhost:3182/redirected',
      method: 'get',
      headers: {}
    };

    const result = await requestInterceptor.fulfilled(config);

    // Should have lookup set for localhost
    expect(result.lookup).toBeDefined();
    expect(typeof result.lookup).toBe('function');
  });
});
