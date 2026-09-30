import { renderHook, act } from '@testing-library/react';
import { useResponseBody } from './useResponseBody';

const read = jest.fn();

jest.mock('utils/response-body', () => ({
  getResponseBodyClient: () => ({ read })
}));

describe('useResponseBody', () => {
  beforeEach(() => {
    read.mockReset();
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('does not read until load is called', () => {
    const { result } = renderHook(() => useResponseBody({ bodyRef: 'b1', mode: 'text' }));
    expect(read).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('loads text on demand', async () => {
    read.mockResolvedValueOnce({ data: 'hello', size: 5 });
    const { result } = renderHook(() => useResponseBody({ bodyRef: 'b1', mode: 'text' }));

    let ok;
    await act(async () => {
      ok = await result.current.load();
    });

    expect(ok).toBe(true);
    expect(result.current.data).toBe('hello');
  });

  it('creates blob object URL in blob mode', async () => {
    read.mockResolvedValueOnce({ bytes: Uint8Array.from([1, 2, 3]), size: 3, contentType: 'image/png' });
    const { result } = renderHook(() =>
      useResponseBody({ bodyRef: 'b2', contentType: 'image/png', mode: 'blob' })
    );

    await act(async () => {
      await result.current.load();
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(result.current.objectUrl).toBe('blob:mock');
  });

  it('ignores stale read after bodyRef change', async () => {
    let resolveRead;
    read.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = () => resolve({ data: 'late', size: 4 });
        })
    );

    const { result, rerender } = renderHook(
      ({ bodyRef }) => useResponseBody({ bodyRef, mode: 'text' }),
      { initialProps: { bodyRef: 'b-old' } }
    );

    await act(async () => {
      result.current.load();
    });

    rerender({ bodyRef: 'b-new' });

    await act(async () => {
      resolveRead();
      await Promise.resolve();
    });

    expect(result.current.data).toBeNull();
  });

  it('revokes object URL on unmount', async () => {
    read.mockResolvedValueOnce({ bytes: Uint8Array.from([1]), size: 1 });
    const { result, unmount } = renderHook(() => useResponseBody({ bodyRef: 'b3', mode: 'blob' }));

    await act(async () => {
      await result.current.load();
    });

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
