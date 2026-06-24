/**
 * Regression tests for refreshShellEnvProxyVars.
 *
 * shell-env spawns a login shell (`$SHELL -i -c 'export -p'`) that INHERITS the parent
 * process.env. So any proxy var still set on process.env when the shell is spawned would be
 * inherited and re-exported — meaning a proxy the user removed from their profile would never
 * go away. refreshShellEnvProxyVars guards against this by deleting all proxy vars BEFORE
 * invoking the shell on POSIX platforms, and by early-returning on Windows (where fetchShellEnv
 * is a no-op and the delete would strip values with nothing to restore them).
 *
 * The mock for shell-env models login-shell parent-env inheritance and captures a snapshot of
 * process.env at invocation time, so tests can assert delete-before-fetch ordering directly.
 */
import { refreshShellEnvProxyVars, PROXY_ENV_KEYS } from './shell-env';

let mockShellEnvResult: Record<string, string> = {};

// When set, the mocked shellEnv() rejects with this error. Lets us verify graceful degradation.
let mockShellEnvThrows: Error | null = null;

// Snapshot of the proxy vars present in process.env when shellEnv() was invoked. Lets tests
// assert that refreshShellEnvProxyVars deleted stale vars BEFORE spawning the shell.
// Prefix required by jest.mock's out-of-scope-variable guard (mock*/MOCK* allowed).
let mockProxyVarsSeenByShell: Record<string, string> = {};

jest.mock('shell-env', () => ({
  shellEnv: () => {
    const PROXY_KEYS = [
      'http_proxy',
      'HTTP_PROXY',
      'https_proxy',
      'HTTPS_PROXY',
      'no_proxy',
      'NO_PROXY',
      'all_proxy',
      'ALL_PROXY'
    ];

    // Capture what the subprocess would inherit from Bruno's process.env at spawn time.
    mockProxyVarsSeenByShell = {};
    for (const key of PROXY_KEYS) {
      if (process.env[key] !== undefined) {
        mockProxyVarsSeenByShell[key] = process.env[key] as string;
      }
    }

    if (mockShellEnvThrows) {
      return Promise.reject(mockShellEnvThrows);
    }

    // Model a login shell: inherits from parent, then applies whatever the profile exports.
    return Promise.resolve({ ...mockProxyVarsSeenByShell, ...mockShellEnvResult });
  }
}));

describe('refreshShellEnvProxyVars — shell inheritance (POSIX)', () => {
  beforeEach(() => {
    mockProxyVarsSeenByShell = {};
    mockShellEnvResult = {};
    mockShellEnvThrows = null;
    for (const key of PROXY_ENV_KEYS) {
      delete process.env[key];
    }
  });

  test('updates proxy env vars from shell config', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    mockShellEnvResult = {
      http_proxy: 'http://new-proxy:8080',
      https_proxy: 'http://new-proxy:8443'
    };

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBe('http://new-proxy:8080');
    expect(process.env.https_proxy).toBe('http://new-proxy:8443');
  });

  test('removes proxy env vars missing from shell config', async () => {
    // Stale vars lingering from a previous session.
    process.env.http_proxy = 'http://old-proxy:8080';
    process.env.no_proxy = 'localhost';
    // User removed the exports from their profile -> shell config no longer has them.
    mockShellEnvResult = {};

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBeUndefined();
    expect(process.env.no_proxy).toBeUndefined();
  });

  test('treats an empty-string proxy value as removal', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    mockShellEnvResult = { http_proxy: '' };

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBeUndefined();
  });

  test('leaves non-proxy env vars untouched', async () => {
    process.env.NON_PROXY_VAR = 'keep-me';
    mockShellEnvResult = { http_proxy: 'http://new-proxy:8080' };

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBe('http://new-proxy:8080');
    expect(process.env.NON_PROXY_VAR).toBe('keep-me');

    delete process.env.NON_PROXY_VAR;
  });

  test('handles uppercase proxy variants (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, ALL_PROXY)', async () => {
    process.env.HTTP_PROXY = 'http://old-upper:8080';
    process.env.ALL_PROXY = 'http://old-all:1080';
    mockShellEnvResult = {
      HTTP_PROXY: 'http://new-upper:8080',
      HTTPS_PROXY: 'http://new-upper:8443',
      NO_PROXY: 'localhost,127.0.0.1',
      ALL_PROXY: 'http://new-all:1080'
    };

    await refreshShellEnvProxyVars();

    expect(process.env.HTTP_PROXY).toBe('http://new-upper:8080');
    expect(process.env.HTTPS_PROXY).toBe('http://new-upper:8443');
    expect(process.env.NO_PROXY).toBe('localhost,127.0.0.1');
    expect(process.env.ALL_PROXY).toBe('http://new-all:1080');
  });

  test('restores prior proxy vars when the shell-env subprocess fails', async () => {
    process.env.http_proxy = 'http://existing:8080';
    mockShellEnvThrows = new Error('shell subprocess failed');

    // On subprocess failure we return {} but restore the snapshot taken before the
    // delete, so the user is not left silently unproxied.
    await expect(refreshShellEnvProxyVars()).resolves.toEqual({});
    expect(process.env.http_proxy).toBe('http://existing:8080');
  });

  test('returns the raw shell env dict, including non-proxy keys', async () => {
    mockShellEnvResult = {
      http_proxy: 'http://p:8080',
      PATH: '/foo:/bar',
      EDITOR: 'vim'
    };

    const result = await refreshShellEnvProxyVars();

    expect(result).toEqual({
      http_proxy: 'http://p:8080',
      PATH: '/foo:/bar',
      EDITOR: 'vim'
    });
  });
});

describe('refreshShellEnvProxyVars — Windows', () => {
  const originalPlatform = process.platform;

  beforeAll(() => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  beforeEach(() => {
    mockProxyVarsSeenByShell = {};
    mockShellEnvResult = {};
    mockShellEnvThrows = null;
    for (const key of PROXY_ENV_KEYS) {
      delete process.env[key];
    }
  });

  test('leaves process.env proxy vars untouched (registry / launcher / parent-shell values survive)', async () => {
    // A proxy in process.env from any Windows source: registry propagation, launcher script,
    // PowerShell $env, Git Bash export, etc. All look the same to us.
    process.env.HTTP_PROXY = 'http://launcher-proxy:8080';
    process.env.https_proxy = 'http://another:9090';

    await refreshShellEnvProxyVars();

    expect(process.env.HTTP_PROXY).toBe('http://launcher-proxy:8080');
    expect(process.env.https_proxy).toBe('http://another:9090');
  });

  test('does not invoke the shell subprocess on Windows', async () => {
    // A shell profile that would export a proxy if it were consulted — it must not be.
    mockShellEnvResult = { http_proxy: 'http://should-not-appear:8080' };

    await refreshShellEnvProxyVars();

    // mockProxyVarsSeenByShell is only populated when the shell-env mock is actually called.
    // Empty means we never invoked shellEnv() — the Windows early-return short-circuited.
    expect(mockProxyVarsSeenByShell).toEqual({});
    expect(process.env.http_proxy).toBeUndefined();
  });
});
