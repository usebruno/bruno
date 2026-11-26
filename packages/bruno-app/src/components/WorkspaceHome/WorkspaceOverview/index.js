import { useSelector, useDispatch } from 'react-redux';
import { IconPlus, IconFolder, IconDownload } from '@tabler/icons';
import { setIsCreatingCollection, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import { openCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { setLocalStorageValue, SIDEBAR_COLLAPSED_KEY } from 'utils/common/localStorage';
import { OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import CollectionsList from './CollectionsList';
import WorkspaceDocs from '../WorkspaceDocs';
import StyledWrapper from './StyledWrapper';

const WorkspaceOverview = ({ workspace }) => {
  const dispatch = useDispatch();
  const { globalEnvironments } = useSelector((state) => state.globalEnvironments);
  const { sidebarCollapsed, isCreatingCollection } = useSelector((state) => state.app);

  const workspaceCollectionsCount = workspace?.collections?.length || 0;

  const workspaceEnvironmentsCount = globalEnvironments?.length || 0;

  const handleCreateCollection = async () => {
    if (isCreatingCollection) {
      return;
    }

    if (!workspace?.pathname) {
      toast.error('Workspace path not found');
      return;
    }

    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:ensure-collections-folder', workspace.pathname);
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

  const handleOpenCollection = () => {
    dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));
  };

  const handleImportCollection = () => {
    dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.IMPORT));
  };

  return (
    <StyledWrapper>
      <div className="overview-layout">
        <div className="overview-main">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{workspaceCollectionsCount}</span>
              <span className="stat-label">Collections</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{workspaceEnvironmentsCount}</span>
              <span className="stat-label">Environments</span>
            </div>
          </div>

          <div className="quick-actions-section">
            <div className="section-title">Quick Actions</div>
            <div className="quick-actions-buttons">
              <Button
                color="light"
                size="sm"
                icon={<IconPlus size={14} strokeWidth={1.5} />}
                onClick={handleCreateCollection}
                disabled={isCreatingCollection}
              >
                Create Collection
              </Button>
              <Button
                color="light"
                size="sm"
                icon={<IconFolder size={14} strokeWidth={1.5} />}
                onClick={handleOpenCollection}
              >
                Open Collection
              </Button>
              <Button
                color="light"
                size="sm"
                icon={<IconDownload size={14} strokeWidth={1.5} />}
                onClick={handleImportCollection}
              >
                Import Collection
              </Button>
            </div>
          </div>

          <div className="collections-section">
            <div className="section-title">Collections</div>
            <CollectionsList workspace={workspace} />
          </div>
        </div>

        <div className="overview-docs">
          <WorkspaceDocs key={workspace?.uid} workspace={workspace} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceOverview;
