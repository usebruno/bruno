import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { setIsCreatingCollection, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { setLocalStorageValue, SIDEBAR_COLLAPSED_KEY } from 'utils/common/localStorage';

const useCreateCollectionInWorkspace = (workspace) => {
  const dispatch = useDispatch();
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const isCreatingCollection = useSelector((state) => state.app.isCreatingCollection);

  const createCollection = async () => {
    if (isCreatingCollection) {
      return;
    }
    if (!workspace?.pathname) {
      toast.error('Workspace path not found');
      return;
    }

    try {
      await window.ipcRenderer.invoke('renderer:ensure-collections-folder', workspace.pathname);
      if (sidebarCollapsed) {
        dispatch(toggleSidebarCollapse());
        setLocalStorageValue(SIDEBAR_COLLAPSED_KEY, false);
      }
      dispatch(setIsCreatingCollection(true));
    } catch (error) {
      console.error('Error ensuring collections folder exists:', error);
      toast.error('Error preparing workspace for collection creation');
    }
  };

  return { createCollection, isCreatingCollection };
};

export default useCreateCollectionInWorkspace;
