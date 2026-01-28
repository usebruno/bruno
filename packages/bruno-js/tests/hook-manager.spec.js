/**
 * Unit tests for HookManager
 */
const HookManager = require('../src/hook-manager');

describe('HookManager', () => {
  let hookManager;

  beforeEach(() => {
    hookManager = new HookManager();
  });

  afterEach(() => {
    if (hookManager && !hookManager.isDisposed) {
      hookManager.dispose();
    }
  });

  describe('constructor', () => {
    it('should initialize with empty listeners', () => {
      expect(hookManager.listeners).toEqual({});
    });

    it('should initialize in active state', () => {
      expect(hookManager.state).toBe(HookManager.State.ACTIVE);
      expect(hookManager.isDisposed).toBe(false);
    });
  });

  describe('on()', () => {
    it('should register a handler for a pattern', () => {
      const handler = jest.fn();
      hookManager.on('test:event', handler);
      expect(hookManager.listeners['test:event']).toContain(handler);
    });

    it('should return an unhook function', () => {
      const handler = jest.fn();
      const unhook = hookManager.on('test:event', handler);
      expect(typeof unhook).toBe('function');
    });

    it('should register handlers for multiple patterns', () => {
      const handler = jest.fn();
      hookManager.on(['event1', 'event2'], handler);
      expect(hookManager.listeners['event1']).toContain(handler);
      expect(hookManager.listeners['event2']).toContain(handler);
    });

    it('should throw if handler is not a function', () => {
      expect(() => hookManager.on('test', 'not a function')).toThrow(TypeError);
    });

    it('should throw if pattern is not string or array', () => {
      expect(() => hookManager.on(123, jest.fn())).toThrow(TypeError);
    });

    it('should throw if same handler is registered twice', () => {
      const handler = jest.fn();
      hookManager.on('test', handler);
      expect(() => hookManager.on('test', handler)).toThrow();
    });

    it('should register wildcard handlers', () => {
      const handler = jest.fn();
      hookManager.on('*', handler);
      expect(hookManager.listeners['*']).toContain(handler);
    });

    it('should throw if HookManager is disposed', () => {
      hookManager.dispose();
      expect(() => hookManager.on('test', jest.fn())).toThrow(/disposed/);
    });
  });

  describe('unhook', () => {
    it('should remove handler when unhook is called', () => {
      const handler = jest.fn();
      const unhook = hookManager.on('test', handler);
      unhook();
      expect(hookManager.listeners['test']).not.toContain(handler);
    });

    it('should remove handler only for specified pattern', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      hookManager.on('event1', handler1);
      hookManager.on('event2', handler2);
      const unhook = hookManager.on('event3', handler1);
      unhook('event3');
      expect(hookManager.listeners['event3']).not.toContain(handler1);
      // handler1 should still be registered for event1
      expect(hookManager.listeners['event1']).toContain(handler1);
    });
  });

  describe('call()', () => {
    it('should call registered handler', async () => {
      const handler = jest.fn();
      hookManager.on('test', handler);
      await hookManager.call('test', { value: 1 });
      expect(handler).toHaveBeenCalledWith({ value: 1 });
    });

    it('should call async handlers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      hookManager.on('test', handler);
      await hookManager.call('test', { value: 1 });
      expect(handler).toHaveBeenCalled();
    });

    it('should call multiple handlers in order', async () => {
      const results = [];
      const handler1 = jest.fn(() => results.push(1));
      const handler2 = jest.fn(() => results.push(2));
      hookManager.on('test', handler1);
      hookManager.on('test', handler2);
      await hookManager.call('test', {});
      expect(results).toEqual([1, 2]);
    });

    it('should call all handlers when called with wildcard pattern', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      hookManager.on('event1', handler1);
      hookManager.on('event2', handler2);
      await hookManager.call('*', {});
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle errors without stopping execution', async () => {
      const errorHandler = jest.fn(() => { throw new Error('Test error'); });
      const normalHandler = jest.fn();
      hookManager.on('test', errorHandler);
      hookManager.on('test', normalHandler);
      await hookManager.call('test', {});
      expect(normalHandler).toHaveBeenCalled();
    });

    it('should collect errors when collectErrors is true', async () => {
      const errorHandler = jest.fn(() => { throw new Error('Test error'); });
      hookManager.on('test', errorHandler);
      const result = await hookManager.call('test', {}, { collectErrors: true });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Test error');
    });

    it('should stop on first error when stopOnError is true', async () => {
      const errorHandler = jest.fn(() => { throw new Error('Test error'); });
      const normalHandler = jest.fn();
      hookManager.on('test', errorHandler);
      hookManager.on('test', normalHandler);
      await hookManager.call('test', {}, { stopOnError: true });
      expect(normalHandler).not.toHaveBeenCalled();
    });

    it('should call onError callback for each error', async () => {
      const onError = jest.fn();
      const errorHandler = jest.fn(() => { throw new Error('Test error'); });
      hookManager.on('test', errorHandler);
      await hookManager.call('test', {}, { onError });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        event: 'test',
        message: 'Test error'
      }));
    });

    it('should warn when called on disposed instance', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      hookManager.dispose();
      await hookManager.call('test', {});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('disposed'));
      consoleSpy.mockRestore();
    });

    it('should return error result when disposed and collectErrors is true', async () => {
      hookManager.dispose();
      const result = await hookManager.call('test', {}, { collectErrors: true });
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('disposed');
    });
  });

  describe('clear()', () => {
    it('should clear handlers for a pattern', () => {
      hookManager.on('test', jest.fn());
      hookManager.clear('test');
      expect(hookManager.listeners['test']).toBeUndefined();
    });

    it('should clear handlers for multiple patterns', () => {
      hookManager.on('event1', jest.fn());
      hookManager.on('event2', jest.fn());
      hookManager.clear(['event1', 'event2']);
      expect(hookManager.listeners['event1']).toBeUndefined();
      expect(hookManager.listeners['event2']).toBeUndefined();
    });
  });

  describe('clearAll()', () => {
    it('should clear all handlers', () => {
      hookManager.on('event1', jest.fn());
      hookManager.on('event2', jest.fn());
      hookManager.clearAll();
      expect(hookManager.listeners).toEqual({});
    });
  });

  describe('dispose()', () => {
    it('should mark as disposed', () => {
      hookManager.dispose();
      expect(hookManager.isDisposed).toBe(true);
      expect(hookManager.state).toBe(HookManager.State.DISPOSED);
    });

    it('should call cleanup functions', () => {
      const cleanup = jest.fn();
      hookManager.registerCleanup(cleanup);
      hookManager.dispose();
      expect(cleanup).toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      hookManager.on('test', jest.fn());
      hookManager.dispose();
      expect(hookManager.listeners).toEqual({});
    });

    it('should be idempotent', () => {
      const cleanup = jest.fn();
      hookManager.registerCleanup(cleanup);
      hookManager.dispose();
      hookManager.dispose();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup errors gracefully', () => {
      hookManager.registerCleanup(() => { throw new Error('Cleanup error'); });
      expect(() => hookManager.dispose()).not.toThrow();
    });
  });

  describe('registerCleanup()', () => {
    it('should register cleanup function', () => {
      const cleanup = jest.fn();
      hookManager.registerCleanup(cleanup);
      hookManager.dispose();
      expect(cleanup).toHaveBeenCalled();
    });

    it('should ignore non-function arguments', () => {
      expect(() => hookManager.registerCleanup('not a function')).not.toThrow();
    });
  });
});
