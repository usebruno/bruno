const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');

describe('measureReduxDispatch', () => {
  let originalMemoryDescriptor;
  let invoke;

  beforeEach(() => {
    originalMemoryDescriptor = Object.getOwnPropertyDescriptor(performance, 'memory');
    global.__BRUNO_BENCHMARK__ = false;
    delete window.ipcRenderer;
    jest.resetModules();
  });

  afterEach(() => {
    global.__BRUNO_BENCHMARK__ = false;
    delete window.ipcRenderer;

    if (originalMemoryDescriptor) {
      Object.defineProperty(performance, 'memory', originalMemoryDescriptor);
    } else {
      delete performance.memory;
    }

    jest.resetModules();
  });

  describe('when enabled', () => {
    beforeEach(() => {
      global.__BRUNO_BENCHMARK__ = true;
      invoke = jest.fn().mockResolvedValue(undefined);
      window.ipcRenderer = { invoke };
      jest.resetModules();
    });

    it('emits redux-dispatch events with heap delta', async () => {
      let heap = 1000;
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        get: () => ({ usedJSHeapSize: heap })
      });

      const { measureReduxDispatch, flushEvents } = require('./benchmark');

      const result = measureReduxDispatch('tabs/addTab', () => {
        heap = 1500;
        return 42;
      });

      expect(result).toBe(42);
      await flushEvents();

      expect(invoke).toHaveBeenCalledWith(
        'benchmark:flush-events',
        [
          expect.objectContaining({
            v: 1,
            type: 'redux-dispatch',
            process: 'renderer',
            actionType: 'tabs/addTab',
            memory: expect.objectContaining({
              before: expect.objectContaining({ heapUsed: 1000 }),
              after: expect.objectContaining({ heapUsed: 1500 }),
              delta: 500
            })
          })
        ]
      );
    });

    it('still records when the measured function throws', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        get: () => ({ usedJSHeapSize: 2000 })
      });

      const { measureReduxDispatch, flushEvents } = require('./benchmark');

      expect(() =>
        measureReduxDispatch('tabs/addTab', () => {
          throw new Error('boom');
        })
      ).toThrow('boom');

      await flushEvents();

      expect(invoke).toHaveBeenCalledWith(
        'benchmark:flush-events',
        [expect.objectContaining({ type: 'redux-dispatch', actionType: 'tabs/addTab' })]
      );
    });
  });

  it('is a passthrough when benchmarking is disabled', () => {
    const { measureReduxDispatch } = require('./benchmark');
    const run = jest.fn(() => 'ok');

    expect(measureReduxDispatch('tabs/addTab', run)).toBe('ok');
    expect(run).toHaveBeenCalled();
  });
});
