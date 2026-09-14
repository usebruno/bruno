const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
import { renderHook, act } from '@testing-library/react';
import useDeferredLoading from './index';

describe('useDeferredLoading', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return false initially when isLoading is false', () => {
    const { result } = renderHook(() => useDeferredLoading(false));
    expect(result.current).toBe(false);
  });

  it('should not show loading immediately when isLoading becomes true', () => {
    const { result } = renderHook(() => useDeferredLoading(true, 200));
    expect(result.current).toBe(false);
  });

  it('should show loading after the delay has passed', () => {
    const { result } = renderHook(() => useDeferredLoading(true, 200));

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  it('should not show loading if isLoading becomes false before delay', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDeferredLoading(isLoading, 200),
      { initialProps: { isLoading: true } }
    );

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(false);

    rerender({ isLoading: false });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(false);
  });

  it('should reset to false immediately when isLoading becomes false', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDeferredLoading(isLoading, 200),
      { initialProps: { isLoading: true } }
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);

    rerender({ isLoading: false });

    expect(result.current).toBe(false);
  });

  it('should use default delay of 200ms', () => {
    const { result } = renderHook(() => useDeferredLoading(true));

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(199);
    });

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current).toBe(true);
  });

  it('should respect custom delay values', () => {
    const { result } = renderHook(() => useDeferredLoading(true, 500));

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);
  });
});
