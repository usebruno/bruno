import { act, renderHook } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { createWorkspaceWithUniqueName } from 'providers/ReduxStore/slices/workspaces/actions';
import useCreateWorkspace from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

jest.mock('providers/ReduxStore/slices/workspaces/actions', () => ({
  createWorkspaceWithUniqueName: jest.fn((location) => ({ type: 'createWorkspace', location }))
}));

const withDefaultLocation = (defaultLocation) =>
  useSelector.mockImplementation((selector) => selector({ app: { preferences: { general: { defaultLocation } } } }));

describe('useCreateWorkspace', () => {
  let dispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn(() => Promise.resolve());
    useDispatch.mockReturnValue(dispatch);
  });

  it('opens the Create Workspace dialog when no default location is set', async () => {
    withDefaultLocation('');
    const { result } = renderHook(() => useCreateWorkspace());

    await act(() => result.current.createWorkspace());

    expect(result.current.isCreateWorkspaceModalOpen).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();

    act(() => result.current.closeCreateWorkspaceModal());
    expect(result.current.isCreateWorkspaceModalOpen).toBe(false);
  });

  it('creates a workspace in the default location', async () => {
    withDefaultLocation('/home/me/bruno');
    const { result } = renderHook(() => useCreateWorkspace());

    await act(() => result.current.createWorkspace());

    expect(createWorkspaceWithUniqueName).toHaveBeenCalledWith('/home/me/bruno');
    expect(result.current.isCreateWorkspaceModalOpen).toBe(false);
  });

  it('shows the error when creating fails', async () => {
    withDefaultLocation('/home/me/bruno');
    dispatch.mockRejectedValueOnce(new Error('Folder is read-only'));
    const { result } = renderHook(() => useCreateWorkspace());

    await act(() => result.current.createWorkspace());

    expect(toast.error).toHaveBeenCalledWith('Folder is read-only');
  });
});
