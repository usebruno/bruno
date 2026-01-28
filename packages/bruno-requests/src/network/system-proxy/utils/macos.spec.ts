import { MacOSProxyResolver } from './macos';

// Mock the entire child_process module
jest.mock('node:child_process', () => ({
  execFile: jest.fn()
}));

// Mock the util module
jest.mock('node:util', () => ({
  promisify: jest.fn((fn) => fn)
}));

describe('MacOSProxyResolver', () => {
  let detector: MacOSProxyResolver;
  let mockExecFile: jest.MockedFunction<any>;

  beforeEach(() => {
    detector = new MacOSProxyResolver();
    const { execFile } = require('node:child_process');
    mockExecFile = execFile;
    jest.clearAllMocks();
  });

  describe('scutil proxy detection', () => {
    it('should detect HTTP and HTTPS proxy settings', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSPort : 8443
  HTTPSProxy : secure-proxy.usebruno.com
  ExceptionsList : <array> {
    0 : localhost
    1 : 127.0.0.1
  }
  ExcludeSimpleHostnames : 1
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://secure-proxy.usebruno.com:8443',
        no_proxy: 'localhost,127.0.0.1,<local>',
        source: 'macos-system'
      });
    });

    it('should handle disabled proxy settings', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 0
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 0
  HTTPSProxy : proxy.usebruno.com
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: null,
        https_proxy: null,
        no_proxy: null,
        source: 'macos-system'
      });
    });

    it('should use default ports when not specified', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSProxy : secure-proxy.usebruno.com
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result.http_proxy).toBe('http://proxy.usebruno.com:80');
      expect(result.https_proxy).toBe('https://secure-proxy.usebruno.com:443');
    });

    it('should handle only HTTP proxy enabled', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 0
  HTTPSProxy : secure-proxy.usebruno.com
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: null,
        no_proxy: null,
        source: 'macos-system'
      });
    });

    it('should handle only HTTPS proxy enabled', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 0
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSPort : 8443
  HTTPSProxy : secure-proxy.usebruno.com
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: null,
        https_proxy: 'https://secure-proxy.usebruno.com:8443',
        no_proxy: null,
        source: 'macos-system'
      });
    });

    it('should handle empty exceptions list', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSPort : 8080
  HTTPSProxy : proxy.usebruno.com
  ExceptionsList : <array> {
  }
  ExcludeSimpleHostnames : 0
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8080',
        no_proxy: null,
        source: 'macos-system'
      });
    });

    it('should handle ExcludeSimpleHostnames without exceptions', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSPort : 8080
  HTTPSProxy : proxy.usebruno.com
  ExcludeSimpleHostnames : 1
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8080',
        no_proxy: '<local>',
        source: 'macos-system'
      });
    });

    it('should handle complex exceptions list', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSPort : 8080
  HTTPSProxy : proxy.usebruno.com
  ExceptionsList : <array> {
    0 : localhost
    1 : 127.0.0.1
    2 : *.local
    3 : 192.168.1.0/24
  }
  ExcludeSimpleHostnames : 1
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1,*.local,192.168.1.0/24,<local>',
        source: 'macos-system'
      });
    });

    it('should handle malformed scutil output gracefully', async () => {
      const scutilOutput = `<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : proxy.usebruno.com
  HTTPSEnable : 1
  HTTPSPort : 8080
  HTTPSProxy proxy.usebruno.com
}`;

      mockExecFile.mockResolvedValueOnce({ stdout: scutilOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: null,
        no_proxy: null,
        source: 'macos-system'
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when scutil command fails', async () => {
      mockExecFile.mockRejectedValueOnce(new Error('scutil command not found'));

      await expect(detector.detect()).rejects.toThrow('macOS proxy detection failed');
    });

    it('should throw error for invalid scutil output', async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: 'Invalid output format', stderr: '' });

      await expect(detector.detect()).rejects.toThrow('macOS proxy detection failed');
    });
  });
});
