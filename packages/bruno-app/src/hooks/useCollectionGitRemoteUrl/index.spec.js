const { describe, it, expect, afterEach } = require('@jest/globals');
import { renderHook, waitFor } from '@testing-library/react';
import useCollectionGitRemoteUrl from './index';

describe('useCollectionGitRemoteUrl', () => {
  const originalIpcRenderer = window.ipcRenderer;

  afterEach(() => {
    window.ipcRenderer = originalIpcRenderer;
  });

  it('resolves with the fetched remote url and flips isResolved', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue('https://github.com/org/repo.git') };
    const { result } = renderHook(() => useCollectionGitRemoteUrl('/tmp/collection'));

    expect(result.current.isResolved).toBe(false);
    await waitFor(() => expect(result.current.isResolved).toBe(true));

    expect(result.current.gitCollectionUrl).toBe('https://github.com/org/repo.git');
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:get-collection-git-remote-url',
      '/tmp/collection'
    );
  });

  it('treats an empty remote url as no remote', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue('') };
    const { result } = renderHook(() => useCollectionGitRemoteUrl('/tmp/collection'));

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.gitCollectionUrl).toBeNull();
  });

  it('resolves immediately and skips IPC when there is no pathname', async () => {
    window.ipcRenderer = { invoke: jest.fn() };
    const { result } = renderHook(() => useCollectionGitRemoteUrl(undefined));

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.gitCollectionUrl).toBeNull();
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('falls back to no url but still resolves when the fetch rejects', async () => {
    window.ipcRenderer = { invoke: jest.fn().mockRejectedValue(new Error('no git')) };
    const { result } = renderHook(() => useCollectionGitRemoteUrl('/tmp/collection'));

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.gitCollectionUrl).toBeNull();
  });
});
