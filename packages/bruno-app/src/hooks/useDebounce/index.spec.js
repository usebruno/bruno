import { renderHook, act } from '@testing-library/react';
import useDebounce from './index';

const DELAY = 300;
const isEmpty = (value) => value === '';

const renderDebounce = (initialValue, options) =>
  renderHook(({ value }) => useDebounce(value, DELAY, options), {
    initialProps: { value: initialValue }
  });

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value without waiting for the delay', () => {
    const { result } = renderDebounce('abc');

    expect(result.current).toBe('abc');
  });

  it('holds the previous value until the delay elapses', () => {
    const { result, rerender } = renderDebounce('abc');

    rerender({ value: 'abcd' });
    expect(result.current).toBe('abc');

    act(() => {
      jest.advanceTimersByTime(DELAY - 1);
    });
    expect(result.current).toBe('abc');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abcd');
  });

  it('restarts the delay on each change so only the last value lands', () => {
    const { result, rerender } = renderDebounce('a');

    rerender({ value: 'ab' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'abc' });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });

  describe('skipDebounce', () => {
    it('applies a matching value without waiting for the delay', () => {
      const { result, rerender } = renderDebounce('abc', { skipDebounce: isEmpty });

      act(() => {
        jest.advanceTimersByTime(DELAY);
      });
      expect(result.current).toBe('abc');

      rerender({ value: '' });
      expect(result.current).toBe('');
    });

    it('does not resurface the cleared value when a new one is typed inside the delay', () => {
      const { result, rerender } = renderDebounce('abc', { skipDebounce: isEmpty });

      act(() => {
        jest.advanceTimersByTime(DELAY);
      });
      expect(result.current).toBe('abc');

      rerender({ value: '' });
      expect(result.current).toBe('');

      // Retyped well inside the delay: the pending clear is cancelled, so without
      // the immediate path the hook would still be holding 'abc' here.
      rerender({ value: 'x' });
      act(() => {
        jest.advanceTimersByTime(DELAY - 1);
      });
      expect(result.current).toBe('');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('x');
    });

    it('leaves non-matching values on the trailing edge', () => {
      const { result, rerender } = renderDebounce('abc', { skipDebounce: isEmpty });

      rerender({ value: 'abcd' });
      expect(result.current).toBe('abc');

      act(() => {
        jest.advanceTimersByTime(DELAY);
      });
      expect(result.current).toBe('abcd');
    });
  });
});
