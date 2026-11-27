import { act, renderHook } from '@testing-library/react';
import { useHeaderSortOrder } from './sortOrder';

describe('response header sort preference', () => {
  beforeEach(() => localStorage.clear());

  it('cycles and synchronizes across mounted panes and later mounts', () => {
    const first = renderHook(() => useHeaderSortOrder());
    const second = renderHook(() => useHeaderSortOrder());
    expect(first.result.current[0]).toBe('default');
    act(() => first.result.current[1]());
    expect(second.result.current[0]).toBe('alphabetical');
    act(() => second.result.current[1]());
    expect(first.result.current[0]).toBe('reverseAlphabetical');
    first.unmount();
    const remounted = renderHook(() => useHeaderSortOrder());
    expect(remounted.result.current[0]).toBe('reverseAlphabetical');
    act(() => second.result.current[1]());
    expect(remounted.result.current[0]).toBe('default');
  });
});
