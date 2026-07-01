/**
 * Regression tests for refreshShellEnvProxyVars' delete-before-fetch behavior.
 *
 * shell-env spawns a login shell (`$SHELL -i -c 'export -p'`) that INHERITS the parent
 * process.env. So any proxy var still set on process.env when the shell is spawned would be
 * inherited and re-exported — meaning a proxy the user removed from their profile would never
 * go away. refreshShellEnvProxyVars guards against this by deleting all proxy vars BEFORE
 * invoking the shell.
 *
 * Unlike shell-env.spec.ts (which mocks shell-env as a fixed value), this file mocks shell-env
 * to model that inheritance, so the tests actually fail if the delete-before-fetch loop is removed.
 */
import { refreshShellEnvProxyVars, PROXY_ENV_KEYS } from './shell-env';

// The shell config the mocked login shell would export. Reassigned per test.
let mockShellEnvResult: Record<string, string> = {};

// Snapshot of the proxy vars present in process.env when shellEnv() was invoked. Lets tests
// assert that refreshShellEnvProxyVars deleted stale vars BEFORE spawning the shell.
let proxyVarsSeenByShell: Record<string, string> = {};

jest.mock('shell-env', () => ({
  // Model how a real login shell inherits the parent process.env. If refreshShellEnvProxyVars
  // does not delete stale proxy vars first, they resurface here and persist.
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
    const inherited: Record<string, string> = {};
    for (const key of PROXY_KEYS) {
      if (process.env[key] !== undefined) {
        inherited[key] = process.env[key] as string;
      }
    }
    return Promise.resolve({ ...inherited, ...mockShellEnvResult });
  }
}));

describe('refreshShellEnvProxyVars — shell inheritance', () => {
  beforeEach(() => {
    proxyVarsSeenByShell = {};
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

  test('should update proxy env vars from shell config', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    mockShellEnvResult = {
      http_proxy: 'http://new-proxy:8080',
      https_proxy: 'http://new-proxy:8443'
    };

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBe('http://new-proxy:8080');
    expect(process.env.https_proxy).toBe('http://new-proxy:8443');
  });

  test('should remove proxy env vars missing from shell config by deleting them before invoking the shell', async () => {
    // Stale proxy vars lingering from a previous session.
    process.env.http_proxy = 'http://old-proxy:8080';
    process.env.no_proxy = 'localhost';
    // User removed the exports from their profile -> shell config no longer has them.
    mockShellEnvResult = {};

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBeUndefined();
    expect(process.env.no_proxy).toBeUndefined();
  });

  test('should treat an empty-string proxy value as removal', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    // shell config exports the var but with an empty value.
    mockShellEnvResult = { http_proxy: '' };

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBeUndefined();
  });

  test('should leave non-proxy env vars untouched', async () => {
    // A non-proxy var already present on process.env (e.g. set elsewhere at startup).
    process.env.NON_PROXY_VAR = 'keep-me';
    mockShellEnvResult = { http_proxy: 'http://new-proxy:8080' };

    await refreshShellEnvProxyVars();

    // Only proxy vars are deleted/refetched, so the unrelated var survives unchanged.
    expect(process.env.http_proxy).toBe('http://new-proxy:8080');
    expect(process.env.NON_PROXY_VAR).toBe('keep-me');

    delete process.env.NON_PROXY_VAR;
  });
});
