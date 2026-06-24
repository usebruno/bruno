import { initializeShellEnv, refreshShellEnvProxyVars } from './shell-env';
import path from 'path';

let mockShellEnvResult: Record<string, string> = {};

jest.mock('shell-env', () => ({
  shellEnv: () => Promise.resolve(mockShellEnvResult)
}));

const originalPlatform = process.platform;

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform });
});

describe('initializeShellEnv', () => {
  test('should add shell env vars that are not in process.env', async () => {
    delete process.env.TEST_SHELL_VAR;
    mockShellEnvResult = { TEST_SHELL_VAR: 'from_shell_config' };

    await initializeShellEnv();

    expect(process.env.TEST_SHELL_VAR).toBe('from_shell_config');
    delete process.env.TEST_SHELL_VAR;
  });

  test('should not overwrite existing process.env values', async () => {
    process.env.http_proxy = 'updated_value';
    mockShellEnvResult = { http_proxy: 'config_file_value' };

    await initializeShellEnv();

    expect(process.env.http_proxy).toBe('updated_value');
    delete process.env.http_proxy;
  });

  test('should prepend shell PATH to existing process.env.PATH', async () => {
    const shellNodeBin = path.join('fixtures', 'shell-env', 'node-bin');
    const systemBin = path.join('fixtures', 'shell-env', 'system-bin');
    const otherBin = path.join('fixtures', 'shell-env', 'other-bin');
    process.env.PATH = [systemBin, otherBin].join(path.delimiter);
    mockShellEnvResult = { PATH: shellNodeBin };

    await initializeShellEnv();

    expect(process.env.PATH).toBe(
      [shellNodeBin, systemBin, otherBin].join(path.delimiter)
    );
    delete process.env.PATH;
  });

  test('should set PATH from shell when not in process.env', async () => {
    const shellBin = path.join('fixtures', 'shell-env', 'shell-bin');
    delete process.env.PATH;
    mockShellEnvResult = { PATH: shellBin };

    await initializeShellEnv();

    expect(process.env.PATH).toBe(shellBin);
    delete process.env.PATH;
  });

  test('should preserve multiple existing env vars while adding new ones', async () => {
    process.env.EXISTING_VAR = 'existing';
    delete process.env.NEW_VAR;
    mockShellEnvResult = { EXISTING_VAR: 'overwritten', NEW_VAR: 'new_value' };

    await initializeShellEnv();

    expect(process.env.EXISTING_VAR).toBe('existing');
    expect(process.env.NEW_VAR).toBe('new_value');
    delete process.env.EXISTING_VAR;
    delete process.env.NEW_VAR;
  });

  test('should return the shell env vars (not the merged result)', async () => {
    mockShellEnvResult = { SOME_VAR: 'value' };

    const result = await initializeShellEnv();

    expect(result).toEqual({ SOME_VAR: 'value' });
    delete process.env.SOME_VAR;
  });

  test('should return empty object on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    mockShellEnvResult = { SHOULD_NOT_APPEAR: 'value' };

    const result = await initializeShellEnv();

    expect(result).toEqual({});
    expect(process.env.SHOULD_NOT_APPEAR).toBeUndefined();
  });
});

describe('refreshShellEnvProxyVars', () => {
  afterEach(() => {
    // Lowercase proxy vars
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.no_proxy;
    delete process.env.all_proxy;

    // Uppercase proxy vars
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.ALL_PROXY;
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

  test('should remove proxy env vars missing from shell config', async () => {
    process.env.http_proxy = 'http://old-proxy:8080';
    process.env.no_proxy = 'localhost';
    mockShellEnvResult = {};

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBeUndefined();
    expect(process.env.no_proxy).toBeUndefined();
  });

  test('should not keep stale process.env proxy vars after shell config is cleared', async () => {
    process.env.http_proxy = 'http://stale-proxy:8080';
    process.env.https_proxy = 'http://stale-proxy:8443';
    mockShellEnvResult = {};

    await refreshShellEnvProxyVars();

    expect(process.env.http_proxy).toBeUndefined();
    expect(process.env.https_proxy).toBeUndefined();
  });
});
