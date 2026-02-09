import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import Button from 'ui/Button';
import { IconFolder, IconChevronRight, IconCheck, IconX, IconEye, IconEyeOff } from '@tabler/icons';
import filter from 'lodash/filter';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import CollectionListItem from './CollectionListItem';
import useCollectionFolderTree from 'hooks/useCollectionFolderTree';
import { removeSaveTransientRequestModal } from 'providers/ReduxStore/slices/collections';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import { newFolder, closeTabs, mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import { resolveRequestFilename } from 'utils/common/platform';
import path from 'utils/common/path';
import { transformRequestToSaveToFilesystem, findCollectionByUid, findItemInCollection, areItemsLoading } from 'utils/collections';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import { itemSchema } from '@usebruno/schema';
import { uuid } from 'utils/common';
import { formatIpcError } from 'utils/common/error';

const SaveTransientRequest = ({ item: itemProp, collection: collectionProp, isOpen = false, onClose }) => {
  const dispatch = useDispatch();

  const latestCollection = useSelector((state) =>
    collectionProp ? findCollectionByUid(state.collections.collections, collectionProp.uid) : null
  );
  const latestItem = latestCollection && itemProp ? findItemInCollection(latestCollection, itemProp.uid) : itemProp;

  const item = itemProp;
  const collection = collectionProp;

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const allCollections = useSelector((state) => state.collections.collections);
  const isScratchCollection = activeWorkspace?.scratchCollectionUid === collection?.uid;

  const availableCollections = useMemo(() => {
    if (!isScratchCollection || !activeWorkspace) return [];

    return (activeWorkspace.collections || []).map((wc) => {
      const fullCollection = allCollections.find((c) => c.pathname === wc.path);
      return fullCollection || { ...wc, uid: null, mountStatus: 'unmounted' };
    }).filter((c) => !workspaces.some((w) => w.scratchCollectionUid === c.uid));
  }, [isScratchCollection, activeWorkspace, allCollections, workspaces]);

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    dispatch(removeSaveTransientRequestModal({ itemUid: item.uid }));
  };
  const [requestName, setRequestName] = useState(item?.name || '');
  const [searchText, setSearchText] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDirectoryName, setNewFolderDirectoryName] = useState('');
  const [showFilesystemName, setShowFilesystemName] = useState(false);
  const [isEditingFolderFilename, setIsEditingFolderFilename] = useState(false);
  const [pendingFolderNavigation, setPendingFolderNavigation] = useState(null);
  const newFolderInputRef = useRef(null);

  const [selectedTargetCollectionPath, setSelectedTargetCollectionPath] = useState(null);
  const [isSelectingCollection, setIsSelectingCollection] = useState(isScratchCollection);
  const folderTreeCollectionUid = selectedTargetCollectionPath
    ? availableCollections.find((c) => (c.path || c.pathname) === selectedTargetCollectionPath)?.uid
    : collection?.uid;

  const selectedTargetCollection = selectedTargetCollectionPath
    ? availableCollections.find((c) => (c.path || c.pathname) === selectedTargetCollectionPath)
    : null;

  useEffect(() => {
    const isMounted = selectedTargetCollection?.mountStatus === 'mounted';
    const isFullyLoaded = isMounted && !areItemsLoading(selectedTargetCollection);
    if (selectedTargetCollectionPath && isFullyLoaded) {
      setIsSelectingCollection(false);
    }
  }, [selectedTargetCollectionPath, selectedTargetCollection]);

  const {
    currentFolders,
    breadcrumbs,
    selectedFolderUid,
    navigateIntoFolder,
    navigateToRoot,
    navigateToBreadcrumb,
    getCurrentParentFolder,
    getCurrentSelectedFolder,
    reset,
    isAtRoot
  } = useCollectionFolderTree(folderTreeCollectionUid);

  const resetForm = () => {
    setRequestName(item.name || '');
    setSearchText('');
    reset();
    setShowNewFolderInput(false);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
    setIsEditingFolderFilename(false);
    setPendingFolderNavigation(null);
    setSelectedTargetCollectionPath(null);
    setIsSelectingCollection(isScratchCollection);
  };

  useEffect(() => {
    if (isOpen && item) {
      resetForm();
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  useEffect(() => {
    if (pendingFolderNavigation) {
      const newFolder = currentFolders.find((f) => f.filename === pendingFolderNavigation);
      if (newFolder) {
        navigateIntoFolder(newFolder.uid);
        setPendingFolderNavigation(null);
      }
    }
  }, [currentFolders, pendingFolderNavigation, navigateIntoFolder]);

  const filteredFolders = useMemo(() => {
    if (!searchText.trim()) {
      return currentFolders;
    }
    const searchLower = searchText.toLowerCase();
    return filter(currentFolders, (folder) => folder.name.toLowerCase().includes(searchLower));
  }, [currentFolders, searchText]);

  const handleCancel = () => {
    resetForm();
    handleClose();
  };

  const handleSelectCollection = useCallback((selectedCollection) => {
    const collectionPath = selectedCollection.path || selectedCollection.pathname;
    const isMounted = selectedCollection.mountStatus === 'mounted';
    const isFullyLoaded = isMounted && !areItemsLoading(selectedCollection);

    setSelectedTargetCollectionPath(collectionPath);

    if (isFullyLoaded) {
      setIsSelectingCollection(false);
      return;
    }

    if (!isMounted && selectedCollection.mountStatus !== 'mounting') {
      dispatch(
        mountCollection({
          collectionUid: selectedCollection.uid || uuid(),
          collectionPathname: collectionPath,
          brunoConfig: selectedCollection.brunoConfig
        })
      );
    }
  }, [dispatch]);

  const handleConfirm = async () => {
    if (!item || !collection || !latestItem) {
      return;
    }

    const targetCollection = selectedTargetCollection || collection;

    try {
      const { ipcRenderer } = window;

      const selectedFolder = getCurrentSelectedFolder();
      const targetDirname = selectedFolder ? selectedFolder.pathname : targetCollection.pathname;

      const trimmedName = requestName.trim();
      if (!trimmedName || trimmedName.length === 0) {
        toast.error('Request name is required');
        return;
      }

      const sanitizedFilename = sanitizeName(trimmedName);

      const itemToSave = latestItem.draft ? { ...latestItem, ...latestItem.draft } : { ...latestItem };
      itemToSave.name = sanitizedFilename;
      delete itemToSave.draft;

      const transformedItem = transformRequestToSaveToFilesystem(itemToSave);
      await itemSchema.validate(transformedItem);

      const targetFormat = targetCollection.format || DEFAULT_COLLECTION_FORMAT;
      const sourceFormat = collection.format || DEFAULT_COLLECTION_FORMAT;
      const targetFilename = resolveRequestFilename(sanitizedFilename, targetFormat);
      const targetPathname = path.join(targetDirname, targetFilename);

      await ipcRenderer.invoke('renderer:save-transient-request', {
        sourcePathname: item.pathname,
        targetDirname,
        targetFilename,
        request: transformedItem,
        format: targetFormat,
        sourceFormat
      });

      dispatch(
        insertTaskIntoQueue({
          uid: uuid(),
          type: 'OPEN_REQUEST',
          collectionUid: targetCollection.uid,
          itemPathname: targetPathname,
          preview: false
        })
      );

      dispatch(closeTabs({ tabUids: [item.uid] }));

      dispatch({
        type: 'collections/deleteItem',
        payload: {
          itemUid: item.uid,
          collectionUid: collection.uid
        }
      });

      toast.success('Request saved successfully');
      handleClose();
    } catch (err) {
      toast.error(formatIpcError(err) || 'Failed to save request');
      console.error('Error saving request:', err);
    }
  };

  const handleShowNewFolder = () => {
    setShowNewFolderInput(true);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
    setIsEditingFolderFilename(false);
  };

  const handleCancelNewFolder = () => {
    setShowNewFolderInput(false);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
    setIsEditingFolderFilename(false);
  };

  const handleNewFolderNameChange = (value) => {
    setNewFolderName(value);
    if (!isEditingFolderFilename) {
      setNewFolderDirectoryName(sanitizeName(value));
    }
  };

  const handleDirectoryNameChange = (value) => {
    setNewFolderDirectoryName(value);
    setIsEditingFolderFilename(true);
  };

  const handleCreateNewFolder = async () => {
    const trimmedFolderName = newFolderName.trim();

    if (!trimmedFolderName) {
      toast.error('Folder name is required');
      return;
    }

    if (!validateName(trimmedFolderName)) {
      toast.error(validateNameError(trimmedFolderName));
      return;
    }

    const directoryName = newFolderDirectoryName.trim() || sanitizeName(trimmedFolderName);
    const parentFolder = getCurrentParentFolder();
    const targetCollectionUid = selectedTargetCollection?.uid || collection?.uid;

    try {
      await dispatch(newFolder(trimmedFolderName, directoryName, targetCollectionUid, parentFolder?.uid));
      toast.success('New folder created!');

      setPendingFolderNavigation(directoryName);
      handleCancelNewFolder();
    } catch (err) {
      const errorMessage = err?.message || 'An error occurred while adding the folder';
      toast.error(errorMessage);
    }
  };

  const handleFolderClick = (folderUid) => {
    navigateIntoFolder(folderUid);
    setSearchText('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={isSelectingCollection ? 'Select Collection' : 'Save Request'}
        handleCancel={handleCancel}
        handleConfirm={handleConfirm}
        confirmText="Save"
        cancelText="Cancel"
        hideFooter={true}
      >
        <div className="save-request-form">
          <div className="form-section">
            <label htmlFor="request-name" className="form-label">
              Request name
            </label>
            <input
              id="request-name"
              type="text"
              className="form-input textbox"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              autoFocus={!isSelectingCollection}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="collections-section">
            <div className="collections-label">
              {isSelectingCollection ? 'Select a collection to save to' : 'Save to Collections'}
            </div>

            {isScratchCollection && (
              <div className="collection-name">
                <span
                  className={isSelectingCollection ? '' : 'collection-name-breadcrumb'}
                  onClick={!isSelectingCollection ? () => {
                    setIsSelectingCollection(true);
                    setSelectedTargetCollectionPath(null);
                    reset();
                  } : undefined}
                >
                  Collections
                </span>
                {!isSelectingCollection && (
                  <>
                    <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
                    <span
                      className={!isAtRoot ? 'collection-name-breadcrumb' : ''}
                      onClick={!isAtRoot ? navigateToRoot : undefined}
                    >
                      {(selectedTargetCollection || collection).name}
                    </span>
                    {breadcrumbs.length > 0 && (
                      <>
                        {breadcrumbs.map((breadcrumb, index) => (
                          <React.Fragment key={breadcrumb.uid}>
                            <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
                            <span
                              className="collection-name-breadcrumb"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToBreadcrumb(index);
                                setSearchText('');
                              }}
                            >
                              {breadcrumb.name}
                            </span>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                    {isAtRoot && <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />}
                  </>
                )}
              </div>
            )}

            {isSelectingCollection ? (
              <div className="collection-list">
                {availableCollections.length > 0 ? (
                  <ul className="collection-list-items">
                    {availableCollections.map((coll) => {
                      const collPath = coll.path || coll.pathname;
                      return (
                        <CollectionListItem
                          key={collPath}
                          collectionUid={coll.uid}
                          collectionPath={collPath}
                          collectionName={coll.name}
                          isSelected={selectedTargetCollectionPath === collPath}
                          onSelect={() => handleSelectCollection(coll)}
                        />
                      );
                    })}
                  </ul>
                ) : (
                  <div className="collection-empty-state">
                    No collections available in workspace. Please add a collection to the workspace first.
                  </div>
                )}
              </div>
            ) : (
              <>
                {!isScratchCollection && (selectedTargetCollection || collection) && (
                  <div className="collection-name">
                    <span
                      className={!isAtRoot ? 'collection-name-breadcrumb' : ''}
                      onClick={!isAtRoot ? navigateToRoot : undefined}
                    >
                      {(selectedTargetCollection || collection).name}
                    </span>
                    {breadcrumbs.length > 0 && (
                      <>
                        {breadcrumbs.map((breadcrumb, index) => (
                          <React.Fragment key={breadcrumb.uid}>
                            <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
                            <span
                              className="collection-name-breadcrumb"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToBreadcrumb(index);
                                setSearchText('');
                              }}
                            >
                              {breadcrumb.name}
                            </span>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                    {isAtRoot && <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />}
                  </div>
                )}

                <div className="search-container">
                  <SearchInput
                    searchText={searchText}
                    setSearchText={setSearchText}
                    placeholder="Search for folder"
                    autoFocus={false}
                  />
                </div>

                <div className="folder-list">
                  {filteredFolders.length > 0 || showNewFolderInput ? (
                    <ul className="folder-list-items">
                      {filteredFolders.map((folder) => (
                        <li
                          key={folder.uid}
                          className={`folder-item ${selectedFolderUid === folder.uid ? 'selected' : ''}`}
                          onClick={() => handleFolderClick(folder.uid)}
                        >
                          <div className="folder-item-content">
                            <IconFolder size={16} strokeWidth={1.5} />
                            <span className="folder-item-name">{folder.name}</span>
                          </div>
                          <IconChevronRight size={16} strokeWidth={1.5} />
                        </li>
                      ))}
                      {showNewFolderInput && (
                        <li className="new-folder-item">
                          <div className="new-folder-header">
                            <IconFolder size={16} strokeWidth={1.5} />
                            <label className="new-folder-header-label">
                              {showFilesystemName ? 'New Folder name (in bruno)' : 'New Folder name'}
                            </label>
                          </div>
                          <div className="new-folder-input-row">
                            <input
                              ref={newFolderInputRef}
                              type="text"
                              className="new-folder-input"
                              placeholder="Untitled new folder"
                              value={newFolderName}
                              onChange={(e) => handleNewFolderNameChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCreateNewFolder();
                                } else if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  handleCancelNewFolder();
                                }
                              }}
                            />
                            <div className="new-folder-actions">
                              <button
                                type="button"
                                className="new-folder-action-btn"
                                onClick={handleCancelNewFolder}
                                title="Cancel"
                              >
                                <IconX size={16} strokeWidth={1.5} />
                              </button>
                              <button
                                type="button"
                                className="new-folder-action-btn"
                                onClick={handleCreateNewFolder}
                                title="Create folder"
                              >
                                <IconCheck size={16} strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>

                          {showFilesystemName && (
                            <div className="new-folder-filesystem-wrapper">
                              <label className="new-folder-filesystem-label">Name on filesystem</label>
                              <input
                                type="text"
                                className="new-folder-input"
                                value={newFolderDirectoryName}
                                onChange={(e) => handleDirectoryNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCreateNewFolder();
                                  } else if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    handleCancelNewFolder();
                                  }
                                }}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            className="new-folder-toggle-filesystem-btn"
                            onClick={() => {
                              setShowFilesystemName(!showFilesystemName);
                              setNewFolderDirectoryName(sanitizeName(newFolderName));
                              setIsEditingFolderFilename(false);
                            }}
                          >
                            {showFilesystemName ? (
                              <>
                                <IconEyeOff size={16} strokeWidth={1.5} />
                                <span>Hide filesystem name</span>
                              </>
                            ) : (
                              <>
                                <IconEye size={16} strokeWidth={1.5} />
                                <span>Show filesystem name</span>
                              </>
                            )}
                          </button>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <div className="folder-empty-state">
                      {searchText.trim() ? 'No folders found' : 'No folders available'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="custom-modal-footer">
          <div className="footer-left">
            {!showNewFolderInput && !isSelectingCollection && (
              <Button
                type="button"
                color="primary"
                variant="ghost"
                icon={<IconFolder size={16} strokeWidth={1.5} />}
                onClick={handleShowNewFolder}
              >
                New Folder
              </Button>
            )}
          </div>
          <div className="footer-right">
            <Button type="button" color="secondary" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            {!isSelectingCollection && (
              <Button type="button" color="primary" onClick={handleConfirm}>
                Save
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default SaveTransientRequest;
