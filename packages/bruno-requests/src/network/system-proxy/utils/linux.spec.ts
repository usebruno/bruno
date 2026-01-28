import { LinuxProxyResolver } from './linux';

// Mock the entire child_process module
jest.mock('node:child_process', () => ({
  execFile: jest.fn()
}));

// Mock the fs/promises module
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn()
}));

// Mock the fs module
jest.mock('node:fs', () => ({
  existsSync: jest.fn()
}));

// Mock the util module
jest.mock('node:util', () => ({
  promisify: jest.fn((fn) => fn)
}));

describe('LinuxProxyResolver', () => {
  let detector: LinuxProxyResolver;
  let mockExecFile: jest.MockedFunction<any>;
  let mockReadFile: jest.MockedFunction<any>;
  let mockExistsSync: jest.MockedFunction<any>;

  beforeEach(() => {
    detector = new LinuxProxyResolver();
    const { execFile } = require('node:child_process');
    const { readFile } = require('node:fs/promises');
    const { existsSync } = require('node:fs');
    mockExecFile = execFile;
    mockReadFile = readFile;
    mockExistsSync = existsSync;
    jest.clearAllMocks();
  });

  describe('gsettings proxy detection', () => {
    it('should detect manual proxy configuration', async () => {
      const modeOutput = '\'manual\'';
      const httpHostOutput = '\'proxy.usebruno.com\'';
      const httpPortOutput = '8080';
      const httpsHostOutput = '\'secure-proxy.usebruno.com\'';
      const httpsPortOutput = '8443';
      const ignoreHostsOutput = '[\'localhost\', \'127.0.0.1\']';

      mockExecFile
        .mockResolvedValueOnce({ stdout: modeOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpHostOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpPortOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpsHostOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpsPortOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: ignoreHostsOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://secure-proxy.usebruno.com:8443',
        no_proxy: 'localhost,127.0.0.1',
        source: 'linux-system'
      });
    });

    it('should detect identical HTTP and HTTPS proxies', async () => {
      const modeOutput = '\'manual\'';
      const httpHostOutput = '\'proxy.usebruno.com\'';
      const httpPortOutput = '8080';
      const httpsHostOutput = '\'proxy.usebruno.com\'';
      const httpsPortOutput = '8080';
      const ignoreHostsOutput = '[]';

      mockExecFile
        .mockResolvedValueOnce({ stdout: modeOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpHostOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpPortOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpsHostOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpsPortOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: ignoreHostsOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8080',
        no_proxy: null,
        source: 'linux-system'
      });
    });

    it('should handle non-manual proxy mode', async () => {
      const modeOutput = '\'auto\'';

      mockExecFile.mockResolvedValueOnce({ stdout: modeOutput, stderr: '' });

      await expect(detector.detect()).rejects.toThrow('Linux proxy detection failed');
    });

    it('should handle empty ignore hosts list', async () => {
      const modeOutput = '\'manual\'';
      const httpHostOutput = '\'proxy.usebruno.com\'';
      const httpPortOutput = '8080';
      const httpsHostOutput = '\'\'';
      const httpsPortOutput = '';
      const ignoreHostsOutput = '[]';

      mockExecFile
        .mockResolvedValueOnce({ stdout: modeOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpHostOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpPortOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpsHostOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: httpsPortOutput, stderr: '' })
        .mockResolvedValueOnce({ stdout: ignoreHostsOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: null,
        no_proxy: null,
        source: 'linux-system'
      });
    });
  });

  describe('/etc/environment proxy detection', () => {
    it('should detect proxy from /etc/environment', async () => {
      // Mock gsettings to fail
      mockExecFile.mockImplementation(() => {
        throw new Error('gsettings not available');
      });

      // Mock /etc/environment file
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFile.mockResolvedValueOnce(`
http_proxy=http://proxy.usebruno.com:8080
https_proxy=http://proxy.usebruno.com:8080
no_proxy=localhost,127.0.0.1
`);

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'linux-system'
      });
    });
  });

  describe('systemd proxy detection', () => {
    it('should detect proxy from systemd configuration', async () => {
      mockExecFile.mockImplementation(() => {
        throw new Error('gsettings not available');
      });

      // Mock all previous methods to fail
      mockExistsSync.mockReturnValue(false);

      // Mock systemd conf directory to exist
      mockExistsSync.mockReturnValueOnce(true);

      // Mock systemd proxy file to exist
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFile.mockResolvedValueOnce(`
http_proxy=http://proxy.usebruno.com:8080
https_proxy=http://proxy.usebruno.com:8080
no_proxy=localhost,127.0.0.1
`);

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'linux-system'
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when gsettings is not available', async () => {
      const error = new Error('gsettings: command not found');

      mockExecFile.mockImplementation(() => {
        throw error;
      });

      // Mock all file-based methods to fail
      mockExistsSync.mockReturnValue(false);

      await expect(detector.detect()).rejects.toThrow('Linux proxy detection failed');
    });

    it('should throw error when gsettings schema is not installed', async () => {
      const error = new Error('No such schema');

      mockExecFile.mockImplementation(() => {
        throw error;
      });

      // Mock all file-based methods to fail
      mockExistsSync.mockReturnValue(false);

      await expect(detector.detect()).rejects.toThrow('Linux proxy detection failed');
    });

    it('should throw error when no proxy configuration is found', async () => {
      mockExecFile.mockImplementation(() => {
        throw new Error('gsettings not available');
      });

      // Mock all file-based methods to fail
      mockExistsSync.mockReturnValue(false);

      await expect(detector.detect()).rejects.toThrow('Linux proxy detection failed');
    });
  });
});
