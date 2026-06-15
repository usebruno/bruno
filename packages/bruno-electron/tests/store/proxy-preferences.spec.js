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
    mockStoreData = {};
  });

  describe('Default Proxy Settings', () => {
    it('should default to source: inherit for new users (empty preferences)', () => {
      mockStoreData['preferences'] = {};

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('inherit');
      expect(preferences.proxy.disabled).toBeUndefined();
      expect(preferences.proxy.inherit).toBeUndefined();
      expect(preferences.proxy.config).toBeDefined();
      expect(preferences.proxy.config.protocol).toBe('http');
      expect(preferences.proxy.config.hostname).toBe('');
      expect(preferences.proxy.config.port).toBeNull();
    });

    it('should default to source: manual, disabled: true for existing users without proxy settings', () => {
      mockStoreData['preferences'] = {
        request: { sslVerification: true },
        font: { codeFont: 'default', codeFontSize: 13 }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBeUndefined();
      expect(preferences.proxy.config.protocol).toBe('http');
      expect(preferences.proxy.config.hostname).toBe('');
      expect(preferences.proxy.config.port).toBeNull();
      expect(preferences.proxy.config.auth.username).toBe('');
      expect(preferences.proxy.config.auth.password).toBe('');
      expect(preferences.proxy.config.bypassProxy).toBe('');
    });
  });

  describe('v3 Format (no migration needed)', () => {
    it('should handle source: manual', () => {
      mockStoreData['preferences'] = {
        proxy: {
          source: 'manual',
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: { username: 'user', password: 'pass' },
            bypassProxy: 'localhost'
          }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.inherit).toBeUndefined();
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
      expect(preferences.proxy.config.port).toBe(8080);
    });

    it('should handle source: inherit', () => {
      mockStoreData['preferences'] = {
        proxy: {
          source: 'inherit',
          config: { protocol: 'http', hostname: '', port: null, auth: { username: '', password: '' }, bypassProxy: '' }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('inherit');
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should handle source: pac', () => {
      mockStoreData['preferences'] = {
        proxy: {
          source: 'pac',
          pac: { source: 'http://internal/proxy.pac' },
          config: { protocol: 'http', hostname: '', port: null, auth: { username: '', password: '' }, bypassProxy: '' }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('pac');
      expect(preferences.proxy.pac.source).toBe('http://internal/proxy.pac');
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should handle disabled: true with source: manual', () => {
      mockStoreData['preferences'] = {
        proxy: {
          disabled: true,
          source: 'manual',
          config: { protocol: 'http', hostname: '', port: null, auth: { username: '', password: '' }, bypassProxy: '' }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should handle auth.disabled: true', () => {
      mockStoreData['preferences'] = {
        proxy: {
          source: 'manual',
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: { disabled: true, username: 'user', password: 'pass' },
            bypassProxy: ''
          }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.config.auth.disabled).toBe(true);
      expect(preferences.proxy.config.auth.username).toBe('user');
    });
  });

  describe('v2 → v3 Migration (inherit boolean → source string)', () => {
    it('should migrate inherit: true → source: system', () => {
      mockStoreData['preferences'] = {
        proxy: {
          inherit: true,
          config: { protocol: 'http', hostname: '', port: null, auth: { username: '', password: '' }, bypassProxy: '' }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('inherit');
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should migrate inherit: false (no source) → source: manual', () => {
      mockStoreData['preferences'] = {
        proxy: {
          inherit: false,
          config: { protocol: 'http', hostname: 'proxy.example.com', port: 8080, auth: { username: 'user', password: 'pass' }, bypassProxy: '' }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.inherit).toBeUndefined();
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
    });

    it('should migrate inherit: false, source: pac → source: pac (preserved)', () => {
      mockStoreData['preferences'] = {
        proxy: {
          inherit: false,
          source: 'pac',
          pac: { source: 'http://internal/proxy.pac' },
          config: { protocol: 'http', hostname: '', port: null, auth: { username: '', password: '' }, bypassProxy: '' }
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('pac');
      expect(preferences.proxy.pac.source).toBe('http://internal/proxy.pac');
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should save migrated v2 → v3 back to disk', () => {
      mockStoreData['preferences'] = {
        proxy: {
          inherit: true,
          config: { protocol: 'http', hostname: '', port: null, auth: { username: '', password: '' }, bypassProxy: '' }
        }
      };

      getPreferences();

      expect(mockStoreData['preferences'].proxy.inherit).toBeUndefined();
      expect(mockStoreData['preferences'].proxy.source).toBe('inherit');
    });
  });

  describe('v1 → v3 Migration (enabled boolean)', () => {
    it('should migrate enabled: true → source: manual', () => {
      mockStoreData['preferences'] = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: { enabled: true, username: 'user', password: 'pass' },
          bypassProxy: 'localhost'
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.disabled).toBeUndefined();
      expect(preferences.proxy.inherit).toBeUndefined();
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
      expect(preferences.proxy.config.port).toBe(8080);
    });

    it('should migrate enabled: false → source: manual, disabled: true', () => {
      mockStoreData['preferences'] = {
        proxy: {
          enabled: false,
          protocol: 'http',
          hostname: '',
          port: null,
          auth: { enabled: false, username: '', password: '' },
          bypassProxy: ''
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should migrate auth.enabled: false → auth.disabled: true', () => {
      mockStoreData['preferences'] = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: { enabled: false, username: 'user', password: 'pass' },
          bypassProxy: ''
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.config.auth.disabled).toBe(true);
      expect(preferences.proxy.config.auth.username).toBe('user');
    });

    it('should save migrated v1 → v3 back to disk', () => {
      mockStoreData['preferences'] = {
        proxy: {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: { enabled: true, username: 'user', password: 'pass' },
          bypassProxy: ''
        }
      };

      getPreferences();

      expect(mockStoreData['preferences'].proxy.enabled).toBeUndefined();
      expect(mockStoreData['preferences'].proxy.source).toBe('manual');
    });
  });

  describe('v1 → v3 Migration (mode string)', () => {
    it('should migrate mode: off → source: manual, disabled: true', () => {
      mockStoreData['preferences'] = {
        proxy: {
          mode: 'off',
          protocol: 'http',
          hostname: '',
          port: null,
          auth: { enabled: false, username: '', password: '' },
          bypassProxy: ''
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.disabled).toBe(true);
      expect(preferences.proxy.inherit).toBeUndefined();
    });

    it('should migrate mode: on → source: manual', () => {
      mockStoreData['preferences'] = {
        proxy: {
          mode: 'on',
          protocol: 'https',
          hostname: 'proxy.example.com',
          port: 8443,
          auth: { enabled: true, username: 'user', password: 'pass' },
          bypassProxy: '*.local'
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('manual');
      expect(preferences.proxy.disabled).toBeUndefined();
      expect(preferences.proxy.inherit).toBeUndefined();
      expect(preferences.proxy.config.protocol).toBe('https');
      expect(preferences.proxy.config.hostname).toBe('proxy.example.com');
      expect(preferences.proxy.config.port).toBe(8443);
    });

    it('should migrate mode: system → source: inherit', () => {
      mockStoreData['preferences'] = {
        proxy: {
          mode: 'system',
          protocol: 'http',
          hostname: '',
          port: null,
          auth: { enabled: false, username: '', password: '' },
          bypassProxy: ''
        }
      };

      const preferences = getPreferences();

      expect(preferences.proxy.source).toBe('inherit');
      expect(preferences.proxy.disabled).toBeUndefined();
      expect(preferences.proxy.inherit).toBeUndefined();
    });
  });
});
