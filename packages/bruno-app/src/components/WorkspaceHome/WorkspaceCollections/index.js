import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconBox, IconTrash, IconEdit, IconShare } from '@tabler/icons';
import { removeCollectionFromWorkspaceAction, importCollectionInWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import RenameCollection from 'components/Sidebar/Collections/Collection/RenameCollection';
import ShareCollection from 'components/ShareCollection';
import StyledWrapper from './StyledWrapper';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';

const WorkspaceCollections = ({ workspace, onImportCollection }) => {
  const dispatch = useDispatch();
  const { collections } = useSelector((state) => state.collections);
  const [collectionToRemove, setCollectionToRemove] = useState(null);
  const [renameCollectionModalOpen, setRenameCollectionModalOpen] = useState(false);
  const [shareCollectionModalOpen, setShareCollectionModalOpen] = useState(false);
  const [selectedCollectionUid, setSelectedCollectionUid] = useState(null);

  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);

  const handleImportCollection = ({ rawData, type }) => {
    if (onImportCollection) {
      onImportCollection();
      return;
    }

    setImportCollectionModalOpen(false);
    dispatch(importCollectionInWorkspace(rawData, workspace.uid, undefined, type))
      .catch((err) => {
        console.error(err);
        toast.error('An error occurred while importing the collection');
      });
  };

  const workspaceCollections = React.useMemo(() => {
    if (!workspace.collections || workspace.collections.length === 0) {
      return [];
    }

    const result = [];

    workspace.collections.forEach((wc) => {
      const loadedCollection = collections.find((c) => c.pathname === wc.path);

      if (loadedCollection) {
        result.push({
          ...loadedCollection,
          isGitBacked: !!wc.remote,
          gitRemoteUrl: wc.remote
        });
      } else {
        result.push({
          uid: `unloaded-${wc.path}`,
          name: wc.name,
          pathname: wc.path,
          items: [],
          environments: [],
          isGitBacked: !!wc.remote,
          isLoaded: false,
          gitRemoteUrl: wc.remote,
          git: { gitRootPath: null },
          brunoConfig: {},
          root: {
            request: {
              headers: [],
              auth: { mode: 'none' },
              vars: { req: [], res: [] },
              script: { req: '', res: '' },
              tests: ''
            },
            docs: ''
          }
        });
      }
    });

    return result;
  }, [workspace.collections, collections, workspace.pathname]);

  const handleOpenCollectionClick = (collection, event) => {
    if (event.target.closest('.action-buttons')) {
      return;
    }

    if (collection.isLoaded === false) {
      if (collection.isGitBacked) {
        toast.error(`Collection "${collection.name}" needs to be cloned first`);
      } else {
        toast.error(`Collection "${collection.name}" does not exist on disk`);
      }
      return;
    }

    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));

    dispatch(hideHomePage());

    dispatch(addTab({
      uid: collection.uid,
      collectionUid: collection.uid,
      type: 'collection-settings'
    }));
  };

  const handleRenameCollection = (collection) => {
    if (collection.isLoaded === false) {
      toast.error('Cannot rename collections that are not cloned yet');
      return;
    }

    setSelectedCollectionUid(collection.uid);
    setRenameCollectionModalOpen(true);
  };

  const handleShareCollection = (collection) => {
    if (collection.isLoaded === false) {
      toast.error('Please clone this collection first before sharing it');
      return;
    }

    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));

    setSelectedCollectionUid(collection.uid);
    setShareCollectionModalOpen(true);
  };

  const handleRemoveCollection = (collection) => {
    setCollectionToRemove(collection);
  };

  const confirmRemoveCollection = async () => {
    if (!collectionToRemove) return;

    try {
      await dispatch(removeCollectionFromWorkspaceAction(workspace.uid, collectionToRemove.pathname));

      const collectionInfo = getCollectionWorkspaceInfo(collectionToRemove);

      if (collectionInfo.isLoaded && !collectionInfo.isGitBacked) {
        toast.success(`Deleted "${collectionToRemove.name}" collection`);
      } else if (collectionInfo.isGitBacked) {
        toast.success(`Removed git-backed collection "${collectionToRemove.name}" from workspace`);
      } else {
        toast.success(`Removed "${collectionToRemove.name}" from workspace`);
      }

      setCollectionToRemove(null);
    } catch (error) {
      console.error('Error removing collection:', error);
      toast.error(error.message || 'Failed to remove collection from workspace');
    }
  };

  const getCollectionWorkspaceInfo = (collection) => {
    if (collection.hasOwnProperty('isGitBacked')) {
      return {
        isGitBacked: collection.isGitBacked,
        gitRemoteUrl: collection.gitRemoteUrl,
        isLoaded: collection.isLoaded !== false
      };
    }

    const workspaceCollection = workspace.collections?.find((wc) => {
      return collection.pathname === wc.path;
    });

    return {
      isGitBacked: !!workspaceCollection?.remote,
      gitRemoteUrl: workspaceCollection?.remote,
      isLoaded: true
    };
  };

  return (
    <StyledWrapper className="h-full">
      <div className="w-full h-full">

        {createCollectionModalOpen && (
          <CreateCollection
            onClose={() => setCreateCollectionModalOpen(false)}
          />
        )}

        {importCollectionModalOpen && (
          <ImportCollection
            onClose={() => setImportCollectionModalOpen(false)}
            handleSubmit={handleImportCollection}
          />
        )}

        {renameCollectionModalOpen && selectedCollectionUid && (
          <RenameCollection
            collectionUid={selectedCollectionUid}
            onClose={() => {
              setRenameCollectionModalOpen(false);
              setSelectedCollectionUid(null);
            }}
          />
        )}

        {shareCollectionModalOpen && selectedCollectionUid && (
          <ShareCollection
            collectionUid={selectedCollectionUid}
            onClose={() => {
              setShareCollectionModalOpen(false);
              setSelectedCollectionUid(null);
            }}
          />
        )}

        {collectionToRemove && (
          <Modal
            size="sm"
            title="Delete Collection"
            handleCancel={() => setCollectionToRemove(null)}
            handleConfirm={confirmRemoveCollection}
            confirmText="Delete Collection"
            cancelText="Cancel"
            style="new"
          >
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong>"{collectionToRemove.name}"</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              {(() => {
                const collectionInfo = getCollectionWorkspaceInfo(collectionToRemove);

                if (collectionInfo.isGitBacked) {
                  return 'This will remove the git-backed collection reference from workspace.yml. Local files (if any) will not be deleted.';
                } else {
                  return 'This will permanently delete the collection files from the workspace collections folder.';
                }
              })()}
            </p>
          </Modal>
        )}

        <div className="h-full overflow-auto">
          {workspaceCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                <IconBox size={32} stroke={1.5} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No collections yet</h3>
              <p className="text-muted mb-4">
                Create your first collection or open an existing one to get started.
              </p>
            </div>
          ) : (
            <div className="collections-table">
              <div className="collections-header">
                <div className="header-cell header-name">Collection</div>
                <div className="header-cell header-location">Location</div>
                <div className="header-cell flex justify-end">Actions</div>
              </div>

              <div className="collections-body">
                {workspaceCollections.map((collection, index) => {
                  return (
                    <div
                      key={collection.uid || index}
                      className="collection-row"
                      onClick={(e) => handleOpenCollectionClick(collection, e)}
                    >
                      <div className="row-cell cell-name">
                        <div className="flex items-center gap-2">
                          <IconBox size={16} stroke={1.5} className="collection-icon" />
                          <div className="collection-info">
                            <div className="collection-name">{collection.name}</div>
                            {collection.brunoConfig?.name && collection.brunoConfig.name !== collection.name && (
                              <div className="collection-subtitle">{collection.brunoConfig.name}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="row-cell cell-location">
                        <div className="location-text" title={collection.pathname}>
                          {collection.pathname}
                        </div>
                      </div>

                      <div className="row-cell cell-actions">
                        <div className="action-buttons">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameCollection(collection);
                            }}
                            className="action-btn action-edit"
                            title="Rename collection"
                          >
                            <IconEdit size={16} stroke={1.5} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareCollection(collection);
                            }}
                            className="action-btn action-share"
                            title="Share collection"
                          >
                            <IconShare size={16} stroke={1.5} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCollection(collection);
                            }}
                            className="action-btn action-delete"
                            title="Remove from workspace"
                          >
                            <IconTrash size={16} stroke={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceCollections;
