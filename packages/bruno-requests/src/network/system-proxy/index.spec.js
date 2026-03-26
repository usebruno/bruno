const { getSystemProxy, SystemProxyResolver } = require('./index');
const os = require('node:os');

// Mock dependencies
jest.mock('node:os');
jest.mock('./utils/windows');
jest.mock('./utils/macos');
jest.mock('./utils/linux');

describe('SystemProxyResolver Integration', () => {
  let detector;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    detector = new SystemProxyResolver();
    originalEnv = { ...process.env };

    // Clear environment variables
    delete process.env.http_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.no_proxy;
    delete process.env.NO_PROXY;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.runOnlyPendingTimers();
    // Clear any pending timers to prevent Jest open handles
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Environment Variables', () => {
    it('should prioritize lowercase over uppercase variables', () => {
      process.env.http_proxy = 'http://proxy.usebruno.com:8080';
      process.env.HTTP_PROXY = 'http://proxy.usebruno.com:8081';
      process.env.https_proxy = 'https://proxy.usebruno.com:8082';
      process.env.HTTPS_PROXY = 'https://proxy.usebruno.com:8083';

      const result = detector.getEnvironmentVariables();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8082',
        no_proxy: null,
        source: 'environment'
      });
    });

    it('should fall back to uppercase when lowercase is not set', () => {
      process.env.HTTP_PROXY = 'http://proxy.usebruno.com:8081';
      process.env.NO_PROXY = 'localhost,127.0.0.1';

      const result = detector.getEnvironmentVariables();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8081',
        https_proxy: null,
        no_proxy: 'localhost,127.0.0.1',
        source: 'environment'
      });
    });

    it('should return null values when no environment variables are set', () => {
      const result = detector.getEnvironmentVariables();

      expect(result).toEqual({
        http_proxy: null,
        https_proxy: null,
        no_proxy: null,
        source: 'environment'
      });
    });
  });

  describe('Platform Routing', () => {
    it('should route to Windows detector on win32', async () => {
      // Create a new detector instance after mocking the platform
      os.platform.mockReturnValue('win32');
      const testResolver = new SystemProxyResolver();
      const { WindowsProxyResolver } = require('./utils/windows');
      const mockDetect = jest.fn().mockResolvedValue({ source: 'windows-system' });
      WindowsProxyResolver.mockImplementation(() => ({ detect: mockDetect }));

      await testResolver.getSystemProxy();
      expect(mockDetect).toHaveBeenCalled();
    });

    it('should route to macOS detector on darwin', async () => {
      // Create a new detector instance after mocking the platform
      os.platform.mockReturnValue('darwin');
      const testResolver = new SystemProxyResolver();
      const { MacOSProxyResolver } = require('./utils/macos');
      const mockDetect = jest.fn().mockResolvedValue({ source: 'macos-system' });
      MacOSProxyResolver.mockImplementation(() => ({ detect: mockDetect }));

      await testResolver.getSystemProxy();
      expect(mockDetect).toHaveBeenCalled();
    });

    it('should route to Linux detector on linux', async () => {
      // Create a new detector instance after mocking the platform
      os.platform.mockReturnValue('linux');
      const testResolver = new SystemProxyResolver();
      const { LinuxProxyResolver } = require('./utils/linux');
      const mockDetect = jest.fn().mockResolvedValue({ source: 'linux-system' });
      LinuxProxyResolver.mockImplementation(() => ({ detect: mockDetect }));

      await testResolver.getSystemProxy();
      expect(mockDetect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when platform detection fails', async () => {
      os.platform.mockReturnValue('win32');
      const testResolver = new SystemProxyResolver();
      const { WindowsProxyResolver } = require('./utils/windows');
      WindowsProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockRejectedValue(new Error('Detection failed'))
      }));

      await expect(testResolver.getSystemProxy()).rejects.toThrow('Detection failed');
    });

    it('should throw error on timeout', async () => {
      os.platform.mockReturnValue('win32');
      const testResolver = new SystemProxyResolver({ commandTimeoutMs: 100 });
      const { WindowsProxyResolver } = require('./utils/windows');

      // Mock a detector that throws a timeout error
      WindowsProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockRejectedValue(new Error('System proxy detection timeout'))
      }));

      await expect(testResolver.getSystemProxy()).rejects.toThrow('System proxy detection timeout');
    });

    it('should throw error for unsupported platform', async () => {
      os.platform.mockReturnValue('freebsd');
      const testResolver = new SystemProxyResolver();

      await expect(testResolver.getSystemProxy()).rejects.toThrow('Unsupported platform: freebsd');
    });
  });

  describe('getSystemProxy function', () => {
    beforeEach(() => {
      // Reset modules to ensure fresh imports for each test
      jest.resetModules();
    });

    it('should merge environment variables with system proxy', async () => {
      // Mock os.platform before requiring the module
      jest.doMock('node:os', () => ({
        platform: jest.fn().mockReturnValue('win32')
      }));

      const { WindowsProxyResolver } = require('./utils/windows');
      WindowsProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockResolvedValue({
          http_proxy: 'http://system-proxy.usebruno.com:8080',
          https_proxy: 'https://system-proxy.usebruno.com:8443',
          no_proxy: 'localhost',
          source: 'windows-system'
        })
      }));

      process.env.http_proxy = 'http://env-proxy.usebruno.com:9090';

      // Require the module after mocking
      const { getSystemProxy: getSystemProxyFresh } = require('./index');
      const result = await getSystemProxyFresh();

      // Environment variables take priority
      expect(result).toEqual({
        http_proxy: 'http://env-proxy.usebruno.com:9090',
        https_proxy: 'https://system-proxy.usebruno.com:8443',
        no_proxy: 'localhost',
        source: 'windows-system + environment'
      });
    });

    it('should return only system proxy when no environment variables are set', async () => {
      // Mock os.platform before requiring the module
      jest.doMock('node:os', () => ({
        platform: jest.fn().mockReturnValue('darwin')
      }));

      const { MacOSProxyResolver } = require('./utils/macos');
      MacOSProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockResolvedValue({
          http_proxy: 'http://system-proxy.usebruno.com:8080',
          https_proxy: 'https://system-proxy.usebruno.com:8443',
          no_proxy: 'localhost',
          source: 'macos-system'
        })
      }));

      // Require the module after mocking
      const { getSystemProxy: getSystemProxyFresh } = require('./index');
      const result = await getSystemProxyFresh();

      expect(result).toEqual({
        http_proxy: 'http://system-proxy.usebruno.com:8080',
        https_proxy: 'https://system-proxy.usebruno.com:8443',
        no_proxy: 'localhost',
        source: 'macos-system'
      });
    });

    it('should fallback to environment variables when system detection fails', async () => {
      // Mock os.platform before requiring the module
      jest.doMock('node:os', () => ({
        platform: jest.fn().mockReturnValue('linux')
      }));

      const { LinuxProxyResolver } = require('./utils/linux');
      LinuxProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockRejectedValue(new Error('Detection failed'))
      }));

      process.env.http_proxy = 'http://proxy.usebruno.com:8080';
      process.env.https_proxy = 'https://proxy.usebruno.com:8443';

      // Require the module after mocking
      const { getSystemProxy: getSystemProxyFresh } = require('./index');
      const result = await getSystemProxyFresh();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8443',
        no_proxy: null,
        source: 'environment'
      });
    });

    it('should return null values when no proxy is configured', async () => {
      // Mock os.platform before requiring the module
      jest.doMock('node:os', () => ({
        platform: jest.fn().mockReturnValue('darwin')
      }));

      const { MacOSProxyResolver } = require('./utils/macos');
      MacOSProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockResolvedValue({
          http_proxy: null,
          https_proxy: null,
          no_proxy: null,
          source: 'macos-system'
        })
      }));

      // Require the module after mocking
      const { getSystemProxy: getSystemProxyFresh } = require('./index');
      const result = await getSystemProxyFresh();

      expect(result).toEqual({
        http_proxy: null,
        https_proxy: null,
        no_proxy: null,
        source: 'macos-system'
      });
    });
  });
});
