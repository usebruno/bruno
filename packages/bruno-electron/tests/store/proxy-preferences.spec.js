let mockStoreData = {};

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    return {
      get: (key, fallback) => (key in mockStoreData ? mockStoreData[key] : fallback),
      set: (key, value) => {
        mockStoreData[key] = value;
      }
    };
  });
});

const { getPreferences } = require('../../src/store/preferences');

describe('getPreferences - proxy configuration transformation', () => {
  beforeEach(() => {
    // Reset mock store data before each test
    mockStoreData = {};
  });

  describe('legacy proxy format with enabled flag', () => {
    test('should transform enabled: true to proxy object', () => {
      const legacyConfig = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        }
      };

      mockStoreData.preferences = legacyConfig;

      const result = getPreferences();

      expect(result.proxy).toEqual({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: false,
          username: '',
          password: ''
        },
        bypassProxy: ''
      });
    });

    test('should transform enabled: false to false', () => {
      const legacyConfig = {
        proxy: {
          enabled: false,
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        }
      };

      mockStoreData.preferences = legacyConfig;

      const result = getPreferences();

      expect(result.proxy).toBe(false);
    });
  });

  describe('legacy proxy format with mode flag', () => {
    test('should transform mode: "on" to proxy object', () => {
      const legacyConfig = {
        proxy: {
          mode: 'on',
          protocol: 'https',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: true,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: 'localhost'
        }
      };

      mockStoreData.preferences = legacyConfig;

      const result = getPreferences();

      expect(result.proxy).toEqual({
        protocol: 'https',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: true,
          username: 'user',
          password: 'pass'
        },
        bypassProxy: 'localhost'
      });
    });

    test('should transform mode: "off" to false', () => {
      const legacyConfig = {
        proxy: {
          mode: 'off',
          protocol: 'http',
          hostname: '',
          port: null,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        }
      };

      mockStoreData.preferences = legacyConfig;

      const result = getPreferences();

      expect(result.proxy).toBe(false);
    });

    test('should transform mode: "system" to "system"', () => {
      const legacyConfig = {
        proxy: {
          mode: 'system',
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        }
      };

      mockStoreData.preferences = legacyConfig;

      const result = getPreferences();

      expect(result.proxy).toBe('system');
    });
  });

  describe('newer proxy formats (no transformation needed)', () => {
    test('should preserve proxy: false', () => {
      const config = {
        proxy: false
      };

      mockStoreData.preferences = config;

      const result = getPreferences();

      expect(result.proxy).toBe(false);
    });

    test('should preserve proxy: "system"', () => {
      const config = {
        proxy: 'system'
      };

      mockStoreData.preferences = config;

      const result = getPreferences();

      expect(result.proxy).toBe('system');
    });

    test('should preserve proxy object without enabled/mode flags', () => {
      const config = {
        proxy: {
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: true,
            username: 'testuser',
            password: 'testpass'
          },
          bypassProxy: '*.local'
        }
      };

      mockStoreData.preferences = config;

      const result = getPreferences();

      expect(result.proxy).toEqual(config.proxy);
    });
  });

  describe('edge cases and defaults', () => {
    test('should use default proxy: false when no proxy config exists', () => {
      mockStoreData.preferences = {};

      const result = getPreferences();

      expect(result.proxy).toBe(false);
    });

    test('should handle proxy object with both enabled: true and mode flags', () => {
      const config = {
        proxy: {
          enabled: true,
          mode: 'off',
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: false,
            username: '',
            password: ''
          }
        }
      };

      mockStoreData.preferences = config;

      const result = getPreferences();

      // `mode` has preference over `enabled`, proxy is set to `false`
      expect(result.proxy).toBe(false);
    });

    test('should handle proxy object with both enabled: false and mode flags', () => {
      const config = {
        proxy: {
          enabled: false,
          mode: 'on',
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090,
          auth: {
            enabled: false,
            username: '',
            password: ''
          }
        }
      };

      mockStoreData.preferences = config;

      const result = getPreferences();

      // `mode` has preference over `enabled`, proxy is set to the proxy config object
      expect(result.proxy).toEqual({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090,
        auth: {
          enabled: false,
          username: '',
          password: ''
        }
      });
    });

    test('should merge other preferences with defaults while preserving transformed proxy', () => {
      const config = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: '127.0.0.1',
          port: 8090
        },
        font: {
          codeFont: 'default',
          codeFontSize: 14
        }
      };

      mockStoreData.preferences = config;

      const result = getPreferences();

      // Should have transformed proxy
      expect(result.proxy).toEqual({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      });

      // Should have custom font settings
      expect(result.font).toEqual({
        codeFont: 'default',
        codeFontSize: 14
      });

      // Should have default request settings
      expect(result.request.sslVerification).toBe(true);
      expect(result.request.timeout).toBe(0);
    });
  });
});
