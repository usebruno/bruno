import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import Button from 'ui/Button';
import { IconFolder, IconChevronRight, IconCheck, IconX, IconEye, IconEyeOff, IconEdit, IconArrowBackUp } from '@tabler/icons';
import PathDisplay from 'components/PathDisplay/index';
import Help from 'components/Help';
import filter from 'lodash/filter';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import CollectionListItem from './CollectionListItem';
import FolderBreadcrumbs from './FolderBreadcrumbs';
import useCollectionFolderTree from 'hooks/useCollectionFolderTree';
import { removeSaveTransientRequestModal } from 'providers/ReduxStore/slices/collections';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import { newFolder, closeTabs, mountCollection, createCollection, browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import { resolveRequestFilename } from 'utils/common/platform';
import path from 'utils/common/path';
import { transformRequestToSaveToFilesystem, findCollectionByUid, findItemInCollection, areItemsLoading } from 'utils/collections';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import { itemSchema } from '@usebruno/schema';
import { uuid } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import get from 'lodash/get';

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
  const preferences = useSelector((state) => state.app.preferences);
  const isDefaultWorkspace = activeWorkspace?.type === 'default';
  const defaultCollectionLocation = isDefaultWorkspace
    ? get(preferences, 'general.defaultLocation', '')
    : (activeWorkspace?.pathname ? `${activeWorkspace.pathname}/collections` : '');

  const availableCollections = useMemo(() => {
    if (!isScratchCollection || !activeWorkspace) return [];

    return (activeWorkspace.collections || []).map((wc) => {
      const fullCollection = allCollections.find((c) => c.pathname === wc.path);
      // Use stable deterministic UID based on path to avoid duplicate Redux entries
      const stableUid = wc.path ? `pending-${wc.path.replace(/[^a-zA-Z0-9]/g, '-')}` : uuid();
      return fullCollection || { ...wc, uid: stableUid, mountStatus: 'unmounted' };
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

  // State for new collection creation
  const [newCollection, setNewCollection] = useState({ show: false, name: '', location: '', format: DEFAULT_COLLECTION_FORMAT });
  const newCollectionInputRef = useRef(null);

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

  const resetForm = useCallback(() => {
    setRequestName(item?.name || '');
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
    // Reset new collection state
    setNewCollection({ show: false, name: '', location: '', format: DEFAULT_COLLECTION_FORMAT });
  }, [item?.name, isScratchCollection, reset]);

  useEffect(() => {
    if (isOpen && item) {
      resetForm();
    }
  }, [isOpen, item, resetForm]);

  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  useEffect(() => {
    if (newCollection.show && newCollectionInputRef.current) {
      newCollectionInputRef.current.focus();
    }
  }, [newCollection.show]);

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

      if (!validateName(trimmedName)) {
        toast.error(validateNameError(trimmedName));
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

  // New Collection handlers
  const handleShowNewCollection = () => {
    setNewCollection({ show: true, name: '', location: defaultCollectionLocation, format: DEFAULT_COLLECTION_FORMAT });
  };

  const handleCancelNewCollection = () => {
    setNewCollection({ show: false, name: '', location: '', format: DEFAULT_COLLECTION_FORMAT });
  };

  const handleBrowseCollectionLocation = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          setNewCollection((prev) => ({ ...prev, location: dirPath }));
        }
      })
      .catch(() => {});
  };

  const handleCreateNewCollection = async () => {
    const trimmedName = newCollection.name.trim();
    if (!trimmedName) {
      toast.error('Collection name is required');
      return;
    }
    if (!validateName(trimmedName)) {
      toast.error(validateNameError(trimmedName));
      return;
    }
    if (!newCollection.location) {
      toast.error('Location is required');
      return;
    }
    try {
      await dispatch(createCollection(trimmedName, sanitizeName(trimmedName), newCollection.location, { format: newCollection.format }));
      toast.success('Collection created!');
      handleCancelNewCollection();
    } catch (err) {
      toast.error(err?.message || 'An error occurred while creating the collection');
    }
  };

  const handleFolderClick = (folderUid) => {
    navigateIntoFolder(folderUid);
    setSearchText('');
  };

  const handleBreadcrumbNavigate = useCallback((index) => {
    navigateToBreadcrumb(index);
    setSearchText('');
  }, [navigateToBreadcrumb]);

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
                    <FolderBreadcrumbs
                      collectionName={(selectedTargetCollection || collection).name}
                      breadcrumbs={breadcrumbs}
                      isAtRoot={isAtRoot}
                      onNavigateToRoot={navigateToRoot}
                      onNavigateToBreadcrumb={handleBreadcrumbNavigate}
                    />
                  </>
                )}
              </div>
            )}

            {isSelectingCollection ? (
              <div className="collection-list">
                {availableCollections.length > 0 || newCollection.show ? (
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
                    {newCollection.show && (
                      <li className="new-collection-item">
                        <div className="new-collection-field">
                          <label className="new-collection-label">
                            Collection name
                          </label>
                          <input
                            ref={newCollectionInputRef}
                            type="text"
                            className="new-collection-input"
                            placeholder="Enter collection name"
                            value={newCollection.name}
                            onChange={(e) => setNewCollection((prev) => ({ ...prev, name: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCreateNewCollection();
                              } else if (e.key === 'Escape') {
                                e.stopPropagation();
                                handleCancelNewCollection();
                              }
                            }}
                          />
                        </div>

                        <div className="new-collection-field">
                          <label className="new-collection-label flex items-center">
                            Location
                            <Help width={250} placement="top">
                              <p>
                                Bruno stores your collections on your computer's filesystem.
                              </p>
                              <p className="mt-2">
                                Choose the location where you want to store this collection.
                              </p>
                            </Help>
                          </label>
                          <div className="new-collection-location-row">
                            <input
                              type="text"
                              className="new-collection-input cursor-pointer"
                              placeholder="Select location"
                              value={newCollection.location}
                              readOnly
                              onClick={handleBrowseCollectionLocation}
                            />
                            <button
                              type="button"
                              className="new-collection-browse-btn"
                              onClick={handleBrowseCollectionLocation}
                            >
                              Browse
                            </button>
                          </div>
                        </div>

                        <div className="new-collection-field">
                          <label className="new-collection-label flex items-center">
                            File Format
                            <Help width={300} placement="top">
                              <p>
                                Choose the file format for storing requests in this collection.
                              </p>
                              <p className="mt-2">
                                <strong>OpenCollection (YAML):</strong> Industry-standard YAML format (.yml files)
                              </p>
                              <p className="mt-1">
                                <strong>BRU:</strong> Bruno's native file format (.bru files)
                              </p>
                            </Help>
                          </label>
                          <select
                            className="new-collection-select"
                            value={newCollection.format}
                            onChange={(e) => setNewCollection((prev) => ({ ...prev, format: e.target.value }))}
                          >
                            <option value="yml">OpenCollection (YAML)</option>
                            <option value="bru">BRU Format (.bru)</option>
                          </select>
                        </div>

                        <div className="new-collection-actions-footer">
                          <Button
                            type="button"
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelNewCollection}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            color="primary"
                            size="sm"
                            onClick={handleCreateNewCollection}
                          >
                            Save
                          </Button>
                        </div>
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="collection-empty-state">
                    <p>No collections Yet</p>
                    <p className="collection-empty-state-subtitle">Collections help you organize your requests. Create your first one to save this request.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!isScratchCollection && (selectedTargetCollection || collection) && (
                  <div className="collection-name">
                    <FolderBreadcrumbs
                      collectionName={(selectedTargetCollection || collection).name}
                      breadcrumbs={breadcrumbs}
                      isAtRoot={isAtRoot}
                      onNavigateToRoot={navigateToRoot}
                      onNavigateToBreadcrumb={handleBreadcrumbNavigate}
                    />
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
                              <div className="flex items-center justify-between">
                                <label className="new-folder-filesystem-label flex items-center font-medium">
                                  Folder Name <small className="font-normal text-muted ml-1">(on filesystem)</small>
                                  <Help width={300} placement="top">
                                    <p>
                                      You can choose to save the folder as a different name on your file system versus what is displayed in the app.
                                    </p>
                                  </Help>
                                </label>
                                {isEditingFolderFilename ? (
                                  <IconArrowBackUp
                                    className="cursor-pointer opacity-50 hover:opacity-80"
                                    size={16}
                                    strokeWidth={1.5}
                                    onClick={() => setIsEditingFolderFilename(false)}
                                  />
                                ) : (
                                  <IconEdit
                                    className="cursor-pointer opacity-50 hover:opacity-80"
                                    size={16}
                                    strokeWidth={1.5}
                                    onClick={() => setIsEditingFolderFilename(true)}
                                  />
                                )}
                              </div>
                              {isEditingFolderFilename ? (
                                <div className="relative flex flex-row gap-1 items-center justify-between">
                                  <input
                                    type="text"
                                    className="block textbox mt-2 w-full"
                                    placeholder="Folder Name"
                                    value={newFolderDirectoryName}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                    onChange={(e) => setNewFolderDirectoryName(e.target.value)}
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
                              ) : (
                                <div className="relative flex flex-row gap-1 items-center justify-between">
                                  <PathDisplay
                                    iconType="folder"
                                    baseName={newFolderDirectoryName}
                                  />
                                </div>
                              )}
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
            {isSelectingCollection && !newCollection.show && (
              <Button
                type="button"
                color="primary"
                variant="ghost"
                icon={<IconFolder size={16} strokeWidth={1.5} />}
                onClick={handleShowNewCollection}
              >
                New collection
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
