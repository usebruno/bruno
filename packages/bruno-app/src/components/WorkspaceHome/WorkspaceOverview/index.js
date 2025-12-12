import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconPlus, IconFolder, IconFileImport } from '@tabler/icons';
import { importCollectionInWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { openCollection } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import CollectionsList from './CollectionsList';
import WorkspaceDocs from '../WorkspaceDocs';
import StyledWrapper from './StyledWrapper';

const WorkspaceOverview = ({ workspace }) => {
  const dispatch = useDispatch();
  const { globalEnvironments } = useSelector((state) => state.globalEnvironments);

  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);

  const workspaceCollectionsCount = workspace?.collections?.length || 0;

  const workspaceEnvironmentsCount = globalEnvironments?.length || 0;

  const handleCreateCollection = async () => {
    if (!workspace?.pathname) {
      toast.error('Workspace path not found');
      return;
    }

    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:ensure-collections-folder', workspace.pathname);
      setCreateCollectionModalOpen(true);
    } catch (error) {
      console.error('Error ensuring collections folder exists:', error);
      toast.error('Error preparing workspace for collection creation');
    }
  };

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch((err) => {
      console.error(err);
      toast.error('An error occurred while opening the collection');
    });
  };

  const handleImportCollection = () => {
    setImportCollectionModalOpen(true);
  };

  const handleImportCollectionSubmit = ({ rawData, type }) => {
    setImportCollectionModalOpen(false);
    dispatch(importCollectionInWorkspace(rawData, workspace.uid, undefined, type)).catch((err) => {
      console.error(err);
      toast.error('An error occurred while importing the collection');
    });
  };

  return (
    <StyledWrapper>
      {createCollectionModalOpen && (
        <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} />
      )}

      {importCollectionModalOpen && (
        <ImportCollection
          onClose={() => setImportCollectionModalOpen(false)}
          handleSubmit={handleImportCollectionSubmit}
        />
      )}

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
              <button className="quick-action-btn" onClick={handleCreateCollection}>
                <IconPlus size={14} strokeWidth={1.5} />
                <span>Create Collection</span>
              </button>
              <button className="quick-action-btn" onClick={handleOpenCollection}>
                <IconFolder size={14} strokeWidth={1.5} />
                <span>Open Collection</span>
              </button>
              <button className="quick-action-btn" onClick={handleImportCollection}>
                <IconFileImport size={14} strokeWidth={1.5} />
                <span>Import Collection</span>
              </button>
            </div>
          </div>

          <div className="collections-section">
            <div className="section-title">Collections</div>
            <CollectionsList workspace={workspace} />
          </div>
        </div>

        <div className="overview-docs">
          <WorkspaceDocs workspace={workspace} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceOverview;
