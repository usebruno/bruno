import { renderHook } from '@testing-library/react';
import useTooltipId from './index';

describe('useTooltipId', () => {
  it('starts with the prefix and has no colons, so it works as a CSS selector', () => {
    const { result } = renderHook(() => useTooltipId('copy-button'));

    expect(result.current).toMatch(/^copy-button-[^:]+$/);
  });

  it('keeps the same id across renders', () => {
    const { result, rerender } = renderHook(() => useTooltipId('copy-button'));
    const firstId = result.current;

    rerender();

    expect(result.current).toBe(firstId);
  });

  it('gives each component its own id', () => {
    const { result: first } = renderHook(() => useTooltipId('copy-button'));
    const { result: second } = renderHook(() => useTooltipId('copy-button'));

    expect(first.current).not.toBe(second.current);
  });
});
