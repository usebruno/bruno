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

const { getPreferences, savePreferences } = require('../../src/store/preferences');

describe('Proxy Preferences Migration', () => {
  beforeEach(() => {
    // Reset mock store data before each test
    mockStoreData = {};
  });

  describe('Default Proxy Settings', () => {
    it('should default to inherit: true for new users (empty preferences)', () => {
      // New user - no preferences.json exists, store returns empty object
      mockStoreData['preferences'] = {};

      const preferences = getPreferences();

      // New users get the default proxy settings with inherit: true
      expect(preferences.proxy.inherit).toBe(true);
      expect(preferences.proxy.disabled).toBeUndefined();
      expect(preferences.proxy.config).toBeDefined();
      expect(preferences.proxy.config.protocol).toBe('http');
      expect(preferences.proxy.config.hostname).toBe('');
      expect(preferences.proxy.config.port).toBeNull();
    });

    it('should default to disabled: true, inherit: false for existing users without proxy settings', () => {
      // Existing user - has preferences but no proxy property
      mockStoreData['preferences'] = {
        request: {
          sslVerification: true
        },
        font: {
          codeFont: 'default',
          codeFontSize: 13
        }
      };

      const preferences = getPreferences();

      // Existing users without proxy get disabled proxy by default
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBe(false);
      expect(preferences.proxy.config).toBeDefined();
      expect(preferences.proxy.config.protocol).toBe('http');
      expect(preferences.proxy.config.hostname).toBe('');
      expect(preferences.proxy.config.port).toBeNull();
      expect(preferences.proxy.config.auth.username).toBe('');
      expect(preferences.proxy.config.auth.password).toBe('');
      expect(preferences.proxy.config.bypassProxy).toBe('');
    });
  });

  describe('New Format (no migration needed)', () => {
    it('should handle new format with inherit: false', () => {
      const newFormatProxy = {
        proxy: {
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              username: 'user',
              password: 'pass'
            },
            bypassProxy: 'localhost'
          }
        }
      };

      mockStoreData['preferences'] = newFormatProxy;

      const preferences = getPreferences();

      // Verify key fields are preserved from stored preferences
      expect(preferences.proxy.inherit).toBe(false);
      expect(preferences.proxy.config.protocol).toBe('http');
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
      expect(preferences.proxy.config.port).toBe(8080);
      expect(preferences.proxy.config.auth.username).toBe('user');
      expect(preferences.proxy.config.auth.password).toBe('pass');
      expect(preferences.proxy.config.bypassProxy).toBe('localhost');
    });

    it('should handle new format with inherit: true', () => {
      const newFormatProxy = {
        proxy: {
          inherit: true,
          config: {
            protocol: 'http',
            hostname: '',
            port: null,
            auth: {
              username: '',
              password: ''
            },
            bypassProxy: ''
          }
        }
      };

      mockStoreData['preferences'] = newFormatProxy;

      const preferences = getPreferences();

      expect(preferences.proxy.inherit).toBe(true);
      expect(preferences.proxy.config).toBeDefined();
    });

    it('should handle new format with disabled: true', () => {
      const newFormatProxy = {
        proxy: {
          disabled: true,
          inherit: false,
          config: {
            protocol: 'http',
            hostname: '',
            port: null,
            auth: {
              username: '',
              password: ''
            },
            bypassProxy: ''
          }
        }
      };

      mockStoreData['preferences'] = newFormatProxy;

      const preferences = getPreferences();

      // disabled: true is preserved from stored preferences
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBe(false);
      expect(preferences.proxy.config).toBeDefined();
    });

    it('should handle new format with auth.disabled: true', () => {
      const newFormatProxy = {
        proxy: {
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              disabled: true,
              username: 'user',
              password: 'pass'
            },
            bypassProxy: ''
          }
        }
      };

      mockStoreData['preferences'] = newFormatProxy;

      const preferences = getPreferences();

      // auth.disabled: true is preserved from stored preferences
      expect(preferences.proxy.config.auth.disabled).toBe(true);
      expect(preferences.proxy.config.auth.username).toBe('user');
      expect(preferences.proxy.config.auth.password).toBe('pass');
    });
  });

  describe('Old Format 1: enabled (boolean)', () => {
    it('should migrate enabled: true to disabled: false, inherit: false', () => {
      const oldFormatProxy = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: true,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: 'localhost'
        }
      };

      mockStoreData['preferences'] = oldFormatProxy;

      const preferences = getPreferences();

      // After migration, inherit should be false (old enabled: true maps to inherit: false)
      expect(preferences.proxy.inherit).toBe(false);
      // Values are preserved from stored preferences
      expect(preferences.proxy.config.protocol).toBe('http');
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
      expect(preferences.proxy.config.port).toBe(8080);
      expect(preferences.proxy.config.auth.username).toBe('user');
      expect(preferences.proxy.config.auth.password).toBe('pass');
      expect(preferences.proxy.config.bypassProxy).toBe('localhost');
      expect(preferences.proxy.disabled).toBeUndefined(); // disabled: false is omitted
    });

    it('should migrate enabled: false to disabled: true, inherit: false', () => {
      const oldFormatProxy = {
        proxy: {
          enabled: false,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        }
      };

      mockStoreData['preferences'] = oldFormatProxy;

      const preferences = getPreferences();

      // After migration, enabled: false becomes disabled: true, inherit: false
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBe(false);
    });

    it('should migrate auth.enabled: false to auth.disabled: true', () => {
      const oldFormatProxy = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: false,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: ''
        }
      };

      mockStoreData['preferences'] = oldFormatProxy;

      const preferences = getPreferences();

      // auth.disabled: true is preserved from stored preferences
      expect(preferences.proxy.config.auth.disabled).toBe(true);
    });
  });

  describe('Old Format 2: mode (string)', () => {
    it('should migrate mode: "off" to disabled: true, inherit: false', () => {
      const oldFormatProxy = {
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

      mockStoreData['preferences'] = oldFormatProxy;

      const preferences = getPreferences();

      // disabled: true is preserved from migration
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBe(false);
    });

    it('should migrate mode: "on" to disabled: false, inherit: false', () => {
      const oldFormatProxy = {
        proxy: {
          mode: 'on',
          protocol: 'https',
          hostname: 'proxy.example.com',
          port: 8443,
          auth: {
            enabled: true,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: '*.local'
        }
      };

      mockStoreData['preferences'] = oldFormatProxy;

      const preferences = getPreferences();

      expect(preferences.proxy.disabled).toBeUndefined(); // disabled: false is omitted
      expect(preferences.proxy.inherit).toBe(false);
      // Values are preserved from stored preferences
      expect(preferences.proxy.config.protocol).toBe('https');
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
      expect(preferences.proxy.config.port).toBe(8443);
    });

    it('should migrate mode: "system" to disabled: false, inherit: true', () => {
      const oldFormatProxy = {
        proxy: {
          mode: 'system',
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

      mockStoreData['preferences'] = oldFormatProxy;

      const preferences = getPreferences();

      expect(preferences.proxy.disabled).toBeUndefined(); // disabled: false is omitted
      expect(preferences.proxy.inherit).toBe(true);
    });
  });
});
