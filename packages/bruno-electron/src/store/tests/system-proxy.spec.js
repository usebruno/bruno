let mockFetchShellEnv;
let mockGetSystemProxy;

jest.mock('@usebruno/requests', () => ({
  fetchShellEnv: (...args) => mockFetchShellEnv(...args),
  getSystemProxy: (...args) => mockGetSystemProxy(...args)
}));

const PROXY_ENV_KEYS = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY', 'all_proxy', 'ALL_PROXY'];

// The shell-env refresh no-ops on win32, so tests exercising that branch are
// skipped on Windows hosts instead of faking the platform.
const itIf = (condition) => (condition ? it : it.skip);
const isWindows = process.platform === 'win32';

describe('system-proxy refresh', () => {
  let fetchSystemProxy;
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.resetModules();
    mockFetchShellEnv = jest.fn(() => Promise.resolve({}));
    mockGetSystemProxy = jest.fn(() => Promise.resolve({ source: 'environment' }));
    for (const key of PROXY_ENV_KEYS) delete process.env[key];
    ({ fetchSystemProxy } = require('../system-proxy'));
  });

  // process is shared across spec files in a worker; a leaked fake platform
  // would poison unrelated suites.
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  itIf(!isWindows)('updates proxy env vars from shell config', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    mockFetchShellEnv = jest.fn(() => Promise.resolve({ http_proxy: 'http://new-proxy:8080' }));
    ({ fetchSystemProxy } = require('../system-proxy'));

    await fetchSystemProxy({ refresh: true });

    expect(process.env.http_proxy).toBe('http://new-proxy:8080');
  });

  itIf(!isWindows)('removes proxy env vars missing from shell config (user removed the export)', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    process.env.no_proxy = 'localhost';
    mockFetchShellEnv = jest.fn(() => Promise.resolve({}));
    ({ fetchSystemProxy } = require('../system-proxy'));

    await fetchSystemProxy({ refresh: true });

    expect(process.env.http_proxy).toBeUndefined();
    expect(process.env.no_proxy).toBeUndefined();
  });

  itIf(!isWindows)('restores prior proxy vars when the shell fetch fails', async () => {
    // fetchShellEnv never rejects - it resolves null on subprocess failure (see shell-env.ts).
    process.env.http_proxy = 'http://existing:8080';
    mockFetchShellEnv = jest.fn(() => Promise.resolve(null));
    ({ fetchSystemProxy } = require('../system-proxy'));

    await fetchSystemProxy({ refresh: true });

    expect(process.env.http_proxy).toBe('http://existing:8080');
  });

  it('does not touch process.env or invoke the shell on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    process.env.HTTP_PROXY = 'http://launcher-proxy:8080';
    mockFetchShellEnv = jest.fn(() => Promise.resolve({ HTTP_PROXY: 'http://should-not-appear:8080' }));
    ({ fetchSystemProxy } = require('../system-proxy'));

    await fetchSystemProxy({ refresh: true });

    expect(mockFetchShellEnv).not.toHaveBeenCalled();
    expect(process.env.HTTP_PROXY).toBe('http://launcher-proxy:8080');
  });

  it('does not refresh shell env when refresh is not requested', async () => {
    await fetchSystemProxy();

    expect(mockFetchShellEnv).not.toHaveBeenCalled();
    expect(mockGetSystemProxy).toHaveBeenCalledTimes(1);
  });

  describe('timeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    itIf(!isWindows)('restores prior proxy vars if the shell fetch hangs past 60s', async () => {
      process.env.http_proxy = 'http://existing:8080';
      mockFetchShellEnv = jest.fn(() => new Promise(() => {})); // never resolves
      ({ fetchSystemProxy } = require('../system-proxy'));

      const p = fetchSystemProxy({ refresh: true });
      jest.advanceTimersByTime(60_000);
      await p;

      expect(process.env.http_proxy).toBe('http://existing:8080');
    });
  });
});
