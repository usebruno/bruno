let mockInitialize;

jest.mock('@usebruno/requests', () => ({
  initializeShellEnv: (...args) => mockInitialize(...args)
}));

describe('shell env', () => {
  let shellEnv;
  const originalFlag = process.env.BRU_NO_SHELL_ENV;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.BRU_NO_SHELL_ENV;
    mockInitialize = jest.fn().mockResolvedValue({});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    shellEnv = require('../../src/utils/shell-env');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFlag === undefined) {
      delete process.env.BRU_NO_SHELL_ENV;
    } else {
      process.env.BRU_NO_SHELL_ENV = originalFlag;
    }
  });

  it('resolves once the environment has been applied', async () => {
    await expect(shellEnv.ensureShellEnv()).resolves.toBeUndefined();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('spawns the login shell only once, however often it is asked', async () => {
    await shellEnv.ensureShellEnv();
    await shellEnv.ensureShellEnv();
    await shellEnv.ensureShellEnv();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('skips the login shell when BRU_NO_SHELL_ENV is set', async () => {
    process.env.BRU_NO_SHELL_ENV = '1';
    await shellEnv.ensureShellEnv();

    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it.each(['0', 'false', ''])('treats BRU_NO_SHELL_ENV=%p as not opting out', async (value) => {
    process.env.BRU_NO_SHELL_ENV = value;
    await shellEnv.ensureShellEnv();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('warns and continues when the shell cannot be read', async () => {
    mockInitialize = jest.fn().mockRejectedValue(new Error('no shell for you'));

    await expect(shellEnv.ensureShellEnv()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('no shell for you'));
  });

  it('gives up rather than hanging when the shell never returns', async () => {
    jest.useFakeTimers();
    mockInitialize = jest.fn().mockReturnValue(new Promise(() => {}));

    const pending = shellEnv.ensureShellEnv();
    jest.advanceTimersByTime(shellEnv.TIMEOUT_MS);

    await expect(pending).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    jest.useRealTimers();
  });
});
