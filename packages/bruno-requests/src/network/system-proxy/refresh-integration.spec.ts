/**
 * Composition tests: refreshShellEnvProxyVars + getSystemProxy wired end-to-end.
 *
 * The individual contracts are covered by:
 *   - ./get-system-proxy.spec.ts (cross-platform detection + merge)
 *   - ../../utils/shell-env-proxy-refresh.spec.ts (refresh delete/re-populate + Windows early-return)
 *
 * This file exercises only the composition: after a refresh, does the resulting proxy config
 * from getSystemProxy reflect the intended end-to-end behavior?
 */
export { }; // Mark this file as a module so top-level declarations don't collide with sibling specs.

jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('node:util', () => ({ promisify: jest.fn((fn) => fn) }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));
jest.mock('node:fs/promises', () => ({ readFile: jest.fn(), readdir: jest.fn() }));

// Config the mocked login shell would export. Reassigned per test.
// Prefix required by jest.mock's out-of-scope-variable guard (mock*/MOCK* allowed).
let mockShellEnvResult: Record<string, string> = {};

jest.mock('shell-env', () => ({
  shellEnv: () => Promise.resolve(mockShellEnvResult)
}));

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

interface FreshModules {
  execFile: jest.MockedFunction<any>;
  existsSync: jest.MockedFunction<any>;
  refresh: () => Promise<Record<string, string>>;
  getSystemProxy: () => Promise<any>;
}

/**
 * Re-require the proxy modules with a mocked node:os platform. SystemProxyResolver reads
 * os.platform() at construction, so this has to happen before requiring ./index.
 * refreshShellEnvProxyVars branches on process.platform (not os.platform), so Windows tests
 * must additionally override process.platform via Object.defineProperty.
 */
const loadForPlatform = (platform: string): FreshModules => {
  jest.resetModules();
  jest.doMock('node:os', () => ({ platform: () => platform }));

  const { execFile } = require('node:child_process');
  const { existsSync } = require('node:fs');
  const { refreshShellEnvProxyVars } = require('../../utils/shell-env');
  const { getSystemProxy } = require('./index');

  return { execFile, existsSync, refresh: refreshShellEnvProxyVars, getSystemProxy };
};

/**
 * Argument-aware execFile router. Matches on a substring of the joined command; first hit wins.
 * Keeps tests decoupled from the resolver's internal call sequencing.
 */
const routeExecFile = (
  execFile: jest.MockedFunction<any>,
  routes: Array<[string, { stdout: string; stderr?: string } | Error]>
) => {
  execFile.mockImplementation((file: string, args: string[]) => {
    const command = [file, ...args].join(' ');
    for (const [needle, response] of routes) {
      if (command.includes(needle)) {
        return response instanceof Error
          ? Promise.reject(response)
          : Promise.resolve({ stderr: '', ...response });
      }
    }
    return Promise.resolve({ stdout: '', stderr: '' });
  });
};

let originalEnv: typeof process.env;

beforeEach(() => {
  originalEnv = { ...process.env };
  mockShellEnvResult = {};
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  process.env = originalEnv;
});

describe('refresh + getSystemProxy composition', () => {
  it('macOS: stale env purged on refresh, system layer wins alone', async () => {
    // A proxy var lingering on process.env from a previous session — the user has since
    // removed the export from .zshrc, so the login shell no longer emits it.
    process.env.http_proxy = 'http://stale.usebruno.com:8080';
    mockShellEnvResult = {};

    const { execFile, refresh, getSystemProxy } = loadForPlatform('darwin');
    execFile.mockResolvedValueOnce({
      stdout: `<dictionary> {
        HTTPEnable : 1
        HTTPPort : 8080
        HTTPProxy : sys-proxy.usebruno.com
      }`,
      stderr: ''
    });

    await refresh();
    const result = await getSystemProxy();

    // Stale env value is gone, so system detection wins with no "+ environment" suffix.
    expect(result.http_proxy).toBe('http://sys-proxy.usebruno.com:8080');
    expect(result.source).toBe('macos-system');
  });

  it('macOS: profile export beats system detection after refresh', async () => {
    // .zshrc now exports HTTP_PROXY (either newly added or edited).
    mockShellEnvResult = { http_proxy: 'http://profile.usebruno.com:9090' };

    const { execFile, refresh, getSystemProxy } = loadForPlatform('darwin');
    execFile.mockResolvedValueOnce({
      stdout: `<dictionary> {
        HTTPEnable : 1
        HTTPPort : 8080
        HTTPProxy : sys-proxy.usebruno.com
      }`,
      stderr: ''
    });

    await refresh();
    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://profile.usebruno.com:9090');
    expect(result.source).toBe('macos-system + environment');
  });

  it('Linux: profile export merges with gsettings detection — env wins http, system supplies https + bypass', async () => {
    // .zshrc exports an http proxy; gsettings reports a DIFFERENT http proxy plus https + bypass
    // the profile does not set. After refresh, the env layer should win for http and combine
    // with system detection for the rest.
    mockShellEnvResult = { http_proxy: 'http://profile.usebruno.com:9090' };

    const { execFile, existsSync, refresh, getSystemProxy } = loadForPlatform('linux');
    existsSync.mockReturnValue(false); // isolate the command-based (gsettings) path
    routeExecFile(execFile, [
      ['org.gnome.system.proxy mode', { stdout: '\'manual\'' }],
      ['org.gnome.system.proxy.http host', { stdout: '\'sys-proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.http port', { stdout: '8080' }],
      ['org.gnome.system.proxy.https host', { stdout: '\'secure-proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.https port', { stdout: '8443' }],
      ['org.gnome.system.proxy ignore-hosts', { stdout: '[\'localhost\', \'127.0.0.1\']' }]
    ]);

    await refresh();
    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://profile.usebruno.com:9090'); // env wins
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443'); // from system
    expect(result.no_proxy).toBe('localhost,127.0.0.1'); // from system
    expect(result.source).toBe('linux-system + environment');
  });

  it('Linux: stale env purged on refresh, gsettings detection wins alone', async () => {
    // A proxy var lingering on process.env from a previous session — the user has since
    // removed the export from their profile, so the login shell no longer emits it.
    process.env.http_proxy = 'http://stale.usebruno.com:1234';
    mockShellEnvResult = {};

    const { execFile, existsSync, refresh, getSystemProxy } = loadForPlatform('linux');
    existsSync.mockReturnValue(false);
    routeExecFile(execFile, [
      ['org.gnome.system.proxy mode', { stdout: '\'manual\'' }],
      ['org.gnome.system.proxy.http host', { stdout: '\'sys-proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.http port', { stdout: '8080' }]
    ]);

    await refresh();
    const result = await getSystemProxy();

    // Stale env value is gone, so system detection wins with no "+ environment" suffix.
    expect(result.http_proxy).toBe('http://sys-proxy.usebruno.com:8080');
    expect(result.source).toBe('linux-system');
  });

  it('Linux (KDE): profile export merges with kreadconfig5 detection — env wins http, system supplies https + bypass', async () => {
    // gsettings is unavailable, so detection falls through to KDE (kreadconfig5). The profile
    // exports an http proxy; KDE reports a DIFFERENT http proxy plus https + bypass.
    mockShellEnvResult = { http_proxy: 'http://profile.usebruno.com:9090' };

    const { execFile, existsSync, refresh, getSystemProxy } = loadForPlatform('linux');
    existsSync.mockReturnValue(false); // isolate the command-based path
    execFile.mockImplementation((file: string, args: string[]) => {
      const fullCommand = [file, ...args].join(' ');
      if (fullCommand.includes('gsettings')) {
        return Promise.reject(new Error('gsettings not available'));
      }
      if (fullCommand.includes('kreadconfig5')) {
        // Lowercase args before matching so we are agnostic to the key casing the resolver uses.
        const lowerArgs = args.join(' ').toLowerCase();
        if (lowerArgs.includes('proxytype')) return Promise.resolve({ stdout: '1', stderr: '' });
        if (lowerArgs.includes('httpproxy')) return Promise.resolve({ stdout: 'http://sys-proxy.usebruno.com:8080', stderr: '' });
        if (lowerArgs.includes('httpsproxy')) return Promise.resolve({ stdout: 'http://secure-proxy.usebruno.com:8443', stderr: '' });
        if (lowerArgs.includes('noproxyfor')) return Promise.resolve({ stdout: 'localhost,127.0.0.1', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    await refresh();
    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://profile.usebruno.com:9090'); // env wins
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443'); // from system (KDE)
    expect(result.no_proxy).toBe('localhost,127.0.0.1'); // from system (KDE)
    expect(result.source).toBe('linux-system + environment');
  });

  it('Windows: shell profile export is ignored, registry detection wins', async () => {
    // fetchShellEnv branches on process.platform (not the mocked node:os), so we force it here.
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    try {
      // A shell profile that WOULD export a proxy — on Windows the refresh is a no-op, so it
      // must not surface. Registry detection alone should decide the result.
      mockShellEnvResult = { http_proxy: 'http://should-be-ignored.usebruno.com:9090' };

      const { execFile, refresh, getSystemProxy } = loadForPlatform('win32');
      routeExecFile(execFile, [
        ['Internet Settings', {
          stdout: `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    sys-proxy.usebruno.com:8080
`
        }]
      ]);

      await refresh();
      const result = await getSystemProxy();

      // Registry value surfaces; the ignored shell value contributes nothing, so no "+ environment".
      expect(result.http_proxy).toBe('http://sys-proxy.usebruno.com:8080');
      expect(result.source).toBe('windows-system');
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    }
  });

  it('Windows: launcher-set env survives refresh and surfaces via getSystemProxy', async () => {
    // fetchShellEnv branches on process.platform (not the mocked node:os), so we force it here.
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    try {
      // Set by a launcher script / parent shell / registry propagation — anything that reaches
      // process.env before Bruno starts. Without the Windows early-return in
      // refreshShellEnvProxyVars, this value would be stripped and never restored.
      process.env.HTTP_PROXY = 'http://launcher.usebruno.com:8080';
      // A shell profile that WOULD export a different proxy — must not surface on Windows.
      mockShellEnvResult = { http_proxy: 'http://should-be-ignored.usebruno.com:9090' };

      const { execFile, refresh, getSystemProxy } = loadForPlatform('win32');
      // System registry has no proxy, so any surviving proxy in the final result must come
      // from the env layer we preserved.
      execFile.mockImplementation(() => Promise.resolve({ stdout: '', stderr: '' }));

      await refresh();
      const result = await getSystemProxy();

      expect(result.http_proxy).toBe('http://launcher.usebruno.com:8080');
      expect(result.source).toContain('environment');
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    }
  });
});
