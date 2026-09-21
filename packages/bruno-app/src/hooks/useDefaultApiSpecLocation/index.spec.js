import { renderHook, waitFor } from '@testing-library/react';
import useDefaultApiSpecLocation from './index';

let mockState;

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(mockState)
}));

const stateWith = (workspace) => ({
  workspaces: {
    activeWorkspaceUid: workspace ? workspace.uid : null,
    workspaces: workspace ? [workspace] : []
  }
});

describe('useDefaultApiSpecLocation', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue('/ws/apispec') };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('resolves the workspace apispec folder for a named workspace', async () => {
    mockState = stateWith({ uid: 'ws1', pathname: '/ws', type: 'workspace' });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    expect(result.current.isResolved).toBe(false);
    await waitFor(() => expect(result.current).toEqual({ location: '/ws/apispec', isResolved: true }));
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:ensure-apispec-folder', '/ws');
  });

  it('resolves immediately to an empty location in the default workspace without calling IPC', async () => {
    mockState = stateWith({ uid: 'default', pathname: '/appdata/default', type: 'default' });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    await waitFor(() => expect(result.current).toEqual({ location: '', isResolved: true }));
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('resolves immediately to an empty location when there is no active workspace', async () => {
    mockState = stateWith(null);

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    await waitFor(() => expect(result.current).toEqual({ location: '', isResolved: true }));
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('falls back to an empty location, still resolved, when the IPC call fails', async () => {
    window.ipcRenderer.invoke.mockRejectedValue(new Error('no folder'));
    mockState = stateWith({ uid: 'ws1', pathname: '/ws', type: 'workspace' });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    await waitFor(() => expect(result.current).toEqual({ location: '', isResolved: true }));
  });

  it('ignores a response that arrives after unmount', async () => {
    let resolveInvoke;
    window.ipcRenderer.invoke.mockReturnValue(new Promise((resolve) => { resolveInvoke = resolve; }));
    mockState = stateWith({ uid: 'ws1', pathname: '/ws', type: 'workspace' });

    const { result, unmount } = renderHook(() => useDefaultApiSpecLocation());
    unmount();
    resolveInvoke('/ws/apispec');
    await Promise.resolve();

    expect(result.current).toEqual({ location: '', isResolved: false });
    expect(console.error).not.toHaveBeenCalled();
  });
});
