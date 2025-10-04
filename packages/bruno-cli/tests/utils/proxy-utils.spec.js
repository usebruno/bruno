const { getProxyConfig } = require('../../src/utils/proxy-util');

describe('getProxyConfig', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('noproxy parameter', () => {
    test('should return proxyMode: "off" when noproxy is true', () => {
      const result = getProxyConfig({ brunoConfig: {}, noproxy: true });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('collection proxy: false (explicitly disabled)', () => {
    test('should return proxyMode: "off" when collection proxy is false', () => {
      const result = getProxyConfig({ brunoConfig: { proxy: false } });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('collection proxy object (override)', () => {
    test('should return proxyMode: "on" with collection proxy config', () => {
      const proxyConfig = {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: false,
          username: '',
          password: ''
        }
      };

      const result = getProxyConfig({ brunoConfig: { proxy: proxyConfig } });

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(proxyConfig);
    });

    test('should handle proxy object with auth enabled', () => {
      const proxyConfig = {
        protocol: 'https',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: true,
          username: 'user',
          password: 'pass'
        },
        bypassProxy: 'localhost'
      };

      const result = getProxyConfig({ brunoConfig: { proxy: proxyConfig } });

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(proxyConfig);
    });
  });

  describe('collection proxy: "inherit" (use system env vars)', () => {
    test('should use system proxy when collection proxy is "inherit"', () => {
      process.env.HTTP_PROXY = 'http://localhost:8091';
      process.env.HTTPS_PROXY = 'https://localhost:8091';
      process.env.NO_PROXY = 'localhost,127.0.0.1';

      const result = getProxyConfig({ brunoConfig: { proxy: 'inherit' } });

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({
        http_proxy: 'http://localhost:8091',
        https_proxy: 'https://localhost:8091',
        no_proxy: 'localhost,127.0.0.1'
      });
    });

    test('should handle empty system env vars when inheriting', () => {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.NO_PROXY;

      const result = getProxyConfig({ brunoConfig: { proxy: 'inherit' } });

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({
        http_proxy: undefined,
        https_proxy: undefined,
        no_proxy: undefined
      });
    });

    test('should default to off when no collection proxy is specified', () => {
      process.env.HTTP_PROXY = 'http://localhost:8091';

      const result = getProxyConfig({ brunoConfig: {} });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('legacy collection proxy format with enabled flag', () => {
    test('should return proxyMode: "on" when legacy enabled: true', () => {
      const legacyProxyConfig = {
        enabled: true,
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: false,
          username: '',
          password: ''
        }
      };

      const result = getProxyConfig({ brunoConfig: { proxy: legacyProxyConfig } });

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(legacyProxyConfig);
    });

    test('should use system proxy when legacy enabled: "global"', () => {
      const legacyProxyConfig = {
        enabled: 'global',
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      process.env.HTTP_PROXY = 'https://localhost:8091';

      const result = getProxyConfig({ brunoConfig: { proxy: legacyProxyConfig } });

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({
        http_proxy: 'https://localhost:8091',
        https_proxy: undefined,
        no_proxy: undefined
      });
    });

    test('should return proxyMode: "off" for other legacy enabled values', () => {
      const legacyProxyConfig = {
        enabled: false,
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };

      const result = getProxyConfig({ brunoConfig: { proxy: legacyProxyConfig } });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('edge cases', () => {
    test('should handle null collection proxy as off', () => {
      process.env.HTTP_PROXY = 'http://localhost:8091';

      const result = getProxyConfig({ brunoConfig: { proxy: null } });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle undefined collection proxy as off', () => {
      process.env.HTTPS_PROXY = 'https://localhost:8091';

      const result = getProxyConfig({ brunoConfig: { proxy: undefined } });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });
});
