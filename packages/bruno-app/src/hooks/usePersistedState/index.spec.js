import { renderHook, act } from '@testing-library/react';
import { usePersistedState, PersistedScopeProvider } from './index';

const quotaError = () => {
  const err = new Error('exceeded the quota');
  err.name = 'QuotaExceededError';
  return err;
};

const wrapper = ({ children }) => <PersistedScopeProvider scope="tab1">{children}</PersistedScopeProvider>;

describe('usePersistedState', () => {
  let originalSetItem;

  beforeEach(() => {
    localStorage.clear();
    originalSetItem = Storage.prototype.setItem;
  });

  afterEach(() => {
    Storage.prototype.setItem = originalSetItem;
    localStorage.clear();
  });

  it('persists the value under the scoped key', () => {
    const { result } = renderHook(() => usePersistedState({ key: 'scroll', default: 0 }), { wrapper });
    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
    expect(localStorage.getItem('persisted::tab1::scroll')).toBe('42');
  });

  it('prunes persisted entries and retries once when the quota is exceeded', () => {
    localStorage.setItem('persisted::other::codeeditor::big', 'x');
    localStorage.setItem('unrelated', 'keep');
    let calls = 0;
    Storage.prototype.setItem = jest.fn(function (key, value) {
      calls += 1;
      if (calls === 1) throw quotaError();
      return originalSetItem.call(this, key, value);
    });

    const { result } = renderHook(() => usePersistedState({ key: 'scroll', default: 0 }), { wrapper });
    expect(() => act(() => result.current[1](10))).not.toThrow();

    expect(result.current[0]).toBe(10);
    expect(localStorage.getItem('persisted::other::codeeditor::big')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
    expect(localStorage.getItem('persisted::tab1::scroll')).toBe('10');
  });

  it('does not throw when the write keeps failing', () => {
    Storage.prototype.setItem = jest.fn(() => {
      throw quotaError();
    });

    const { result } = renderHook(() => usePersistedState({ key: 'scroll', default: 0 }), { wrapper });
    expect(() => act(() => result.current[1](5))).not.toThrow();
    expect(() => act(() => result.current[1]((prev) => prev + 1))).not.toThrow();
    expect(result.current[0]).toBe(6);
    expect(Storage.prototype.setItem).toHaveBeenCalledTimes(4);
  });
});
