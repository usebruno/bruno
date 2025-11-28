// Simple smoke tests to verify proxy setup doesn't crash
// The actual proxy functionality will be tested in integration tests

describe('OAuth2 Proxy Support', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    // Clear proxy env vars
    delete process.env.http_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTPS_PROXY;
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  test('should not crash when proxy env vars are not set', () => {
    // This is a smoke test to ensure the module loads
    const { getOAuth2Token } = require('./oauth2-helper');
    expect(getOAuth2Token).toBeDefined();
    expect(typeof getOAuth2Token).toBe('function');
  });

  test('should not crash when HTTP_PROXY is set', () => {
    process.env.HTTP_PROXY = 'http://proxy.example.com:8080';

    // Reload module to pick up env vars
    jest.resetModules();
    const { getOAuth2Token } = require('./oauth2-helper');
    expect(getOAuth2Token).toBeDefined();
    expect(typeof getOAuth2Token).toBe('function');
  });

  test('should not crash when HTTPS_PROXY is set', () => {
    process.env.HTTPS_PROXY = 'https://proxy.example.com:8443';

    // Reload module to pick up env vars
    jest.resetModules();
    const { getOAuth2Token } = require('./oauth2-helper');
    expect(getOAuth2Token).toBeDefined();
    expect(typeof getOAuth2Token).toBe('function');
  });

  test('should not crash when both proxies are set', () => {
    process.env.HTTP_PROXY = 'http://proxy.example.com:8080';
    process.env.HTTPS_PROXY = 'https://proxy.example.com:8443';

    // Reload module to pick up env vars
    jest.resetModules();
    const { getOAuth2Token } = require('./oauth2-helper');
    expect(getOAuth2Token).toBeDefined();
    expect(typeof getOAuth2Token).toBe('function');
  });
});
