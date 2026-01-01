import React, { useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconBox, IconTrash, IconEdit, IconShare, IconDots } from '@tabler/icons';
import { removeCollectionFromWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { normalizePath } from 'utils/common/path';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import RenameCollection from 'components/Sidebar/Collections/Collection/RenameCollection';
import ShareCollection from 'components/ShareCollection';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const CollectionsList = ({ workspace }) => {
  const dispatch = useDispatch();
  const { collections } = useSelector((state) => state.collections);
  const dropdownRefs = useRef({});

  const [collectionToRemove, setCollectionToRemove] = useState(null);
  const [renameCollectionModalOpen, setRenameCollectionModalOpen] = useState(false);
  const [shareCollectionModalOpen, setShareCollectionModalOpen] = useState(false);
  const [selectedCollectionUid, setSelectedCollectionUid] = useState(null);

  const workspaceCollections = useMemo(() => {
    if (!workspace.collections || workspace.collections.length === 0) {
      return [];
    }

    return workspace.collections.map((wc) => {
      const loadedCollection = collections.find(
        (c) => normalizePath(c.pathname) === normalizePath(wc.path)
      );

      if (loadedCollection) {
        return {
          ...loadedCollection,
          isGitBacked: !!wc.remote,
          gitRemoteUrl: wc.remote
        };
      }

      return {
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
      };
    });
  }, [workspace.collections, collections]);

  const isInternalCollection = (collection) => {
    if (!workspace.pathname || !collection.pathname) return false;
    const workspaceCollectionsFolder = normalizePath(`${workspace.pathname}/collections`);
    const collectionPath = normalizePath(collection.pathname);
    return collectionPath.startsWith(workspaceCollectionsFolder);
  };

  const getCollectionWorkspaceInfo = (collection) => {
    if (Object.prototype.hasOwnProperty.call(collection, 'isGitBacked')) {
      return {
        isGitBacked: collection.isGitBacked,
        gitRemoteUrl: collection.gitRemoteUrl,
        isLoaded: collection.isLoaded !== false,
        isInternal: isInternalCollection(collection)
      };
    }

    const workspaceCollection = workspace.collections?.find(
      (wc) => normalizePath(collection.pathname) === normalizePath(wc.path)
    );

    return {
      isGitBacked: !!workspaceCollection?.remote,
      gitRemoteUrl: workspaceCollection?.remote,
      isLoaded: true,
      isInternal: isInternalCollection(collection)
    };
  };

  const handleOpenCollectionClick = (collection, event) => {
    if (event.target.closest('.collection-menu')) {
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

    dispatch(
      mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      })
    );

    dispatch(
      addTab({
        uid: collection.uid,
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  const handleRenameCollection = (collection) => {
    dropdownRefs.current[collection.uid]?.hide();
    if (collection.isLoaded === false) {
      toast.error('Cannot rename collections that are not cloned yet');
      return;
    }
    setSelectedCollectionUid(collection.uid);
    setRenameCollectionModalOpen(true);
  };

  const handleShareCollection = (collection) => {
    dropdownRefs.current[collection.uid]?.hide();
    if (collection.isLoaded === false) {
      toast.error('Please clone this collection first before sharing it');
      return;
    }

    dispatch(
      mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      })
    );

    setSelectedCollectionUid(collection.uid);
    setShareCollectionModalOpen(true);
  };

  const handleRemoveCollection = (collection) => {
    dropdownRefs.current[collection.uid]?.hide();
    setCollectionToRemove(collection);
  };

  const confirmRemoveCollection = async () => {
    if (!collectionToRemove) return;

    try {
      const collectionInfo = getCollectionWorkspaceInfo(collectionToRemove);
      const isDelete = collectionInfo.isInternal && !collectionInfo.isGitBacked;

      await dispatch(removeCollectionFromWorkspaceAction(workspace.uid, collectionToRemove.pathname));

      if (isDelete) {
        toast.success(`Deleted "${collectionToRemove.name}" collection`);
      } else {
        toast.success(`Removed "${collectionToRemove.name}" from workspace`);
      }

      setCollectionToRemove(null);
    } catch (error) {
      console.error('Error removing collection:', error);
      toast.error(error.message || 'Failed to remove collection from workspace');
    }
  };

  const renderRemoveModal = () => {
    if (!collectionToRemove) return null;

    const collectionInfo = getCollectionWorkspaceInfo(collectionToRemove);
    const isDelete = collectionInfo.isInternal && !collectionInfo.isGitBacked;

    return (
      <Modal
        size="sm"
        title={isDelete ? 'Delete Collection' : 'Remove Collection'}
        handleCancel={() => setCollectionToRemove(null)}
        handleConfirm={confirmRemoveCollection}
        confirmText={isDelete ? 'Delete' : 'Remove'}
        cancelText="Cancel"
        confirmButtonColor={isDelete ? 'warning' : 'primary'}
        style="new"
      >
        <p className="text-gray-600 dark:text-gray-300">
          Are you sure you want to {isDelete ? 'delete' : 'remove'}{' '}
          <strong>"{collectionToRemove.name}"</strong>?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          {isDelete
            ? 'This will permanently delete the collection files from the workspace collections folder.'
            : 'This will remove the collection from the workspace. The collection files will not be deleted.'}
        </p>
      </Modal>
    );
  };

  return (
    <StyledWrapper>
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

      {renderRemoveModal()}

      <div className="collections-list">
        {workspaceCollections.length === 0 ? (
          <div className="empty-state">
            <IconBox size={32} strokeWidth={1.5} className="empty-icon" />
            <h3 className="empty-title">No collections yet</h3>
            <p className="empty-description">
              Create your first collection or open an existing one to get started.
            </p>
          </div>
        ) : (
          workspaceCollections.map((collection, index) => (
            <div
              key={collection.uid || index}
              className="collection-card"
              onClick={(e) => handleOpenCollectionClick(collection, e)}
            >
              <div className="collection-info">
                <div className="collection-header">
                  <div className="collection-icon-wrapper">
                    <IconBox size={18} strokeWidth={1.5} />
                  </div>
                  <div className="collection-name">{collection.name}</div>
                </div>
                <div className="collection-path">{collection.pathname}</div>
              </div>
              <div className="collection-menu">
                <Dropdown
                  style="new"
                  placement="bottom-end"
                  onCreate={(ref) => (dropdownRefs.current[collection.uid] = ref)}
                  icon={<IconDots size={18} strokeWidth={1.5} />}
                >
                  <div className="collection-dropdown">
                    <div
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameCollection(collection);
                      }}
                    >
                      <IconEdit size={16} strokeWidth={1.5} />
                      <span>Rename</span>
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareCollection(collection);
                      }}
                    >
                      <IconShare size={16} strokeWidth={1.5} />
                      <span>Share</span>
                    </div>
                    <div
                      className="dropdown-item delete-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCollection(collection);
                      }}
                    >
                      <IconTrash size={16} strokeWidth={1.5} />
                      <span>Remove</span>
                    </div>
                  </div>
                </Dropdown>
              </div>
            </div>
          ))
        )}
      </div>
    </StyledWrapper>
  );
};

export default CollectionsList;
