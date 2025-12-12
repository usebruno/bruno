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

  describe('Error Handling and Fallbacks', () => {
    beforeEach(() => {
      process.env.http_proxy = 'http://proxy.usebruno.com:8080';
    });

    it('should fallback to environment variables when platform detection fails', async () => {
      os.platform.mockReturnValue('win32');
      const testResolver = new SystemProxyResolver();
      const { WindowsProxyResolver } = require('./utils/windows');
      WindowsProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockRejectedValue(new Error('Detection failed'))
      }));

      const result = await testResolver.getSystemProxy();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: null,
        no_proxy: null,
        source: 'environment'
      });
    });

    it('should handle timeout gracefully', async () => {
      os.platform.mockReturnValue('win32');
      const testResolver = new SystemProxyResolver({ commandTimeout: 100 });
      const { WindowsProxyResolver } = require('./utils/windows');

      // Mock a detector that throws a timeout error
      WindowsProxyResolver.mockImplementation(() => ({
        detect: jest.fn().mockRejectedValue(new Error('System proxy detection timeout'))
      }));

      const result = await testResolver.getSystemProxy();
      expect(result.source).toBe('environment');
    });
  });

  describe('getSystemProxy function', () => {
    it('should return proxy configuration from environment variables', async () => {
      process.env.http_proxy = 'http://proxy.usebruno.com:8080';

      const result = await getSystemProxy();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: null,
        no_proxy: null,
        source: 'environment'
      });
    });
  });
});
