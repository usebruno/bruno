import { renderHook } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { setIsCreatingCollection, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import useCreateCollectionInWorkspace from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

jest.mock('providers/ReduxStore/slices/app', () => ({
  setIsCreatingCollection: jest.fn((value) => ({ type: 'setIsCreatingCollection', value })),
  toggleSidebarCollapse: jest.fn(() => ({ type: 'toggleSidebarCollapse' }))
}));

jest.mock('utils/common/localStorage', () => ({
  setLocalStorageValue: jest.fn(),
  SIDEBAR_COLLAPSED_KEY: 'sidebar-collapsed'
}));

const WORKSPACE = { uid: 'ws', pathname: '/workspaces/team' };

const withAppState = (app) => useSelector.mockImplementation((selector) => selector({ app }));

describe('useCreateCollectionInWorkspace', () => {
  let dispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn();
    useDispatch.mockReturnValue(dispatch);
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined) };
  });

  it('prepares the collections folder, expands the sidebar and starts the inline create', async () => {
    withAppState({ sidebarCollapsed: true, isCreatingCollection: false });
    const { result } = renderHook(() => useCreateCollectionInWorkspace(WORKSPACE));

    await result.current.createCollection();

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:ensure-collections-folder', '/workspaces/team');
    expect(dispatch).toHaveBeenCalledWith(toggleSidebarCollapse());
    expect(dispatch).toHaveBeenCalledWith(setIsCreatingCollection(true));
  });

  it('does nothing while a collection is already being created', async () => {
    withAppState({ sidebarCollapsed: false, isCreatingCollection: true });
    const { result } = renderHook(() => useCreateCollectionInWorkspace(WORKSPACE));

    await result.current.createCollection();

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('reports a workspace without a folder', async () => {
    withAppState({ sidebarCollapsed: false, isCreatingCollection: false });
    const { result } = renderHook(() => useCreateCollectionInWorkspace({ uid: 'ws' }));

    await result.current.createCollection();

    expect(toast.error).toHaveBeenCalledWith('Workspace path not found');
  });
});
