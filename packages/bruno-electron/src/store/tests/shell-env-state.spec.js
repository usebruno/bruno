let mockInitialize;

jest.mock('@usebruno/requests', () => ({
  initializeShellEnv: (...args) => mockInitialize(...args)
}));

describe('shell-env-state', () => {
  let initializeShellEnv, waitForShellEnv;

  beforeEach(() => {
    jest.resetModules();
    mockInitialize = jest.fn(() => Promise.resolve());
    ({ initializeShellEnv, waitForShellEnv } = require('../shell-env-state'));
  });

  describe('initializeShellEnv', () => {
    it('calls the underlying initializer exactly once on first call', () => {
      initializeShellEnv();
      initializeShellEnv();
      initializeShellEnv();
      initializeShellEnv();
      initializeShellEnv();
      initializeShellEnv();
      initializeShellEnv();
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('returns undefined (fire-and-forget)', () => {
      const result = initializeShellEnv();
      expect(result).toBeUndefined();
    });
  });

  describe('waitForShellEnv', () => {
    it('returns a promise', () => {
      const result = waitForShellEnv();
      expect(result).toBeInstanceOf(Promise);
    });

    it('resolves when the underlying promise resolves', async () => {
      mockInitialize = jest.fn(() => Promise.resolve('shell-ready'));
      ({ waitForShellEnv } = require('../shell-env-state'));

      await expect(waitForShellEnv()).resolves.toBe('shell-ready');
    });

    it('returns the same promise on repeated calls', () => {
      const p1 = waitForShellEnv();
      const p2 = waitForShellEnv();
      expect(p1).toBe(p2);
    });

    it('does not reinitialize if initializeShellEnv was already called', () => {
      initializeShellEnv();
      waitForShellEnv();
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('propagates rejection from the underlying initializer', async () => {
      const err = new Error('shell init failed');
      mockInitialize = jest.fn(() => Promise.reject(err));
      ({ waitForShellEnv } = require('../shell-env-state'));

      await expect(waitForShellEnv()).rejects.toThrow('shell init failed');
    });

    describe('timeout', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('rejects after 60 seconds', async () => {
        mockInitialize = jest.fn(() => new Promise(() => {})); // never resolves
        ({ waitForShellEnv } = require('../shell-env-state'));

        const p = waitForShellEnv();
        jest.advanceTimersByTime(60_000);

        await expect(p).rejects.toThrow('Shell environment initialization timed out');
      });

      it('resets the promise after timeout so next call retries', async () => {
        mockInitialize = jest.fn(() => new Promise(() => {}));
        ({ initializeShellEnv, waitForShellEnv } = require('../shell-env-state'));

        const p = waitForShellEnv();
        jest.advanceTimersByTime(60_000);
        await expect(p).rejects.toThrow('timed out');

        // After timeout _promise is null — next call should reinitialize
        mockInitialize = jest.fn(() => Promise.resolve('retry-ok'));
        const p2 = waitForShellEnv();
        await expect(p2).resolves.toBe('retry-ok');
        expect(mockInitialize).toHaveBeenCalledTimes(1);
      });

      it('does not time out if the initializer resolves in time', async () => {
        mockInitialize = jest.fn(() => Promise.resolve('fast'));
        ({ waitForShellEnv } = require('../shell-env-state'));

        const p = waitForShellEnv();
        jest.advanceTimersByTime(59_999);

        await expect(p).resolves.toBe('fast');
      });
    });
  });
});
