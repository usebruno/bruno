let mockFetch;
let mockApply;

jest.mock('@usebruno/requests', () => ({
  fetchShellEnv: (...args) => mockFetch(...args),
  applyShellEnv: (...args) => mockApply(...args)
}));

describe('shell env', () => {
  let shellEnv;
  const originalFlag = process.env.BRU_NO_SHELL_ENV;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.BRU_NO_SHELL_ENV;
    mockFetch = jest.fn().mockResolvedValue({ SHELL_VAR: 'from_shell' });
    mockApply = jest.fn();
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
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith({ SHELL_VAR: 'from_shell' });
  });

  it('spawns the login shell only once, however often it is asked', async () => {
    await shellEnv.ensureShellEnv();
    await shellEnv.ensureShellEnv();
    await shellEnv.ensureShellEnv();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips the login shell when BRU_NO_SHELL_ENV is set', async () => {
    process.env.BRU_NO_SHELL_ENV = '1';
    await shellEnv.ensureShellEnv();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each(['0', 'false', ''])('treats BRU_NO_SHELL_ENV=%p as not opting out', async (value) => {
    process.env.BRU_NO_SHELL_ENV = value;
    await shellEnv.ensureShellEnv();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('warns and continues when the shell cannot be read', async () => {
    mockFetch = jest.fn().mockRejectedValue(new Error('no shell for you'));

    await expect(shellEnv.ensureShellEnv()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('no shell for you'));
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('warns rather than silently continuing when the shell reports no environment', async () => {
    // fetchShellEnv swallows its own errors and resolves null, so this is what a failed read looks like.
    mockFetch = jest.fn().mockResolvedValue(null);

    await expect(shellEnv.ensureShellEnv()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('could not read the shell environment'));
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('gives up rather than waiting indefinitely when the shell never returns', async () => {
    jest.useFakeTimers();
    mockFetch = jest.fn().mockReturnValue(new Promise(() => {}));

    const pending = shellEnv.ensureShellEnv();
    jest.advanceTimersByTime(shellEnv.TIMEOUT_MS);

    await expect(pending).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    expect(mockApply).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('does not apply an environment that arrives after the timeout', async () => {
    jest.useFakeTimers();
    let resolveShell;
    mockFetch = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveShell = resolve;
      })
    );

    const pending = shellEnv.ensureShellEnv();
    jest.advanceTimersByTime(shellEnv.TIMEOUT_MS);
    await pending;

    // The shell finally answers, long after the command stopped waiting for it.
    resolveShell({ PATH: '/late/bin', LATE_VAR: 'late' });
    await Promise.resolve();

    expect(mockApply).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
