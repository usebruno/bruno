const { describe, it, expect, jest, beforeEach } = require('@jest/globals');

const measureReduxDispatch = jest.fn((_actionType, run) => run());

jest.mock('utils/benchmark', () => ({
  measureReduxDispatch: (...args) => measureReduxDispatch(...args)
}));

const { benchmarkMiddleware } = require('./middleware');

describe('benchmarkMiddleware', () => {
  beforeEach(() => {
    measureReduxDispatch.mockClear();
    measureReduxDispatch.mockImplementation((_actionType, run) => run());
  });

  it('measures string action types and forwards the result', () => {
    const next = jest.fn(() => 'ok');
    const action = { type: 'tabs/addTab', payload: { uid: '1' } };

    expect(benchmarkMiddleware({})(next)(action)).toBe('ok');
    expect(measureReduxDispatch).toHaveBeenCalledWith('tabs/addTab', expect.any(Function));
    expect(next).toHaveBeenCalledWith(action);
  });

  it('rethrows errors from next', () => {
    const next = jest.fn(() => {
      throw new Error('reducer failed');
    });

    expect(() => benchmarkMiddleware({})(next)({ type: 'tabs/addTab' })).toThrow('reducer failed');
    expect(measureReduxDispatch).toHaveBeenCalled();
  });

  it('skips measuring non-string action types', () => {
    const next = jest.fn(() => 'thunk');
    const thunk = () => {};

    expect(benchmarkMiddleware({})(next)(thunk)).toBe('thunk');
    expect(measureReduxDispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(thunk);
  });
});
