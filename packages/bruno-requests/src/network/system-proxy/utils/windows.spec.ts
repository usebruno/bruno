import { WindowsProxyResolver } from './windows';

// Mock the entire child_process module
jest.mock('node:child_process', () => ({
  execFile: jest.fn()
}));

// Mock the util module
jest.mock('node:util', () => ({
  promisify: jest.fn((fn) => fn)
}));

describe('WindowsProxyResolver', () => {
  let detector: WindowsProxyResolver;
  let mockExecFile: jest.MockedFunction<any>;

  beforeEach(() => {
    detector = new WindowsProxyResolver();
    const { execFile } = require('node:child_process');
    mockExecFile = execFile;
    jest.clearAllMocks();
  });

  describe('Internet Options Registry Detection', () => {
    it('should detect single proxy configuration', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });

    it('should detect protocol-specific proxy configuration', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    http=proxy.usebruno.com:8080;https=proxy.usebruno.com:8443
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8443',
        no_proxy: null,
        source: 'windows-system'
      });
    });

    it('should fallback to WinHTTP when registry fails', async () => {
      const winhttpOutput = `
Current WinHTTP proxy settings:
    Proxy Server(s) :  proxy.usebruno.com:8080
    Bypass List     :  localhost
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Registry access denied'))
        .mockResolvedValueOnce({ stdout: winhttpOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost',
        source: 'windows-system'
      });
    });
  });

  describe('WinHTTP Detection', () => {
    it('should handle direct access configuration', async () => {
      mockExecFile
        .mockRejectedValueOnce(new Error('Registry not accessible'))
        .mockResolvedValueOnce({ stdout: 'Direct access (no proxy server)', stderr: '' });

      await expect(detector.detect()).rejects.toThrow('Windows proxy detection failed');
    });

    it('should detect single proxy from WinHTTP', async () => {
      const winhttpOutput = `
Current WinHTTP proxy settings:
    Proxy Server(s) :  proxy.usebruno.com:8080
    Bypass List     :  localhost;127.0.0.1
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Registry access denied'))
        .mockResolvedValueOnce({ stdout: winhttpOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });

    it('should detect protocol-specific proxy from WinHTTP', async () => {
      const winhttpOutput = `
Current WinHTTP proxy settings:
    Proxy Server(s) :  http=proxy.usebruno.com:8080;https=proxy.usebruno.com:8443
    Bypass List     :  localhost
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Registry access denied'))
        .mockResolvedValueOnce({ stdout: winhttpOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://proxy.usebruno.com:8443',
        no_proxy: 'localhost',
        source: 'windows-system'
      });
    });

    it('should handle WinHTTP with no bypass list', async () => {
      const winhttpOutput = `
Current WinHTTP proxy settings:
    Proxy Server(s) :  proxy.usebruno.com:8080
    Bypass List     :  (none)
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Registry access denied'))
        .mockResolvedValueOnce({ stdout: winhttpOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: null,
        source: 'windows-system'
      });
    });
  });

  describe('System Proxy Environment Detection', () => {
    it('should detect system-wide proxy environment variables', async () => {
      const regOutput = `
HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    HTTP_PROXY    REG_SZ    http://proxy.usebruno.com:8080
    HTTPS_PROXY    REG_SZ    http://proxy.usebruno.com:8080
    NO_PROXY    REG_SZ    localhost,127.0.0.1
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Internet Options not accessible'))
        .mockRejectedValueOnce(new Error('WinHTTP not accessible'))
        .mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });

    it('should handle only HTTP_PROXY in system environment', async () => {
      const regOutput = `
HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    HTTP_PROXY    REG_SZ    http://proxy.usebruno.com:8080
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Internet Options not accessible'))
        .mockRejectedValueOnce(new Error('WinHTTP not accessible'))
        .mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: null,
        no_proxy: null,
        source: 'windows-system'
      });
    });
  });

  describe('User Environment Proxy Detection', () => {
    it('should detect proxy from HKCU\\Environment', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Environment
    HTTP_PROXY    REG_SZ    http://proxy.usebruno.com:8080
    HTTPS_PROXY    REG_SZ    http://proxy.usebruno.com:8080
    NO_PROXY    REG_SZ    localhost,127.0.0.1
`;

      mockExecFile
        .mockRejectedValueOnce(new Error('Internet Options not accessible'))
        .mockRejectedValueOnce(new Error('WinHTTP not accessible'))
        .mockRejectedValueOnce(new Error('System environment not accessible'))
        .mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });
  });

  describe('Edge Cases and Parsing', () => {
    it('should handle proxy server with existing http:// prefix', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    http://proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });

    it('should handle protocol-specific proxies with existing prefixes', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    http=http://proxy.usebruno.com:8080;https=https://secure-proxy.usebruno.com:8443
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'https://secure-proxy.usebruno.com:8443',
        no_proxy: null,
        source: 'windows-system'
      });
    });

    it('should handle empty proxy override', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: null,
        source: 'windows-system'
      });
    });

    it('should handle proxy disabled in registry', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x0
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      await expect(detector.detect()).rejects.toThrow('Windows proxy detection failed');
    });

    it('should handle decimal ProxyEnable value', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });

    it('should handle decimal ProxyEnable disabled', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      await expect(detector.detect()).rejects.toThrow('Windows proxy detection failed');
    });

    it('should handle malformed registry output gracefully', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1
    SomeOtherValue    REG_SZ    ignored
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1',
        source: 'windows-system'
      });
    });

    it('should handle complex bypass list', async () => {
      const regOutput = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1;*.local;192.168.1.0/24
`;

      mockExecFile.mockResolvedValueOnce({ stdout: regOutput, stderr: '' });

      const result = await detector.detect();

      expect(result).toEqual({
        http_proxy: 'http://proxy.usebruno.com:8080',
        https_proxy: 'http://proxy.usebruno.com:8080',
        no_proxy: 'localhost,127.0.0.1,*.local,192.168.1.0/24',
        source: 'windows-system'
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no proxy configuration is found', async () => {
      mockExecFile.mockRejectedValue(new Error('Command failed'));

      await expect(detector.detect()).rejects.toThrow('Windows proxy detection failed');
    });

    it('should handle registry access denied gracefully', async () => {
      mockExecFile.mockRejectedValue(new Error('Access is denied'));

      await expect(detector.detect()).rejects.toThrow('Windows proxy detection failed');
    });

    it('should handle malformed WinHTTP output', async () => {
      mockExecFile
        .mockRejectedValueOnce(new Error('Registry not accessible'))
        .mockResolvedValueOnce({ stdout: 'Malformed WinHTTP output', stderr: '' });

      await expect(detector.detect()).rejects.toThrow('Windows proxy detection failed');
    });
  });
});
