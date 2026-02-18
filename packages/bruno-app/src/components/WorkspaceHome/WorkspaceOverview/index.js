import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconPlus, IconFolder, IconDownload } from '@tabler/icons';
import { importCollection, openCollection, importCollectionFromZip } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import BulkImportCollectionLocation from 'components/Sidebar/BulkImportCollectionLocation';
import CloneGitRepository from 'components/Sidebar/CloneGitRespository';
import Button from 'ui/Button';
import CollectionsList from './CollectionsList';
import WorkspaceDocs from '../WorkspaceDocs';
import StyledWrapper from './StyledWrapper';

const WorkspaceOverview = ({ workspace }) => {
  const dispatch = useDispatch();
  const { globalEnvironments } = useSelector((state) => state.globalEnvironments);

  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const [showCloneGitModal, setShowCloneGitModal] = useState(false);
  const [gitRepositoryUrl, setGitRepositoryUrl] = useState(null);

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

  const handleImportCollectionSubmit = ({ rawData, type, repositoryUrl, ...rest }) => {
    setImportCollectionModalOpen(false);

    if (type === 'git-repository') {
      setGitRepositoryUrl(repositoryUrl);
      setShowCloneGitModal(true);
      return;
    }

    setImportData({ rawData, type, ...rest });
    setImportCollectionLocationModalOpen(true);
  };

  const handleImportCollectionLocation = (convertedCollection, collectionLocation, options = {}) => {
    const importAction = options.isZipImport
      ? importCollectionFromZip(convertedCollection.zipFilePath, collectionLocation)
      : importCollection(convertedCollection, collectionLocation, options);

    dispatch(importAction)
      .then(() => {
        setImportCollectionLocationModalOpen(false);
        setImportData(null);
      });
  };

  const handleCloseGitModal = () => {
    setShowCloneGitModal(false);
    setGitRepositoryUrl(null);
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

      {importCollectionLocationModalOpen && importData && (importData.type !== 'multiple' && importData.type !== 'bulk') && (
        <ImportCollectionLocation
          rawData={importData.rawData}
          format={importData.type}
          sourceUrl={importData.sourceUrl}
          rawContent={importData.rawContent}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      )}
      {importCollectionLocationModalOpen && importData && (importData.type === 'multiple' || importData.type === 'bulk') && (
        <BulkImportCollectionLocation
          importData={importData}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      )}
      {showCloneGitModal && (
        <CloneGitRepository
          onClose={handleCloseGitModal}
          onFinish={handleCloseGitModal}
          collectionRepositoryUrl={gitRepositoryUrl}
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
              <Button
                color="light"
                size="sm"
                icon={<IconPlus size={14} strokeWidth={1.5} />}
                onClick={handleCreateCollection}
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
          <WorkspaceDocs workspace={workspace} />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceOverview;
