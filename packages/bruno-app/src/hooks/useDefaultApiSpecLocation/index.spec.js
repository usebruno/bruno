import { renderHook, waitFor } from '@testing-library/react';
import { useSelector } from 'react-redux';
import useDefaultApiSpecLocation from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn()
}));

const NAMED_WORKSPACE = {
  uid: 'w1',
  type: 'named',
  pathname: '/home/dev/workspaces/team'
};

const DEFAULT_WORKSPACE = {
  uid: 'w-default',
  type: 'default',
  pathname: '/home/dev/.config/bruno/default-workspace'
};

const mockState = ({ workspace, defaultLocation = '' }) => {
  const state = {
    workspaces: {
      workspaces: workspace ? [workspace] : [],
      activeWorkspaceUid: workspace ? workspace.uid : null
    },
    app: {
      preferences: { general: { defaultLocation } }
    }
  };
  useSelector.mockImplementation((selector) => selector(state));
};

describe('useDefaultApiSpecLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.ipcRenderer = {
      invoke: jest.fn((channel, workspacePath) => Promise.resolve(`${workspacePath}/apispec`))
    };
  });

  it('resolves a named workspace to its apispec folder, ignoring the defaultLocation preference', async () => {
    mockState({ workspace: NAMED_WORKSPACE, defaultLocation: '/home/dev/Documents' });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    await waitFor(() => expect(result.current).toBe('/home/dev/workspaces/team/apispec'));
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:ensure-apispec-folder', NAMED_WORKSPACE.pathname);
  });

  it('prefers the defaultLocation preference in the default workspace', () => {
    mockState({ workspace: DEFAULT_WORKSPACE, defaultLocation: '/home/dev/Documents' });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    expect(result.current).toBe('/home/dev/Documents');

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('falls back to the default workspace apispec folder when the preference is unset', async () => {
    mockState({ workspace: DEFAULT_WORKSPACE });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    await waitFor(() => expect(result.current).toBe('/home/dev/.config/bruno/default-workspace/apispec'));
  });

  it('returns an empty location when there is no active workspace', () => {
    mockState({ workspace: null });

    const { result } = renderHook(() => useDefaultApiSpecLocation());

    expect(result.current).toBe('');
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});
