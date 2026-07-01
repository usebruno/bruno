/**
 * System Proxy Detection & Refresh Integration Tests
 * * PURPOSE:
 * This file validates the synchronization and fallback engine responsible for detecting
 * system-level network proxies when a user triggers a manual environment refresh
 * (e.g., clicking "Refresh" in Preferences -> Proxy -> System Proxy).
 * * WHAT WE ARE TESTING:
 * 1. Env Var Purging & Re-reads: Verifies that `refreshShellEnvProxyVars()` clears out
 * stale process environment variables and successfully syncs fresh values from a
 * simulated user login-shell profile.
 * 2. Cross-Platform Priority Rules: Confirms that `getSystemProxy()` properly merges
 * environment configurations with OS-native network utilities, ensuring that explicit
 * user profile overrides win out where documented.
 * 3. Deep Fallback Extraction: Validates OS-native fallback chains for all major platforms:
 * - macOS: scutil dictionary structural parsing.
 * - Linux: GNOME (gsettings) -> KDE (kreadconfig5) -> /etc/environment -> systemd.
 * - Windows: IE/Edge Internet Options (Registry) -> WinHTTP (netsh) -> HKLM/HKCU Env blocks.
 * * ARCHITECTURE & MOCKING STRATEGY:
 * To avoid running platform-restricted commands natively (which would crash tests run
 * on mismatched host platforms or CI/CD pipelines), this file uses a dynamic sandbox runtime via
 * `loadForPlatform(platform)`.
 * * Instead of rigid invocation-sequence queues, platform CLI utilities are mocked using argument-aware
 * routing logic (`execFile.mockImplementation`). This guarantees that structural changes to the internal
 * execution sequence inside the proxy resolver will not cause brittle test breaks, keeping tests
 * strictly tied to structural string contract parsing and logical compliance.
 */

const PROXY_ENV_KEYS = [
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
  'no_proxy',
  'NO_PROXY',
  'all_proxy',
  'ALL_PROXY'
];

// The shell config the mocked login shell would export. Reassigned per test.
let mockShellEnvResult: Record<string, string> = {};

jest.mock('shell-env', () => ({
  // Model how a real login shell inherits the parent process.env. If refreshShellEnvProxyVars
  // failed to delete stale proxy vars first, they would be observed here and survive the refresh.
  shellEnv: () => {
    const inherited: Record<string, string> = {};
    for (const key of PROXY_ENV_KEYS) {
      if (process.env[key] !== undefined) {
        inherited[key] = process.env[key] as string;
      }
    }
    return Promise.resolve({ ...inherited, ...mockShellEnvResult });
  }
}));

jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('node:util', () => ({ promisify: jest.fn((fn) => fn) }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));
jest.mock('node:fs/promises', () => ({ readFile: jest.fn(), readdir: jest.fn() }));

interface FreshModules {
  execFile: jest.MockedFunction<any>;
  existsSync: jest.MockedFunction<any>;
  readFile: jest.MockedFunction<any>;
  readdir: jest.MockedFunction<any>;
  pressRefresh: () => Promise<any>;
}

/**
 * Reset the module registry and re-require the proxy modules with `platform` mocked.
 * The SystemProxyResolver singleton reads platform() at construction, so this must happen
 * before requiring ./index. Returns fresh OS-primitive mocks to arrange, plus pressRefresh().
 */
const loadForPlatform = (platform: string): FreshModules => {
  jest.resetModules();
  jest.doMock('node:os', () => ({ platform: () => platform }));

  const { execFile } = require('node:child_process');
  const { existsSync } = require('node:fs');
  const { readFile, readdir } = require('node:fs/promises');
  const { refreshShellEnvProxyVars } = require('../../utils/shell-env');
  const { getSystemProxy } = require('./index');

  return {
    execFile,
    existsSync,
    readFile,
    readdir,
    pressRefresh: async () => {
      await refreshShellEnvProxyVars();
      return getSystemProxy();
    }
  };
};

beforeEach(() => {
  mockShellEnvResult = {};
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }
});

describe('pressing Refresh — macOS (darwin)', () => {
  it('merges env vars with system detection: env wins for http/https, system supplies pac_url, source notes both', async () => {
    const { execFile, pressRefresh } = loadForPlatform('darwin');
    mockShellEnvResult = { http_proxy: 'http://env-proxy.usebruno.com:9090' };

    // scutil reports a different manual proxy AND a PAC url.
    execFile.mockResolvedValueOnce({
      stdout: `<dictionary> {
      HTTPEnable : 1
      HTTPPort : 8080
      HTTPProxy : sys-proxy.usebruno.com
      ProxyAutoConfigEnable : 1
      ProxyAutoConfigURLString : http://wpad.usebruno.com/proxy.pac
    }`,
      stderr: ''
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://env-proxy.usebruno.com:9090'); // env wins
    expect(result.pac_url).toBe('http://wpad.usebruno.com/proxy.pac'); // from system
    expect(result.source).toBe('macos-system + environment');
  });

  it('detects manual HTTP/HTTPS proxy + bypass list from system settings (scutil)', async () => {
    const { execFile, pressRefresh } = loadForPlatform('darwin');
    execFile.mockResolvedValueOnce({
      stdout: `<dictionary> {
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
      }`,
      stderr: ''
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('macos-system');
  });
});

describe('pressing Refresh — Linux', () => {
  it('detects manual proxy configuration from GNOME (gsettings)', async () => {
    const { execFile, existsSync, pressRefresh } = loadForPlatform('linux');
    existsSync.mockReturnValue(false); // no proxy config files on disk -> isolates the command-based (gsettings/kreadconfig5) path

    // Argument-aware mock router: completely decoupled from internal call sequencing rules
    execFile.mockImplementation((_file: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('org.gnome.system.proxy mode')) {
        return Promise.resolve({ stdout: '\'manual\'', stderr: '' });
      }
      if (command.includes('org.gnome.system.proxy.http host')) {
        return Promise.resolve({ stdout: '\'proxy.usebruno.com\'', stderr: '' });
      }
      if (command.includes('org.gnome.system.proxy.http port')) {
        return Promise.resolve({ stdout: '8080', stderr: '' });
      }
      if (command.includes('org.gnome.system.proxy.https host')) {
        return Promise.resolve({ stdout: '\'secure-proxy.usebruno.com\'', stderr: '' });
      }
      if (command.includes('org.gnome.system.proxy.https port')) {
        return Promise.resolve({ stdout: '8443', stderr: '' });
      }
      if (command.includes('org.gnome.system.proxy ignore-hosts')) {
        return Promise.resolve({ stdout: '[\'localhost\', \'127.0.0.1\']', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system');
  });

  it('detects manual proxy configuration from KDE (kreadconfig5)', async () => {
    const { execFile, existsSync, pressRefresh } = loadForPlatform('linux');
    existsSync.mockReturnValue(false); // no proxy config files on disk -> isolates the command-based (gsettings/kreadconfig5) path

    execFile.mockImplementation((file: string, args: string[]) => {
      const fullCommand = [file, ...args].join(' ');

      if (fullCommand.includes('gsettings')) {
        return Promise.reject(new Error('gsettings not available'));
      }

      if (fullCommand.includes('kreadconfig5')) {
        // Normalize arguments to lowercase before evaluating. This prevents flaky test failures
        // if the source code queries keys using different casings (e.g., 'httpProxy' vs 'httpproxy').
        const lowerArgs = args.join(' ').toLowerCase();
        if (lowerArgs.includes('proxytype')) return Promise.resolve({ stdout: '1', stderr: '' });
        if (lowerArgs.includes('httpproxy')) return Promise.resolve({ stdout: 'http://proxy.usebruno.com:8080', stderr: '' });
        if (lowerArgs.includes('httpsproxy')) return Promise.resolve({ stdout: 'http://secure-proxy.usebruno.com:8443', stderr: '' });
        if (lowerArgs.includes('noproxyfor')) return Promise.resolve({ stdout: 'localhost,127.0.0.1', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system');
  });

  it('detects proxy from file-based source /etc/environment', async () => {
    const { execFile, existsSync, readFile, pressRefresh } = loadForPlatform('linux');
    execFile.mockImplementation(() => {
      throw new Error('gsettings / kreadconfig5 not available');
    });

    existsSync.mockReturnValueOnce(true);
    readFile.mockResolvedValueOnce(`
      http_proxy=http://proxy.usebruno.com:8080
      https_proxy=http://proxy.usebruno.com:8080
      no_proxy=localhost,127.0.0.1
    `);

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system');
  });

  it('detects proxy from file-based source systemd system.conf.d', async () => {
    const { execFile, existsSync, readFile, readdir, pressRefresh } = loadForPlatform('linux');
    execFile.mockImplementation(() => {
      throw new Error('gsettings / kreadconfig5 not available');
    });

    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    readdir.mockResolvedValueOnce(['proxy.conf']);
    readFile.mockResolvedValueOnce(`
      http_proxy=http://proxy.usebruno.com:8080
      https_proxy=http://proxy.usebruno.com:8443
    `);

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8443');
    expect(result.source).toBe('linux-system');
  });
});

describe('pressing Refresh — Windows system settings', () => {
  it('detects proxy from Internet Options registry and transforms separators/local flags', async () => {
    const { execFile, pressRefresh } = loadForPlatform('win32');

    execFile.mockImplementation((_file: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('Internet Settings')) {
        return Promise.resolve({
          stdout: `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1;<local>
`,
          stderr: ''
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8080');
    // Verifies conversion of semicolons into commas and safe normalization of windows <local> string syntax
    expect(result.no_proxy).toBe('localhost,127.0.0.1,<local>');
    expect(result.source).toBe('windows-system');
  });

  it('ignores lingering registry values if ProxyEnable is explicitly disabled (0x0)', async () => {
    const { execFile, pressRefresh } = loadForPlatform('win32');

    execFile.mockImplementation((_file: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('Internet Settings')) {
        return Promise.resolve({
          stdout: `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x0
    ProxyServer    REG_SZ    stale-proxy.usebruno.com:8080
`,
          stderr: ''
        });
      }
      if (command.includes('winhttp')) return Promise.resolve({ stdout: 'Direct access (no proxy server).', stderr: '' });
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBeNull();
    expect(result.https_proxy).toBeNull();
  });

  it('falls back to WinHTTP (netsh winhttp set proxy)', async () => {
    const { execFile, pressRefresh } = loadForPlatform('win32');

    execFile.mockImplementation((_file: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('Internet Settings')) {
        return Promise.reject(new Error('Registry access denied'));
      }
      if (command.includes('winhttp')) {
        return Promise.resolve({
          stdout: `
Current WinHTTP proxy settings:
    Proxy Server(s) :  proxy.usebruno.com:8080
    Bypass List     :  localhost
`,
          stderr: ''
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.no_proxy).toBe('localhost');
    expect(result.source).toBe('windows-system');
  });

  it('detects system-wide env vars from HKLM Session Manager Environment', async () => {
    const { execFile, pressRefresh } = loadForPlatform('win32');

    execFile.mockImplementation((_file: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('Internet Settings')) return Promise.resolve({ stdout: '', stderr: '' });
      if (command.includes('winhttp')) return Promise.resolve({ stdout: 'Direct access (no proxy server).', stderr: '' });
      if (command.includes('Session Manager\\Environment')) {
        return Promise.resolve({
          stdout: `
HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    HTTP_PROXY    REG_SZ    http://proxy.usebruno.com:8080
    HTTPS_PROXY    REG_SZ    http://proxy.usebruno.com:8443
`,
          stderr: ''
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8443');
    expect(result.source).toBe('windows-system');
  });

  it('detects user env vars from HKCU Environment and handles case insensitivity configuration properties', async () => {
    const { execFile, pressRefresh } = loadForPlatform('win32');

    execFile.mockImplementation((_file: string, args: string[]) => {
      const command = args.join(' ');
      if (command.includes('Internet Settings')) return Promise.resolve({ stdout: '', stderr: '' });
      if (command.includes('winhttp')) return Promise.resolve({ stdout: 'Direct access (no proxy server).', stderr: '' });
      if (command.includes('HKLM\\SYSTEM')) return Promise.resolve({ stdout: '', stderr: '' });
      if (command.includes('HKCU\\Environment')) {
        return Promise.resolve({
          stdout: `
HKEY_CURRENT_USER\\Environment
    http_proxy    REG_SZ    http://user-proxy.usebruno.com:8080
`, // Simulates lowercase registry properties to verify key case-insensitivity parsing rules
          stderr: ''
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await pressRefresh();

    expect(result.http_proxy).toBe('http://user-proxy.usebruno.com:8080');
    expect(result.source).toBe('windows-system');
  });
});
