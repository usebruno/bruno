import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { createWorkspaceWithUniqueName } from 'providers/ReduxStore/slices/workspaces/actions';

const useCreateWorkspace = () => {
  const dispatch = useDispatch();
  const defaultLocation = useSelector((state) => state.app.preferences?.general?.defaultLocation || '');
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  const createWorkspace = useCallback(async () => {
    if (!defaultLocation) {
      setIsCreateWorkspaceModalOpen(true);
      return;
    }
    try {
      await dispatch(createWorkspaceWithUniqueName(defaultLocation));
    } catch (error) {
      toast.error(error?.message || 'Failed to create workspace');
    }
  }, [dispatch, defaultLocation]);

  const closeCreateWorkspaceModal = useCallback(() => setIsCreateWorkspaceModalOpen(false), []);

  return { createWorkspace, isCreateWorkspaceModalOpen, closeCreateWorkspaceModal };
};

export default useCreateWorkspace;
