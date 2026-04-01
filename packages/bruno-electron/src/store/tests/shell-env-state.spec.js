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
  });
});
