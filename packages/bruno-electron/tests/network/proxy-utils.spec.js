let mockBrunoConfig = {};
let mockPreferences = {};

jest.mock('lodash', () => ({
  get: jest.fn((obj, path, defaultValue) => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    return result;
  })
}));

jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    getGlobalProxyConfig: jest.fn(() => mockPreferences.proxy ?? 'system')
  }
}));

const { getProxyConfig, getGlobalProxyConfig } = require('../../src/ipc/network/cert-utils');

describe('Proxy configuration logic', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockBrunoConfig = {};
    mockPreferences = {};
    jest.clearAllMocks();
  });

  describe('getProxyConfig - collection proxy: false (explicitly disabled)', () => {
    test('should return proxyMode: "off" when collection proxy is false', () => {
      mockBrunoConfig = { proxy: false };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('getProxyConfig - collection proxy object (override app-level)', () => {
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
      mockBrunoConfig = { proxy: proxyConfig };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

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
      mockBrunoConfig = { proxy: proxyConfig };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(proxyConfig);
    });
  });

  describe('getProxyConfig - collection proxy: "inherit" (use app-level)', () => {
    test('should inherit global proxy when collection proxy is "inherit" and global is false', () => {
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: false };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should inherit global proxy when collection proxy is "inherit" and global is "system"', () => {
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: 'system' };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('should inherit global proxy object when collection proxy is "inherit"', () => {
      const globalProxyConfig = {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: true,
          username: 'testuser',
          password: 'testpass'
        }
      };
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: globalProxyConfig };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(globalProxyConfig);
    });

    test('should default to inherit when no collection proxy is specified', () => {
      mockBrunoConfig = {}; // No proxy config
      mockPreferences = { proxy: false };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('getGlobalProxyConfig - global proxy configuration scenarios', () => {
    test('should handle global proxy: false', () => {
      mockPreferences = { proxy: false };

      const result = getGlobalProxyConfig();

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle global proxy: "system"', () => {
      mockPreferences = { proxy: 'system' };

      const result = getGlobalProxyConfig();

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle global proxy object', () => {
      const globalProxyConfig = {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockPreferences = { proxy: globalProxyConfig };

      const result = getGlobalProxyConfig();

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(globalProxyConfig);
    });
  });

  describe('getProxyConfig - edge cases', () => {
    test('should handle null collection proxy as inherit', () => {
      mockBrunoConfig = { proxy: null };
      mockPreferences = { proxy: false };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle undefined collection proxy as inherit', () => {
      mockBrunoConfig = { proxy: undefined };
      mockPreferences = { proxy: 'system' };

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('collection proxy should be `inherit`, and global proxy must be `system` when proxy not set', () => {
      mockBrunoConfig = {};
      mockPreferences = {};

      const result = getProxyConfig({ brunoConfig: mockBrunoConfig });

      expect(result.proxyMode).toBe('system');
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

      const result = getProxyConfig({ brunoConfig: { proxy: legacyProxyConfig } });

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
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
});
