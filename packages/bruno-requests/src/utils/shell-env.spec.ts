import path from 'path';
import { initializeShellEnv } from './shell-env';

let mockShellEnvResult: Record<string, string> = {};

jest.mock('shell-env', () => ({
  shellEnv: () => Promise.resolve(mockShellEnvResult)
}));

const originalPlatform = process.platform;

// initializeShellEnv no-ops on win32, so the unix-branch tests below are
// skipped on Windows hosts instead of faking the platform.
const itIf = (condition: boolean) => (condition ? it : it.skip);
const isWindows = process.platform === 'win32';

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
});

describe('initializeShellEnv', () => {
  itIf(!isWindows)('should add shell env vars that are not in process.env', async () => {
    delete process.env.TEST_SHELL_VAR;
    mockShellEnvResult = { TEST_SHELL_VAR: 'from_shell_config' };

    await initializeShellEnv();

    expect(process.env.TEST_SHELL_VAR).toBe('from_shell_config');
    delete process.env.TEST_SHELL_VAR;
  });

  itIf(!isWindows)('should not overwrite existing process.env values', async () => {
    process.env.http_proxy = 'updated_value';
    mockShellEnvResult = { http_proxy: 'config_file_value' };

    await initializeShellEnv();

    expect(process.env.http_proxy).toBe('updated_value');
    delete process.env.http_proxy;
  });

  itIf(!isWindows)('should prepend shell PATH to existing process.env.PATH', async () => {
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

  itIf(!isWindows)('should set PATH from shell when not in process.env', async () => {
    const shellBin = path.join('fixtures', 'shell-env', 'shell-bin');
    delete process.env.PATH;
    mockShellEnvResult = { PATH: shellBin };

    await initializeShellEnv();

    expect(process.env.PATH).toBe(shellBin);
    delete process.env.PATH;
  });

  itIf(!isWindows)('should preserve multiple existing env vars while adding new ones', async () => {
    process.env.EXISTING_VAR = 'existing';
    delete process.env.NEW_VAR;
    mockShellEnvResult = { EXISTING_VAR: 'overwritten', NEW_VAR: 'new_value' };

    await initializeShellEnv();

    expect(process.env.EXISTING_VAR).toBe('existing');
    expect(process.env.NEW_VAR).toBe('new_value');
    delete process.env.EXISTING_VAR;
    delete process.env.NEW_VAR;
  });

  itIf(!isWindows)('should return the shell env vars (not the merged result)', async () => {
    mockShellEnvResult = { SOME_VAR: 'value' };

    const result = await initializeShellEnv();

    expect(result).toEqual({ SOME_VAR: 'value' });
    delete process.env.SOME_VAR;
  });

  test('should return empty object on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    mockShellEnvResult = { SHOULD_NOT_APPEAR: 'value' };

    const result = await initializeShellEnv();

    expect(result).toEqual({});
    expect(process.env.SHOULD_NOT_APPEAR).toBeUndefined();
  });
});
