let mockBrunoConfig = {};
let mockPreferences = {};

jest.mock('node:fs');
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

jest.mock('@usebruno/requests', () => ({
  getCACertificates: jest.fn(() => ({
    caCertificates: [],
    caCertificatesCount: 0
  }))
}));

jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    shouldVerifyTls: jest.fn(() => true),
    shouldUseCustomCaCertificate: jest.fn(() => false),
    getCustomCaCertificateFilePath: jest.fn(() => null),
    shouldKeepDefaultCaCertificates: jest.fn(() => true),
    getGlobalProxyConfig: jest.fn(() => mockPreferences.proxy || false)
  }
}));

jest.mock('../../src/store/bruno-config', () => ({
  getBrunoConfig: jest.fn(() => mockBrunoConfig)
}));

jest.mock('../../src/ipc/network/interpolate-string', () => ({
  interpolateString: jest.fn((str) => str)
}));

const { getCertsAndProxyConfig } = require('../../src/ipc/network/cert-utils');

describe('getCertsAndProxyConfig - proxy configuration logic', () => {
  const defaultRequestParams = {
    collectionUid: 'test-collection',
    request: { url: 'https://echo.usebruno.com' },
    envVars: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/test/path'
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockBrunoConfig = {};
    mockPreferences = {};
    jest.clearAllMocks();
  });

  describe('collection proxy: false (explicitly disabled)', () => {
    test('should return proxyMode: "off" when collection proxy is false', async () => {
      mockBrunoConfig = { proxy: false };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('collection proxy object (override app-level)', () => {
    test('should return proxyMode: "on" with collection proxy config', async () => {
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

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(proxyConfig);
    });

    test('should handle proxy object with auth enabled', async () => {
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

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(proxyConfig);
    });
  });

  describe('collection proxy: "inherit" (use app-level)', () => {
    test('should inherit global proxy when collection proxy is "inherit" and global is false', async () => {
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: false };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should inherit global proxy when collection proxy is "inherit" and global is "system"', async () => {
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: 'system' };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('should inherit global proxy object when collection proxy is "inherit"', async () => {
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

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(globalProxyConfig);
    });

    test('should default to inherit when no collection proxy is specified', async () => {
      mockBrunoConfig = {}; // No proxy config
      mockPreferences = { proxy: false };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('legacy collection proxy format with enabled flag', () => {
    test('should return proxyMode: "on" when legacy enabled: true', async () => {
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
      mockBrunoConfig = { proxy: legacyProxyConfig };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(legacyProxyConfig);
    });

    test('should inherit global proxy when legacy enabled: "global"', async () => {
      const legacyProxyConfig = {
        enabled: 'global',
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockBrunoConfig = { proxy: legacyProxyConfig };
      mockPreferences = { proxy: 'system' };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('should return proxyMode: "off" for other legacy enabled values', async () => {
      const legacyProxyConfig = {
        enabled: false,
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockBrunoConfig = { proxy: legacyProxyConfig };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('global proxy configuration scenarios', () => {
    test('should handle global proxy: false', async () => {
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: false };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle global proxy: "system"', async () => {
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: 'system' };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle global proxy object', async () => {
      const globalProxyConfig = {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: globalProxyConfig };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(globalProxyConfig);
    });

    test('should handle legacy global proxy with mode: "on"', async () => {
      const legacyGlobalProxy = {
        mode: 'on',
        protocol: 'https',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: legacyGlobalProxy };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(legacyGlobalProxy);
    });

    test('should handle legacy global proxy with mode: "system"', async () => {
      const legacyGlobalProxy = {
        mode: 'system',
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: legacyGlobalProxy };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      // Legacy objects are treated as regular proxy objects first
      expect(result.proxyMode).toBe('on');
      expect(result.proxyConfig).toEqual(legacyGlobalProxy);
    });

    test('should handle legacy global proxy with mode: "off"', async () => {
      const legacyGlobalProxy = {
        mode: 'off',
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 8090
      };
      mockBrunoConfig = { proxy: 'inherit' };
      mockPreferences = { proxy: legacyGlobalProxy };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });
  });

  describe('edge cases', () => {
    test('should handle null collection proxy as inherit', async () => {
      mockBrunoConfig = { proxy: null };
      mockPreferences = { proxy: false };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('off');
      expect(result.proxyConfig).toEqual({});
    });

    test('should handle undefined collection proxy as inherit', async () => {
      mockBrunoConfig = { proxy: undefined };
      mockPreferences = { proxy: 'system' };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.proxyMode).toBe('system');
      expect(result.proxyConfig).toEqual({});
    });

    test('should return httpsAgentRequestFields and interpolationOptions', async () => {
      mockBrunoConfig = { proxy: false };

      const result = await getCertsAndProxyConfig(defaultRequestParams);

      expect(result.httpsAgentRequestFields).toBeDefined();
      expect(result.httpsAgentRequestFields.keepAlive).toBe(true);
      expect(result.interpolationOptions).toBeDefined();
      expect(result.interpolationOptions.envVars).toEqual({});
    });
  });
});
