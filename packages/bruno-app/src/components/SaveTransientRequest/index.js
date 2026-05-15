import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import path, { normalizePath } from 'utils/common/path';
import { transformRequestToSaveToFilesystem, findCollectionByUid, findItemInCollection, areItemsLoading } from 'utils/collections';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import { itemSchema } from '@usebruno/schema';
import { uuid } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import get from 'lodash/get';
import { useTranslation } from 'react-i18next';

const SaveTransientRequest = ({ item: itemProp, collection: collectionProp, isOpen = false, onClose }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

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
    : (activeWorkspace?.pathname ? path.join(activeWorkspace.pathname, 'collections') : '');

  const availableCollections = useMemo(() => {
    if (!isScratchCollection || !activeWorkspace) return [];

    return (activeWorkspace.collections || []).map((wc) => {
      const fullCollection = allCollections.find((c) => normalizePath(c.pathname) === normalizePath(wc.path));
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

  // State for new collection creation
  const [newCollection, setNewCollection] = useState({ show: false, name: '', location: '', format: DEFAULT_COLLECTION_FORMAT });

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
        toast.error(t('SAVE_REQUEST.REQUEST_NAME_REQUIRED'));
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

      toast.success(t('SAVE_REQUEST.REQUEST_SAVED_SUCCESS'));
      handleClose();
    } catch (err) {
      toast.error(formatIpcError(err) || t('SAVE_REQUEST.REQUEST_SAVE_ERROR'));
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
      toast.error(t('SAVE_REQUEST.FOLDER_NAME_REQUIRED'));
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
      toast.success(t('SAVE_REQUEST.NEW_FOLDER_CREATED'));

      setPendingFolderNavigation(directoryName);
      handleCancelNewFolder();
    } catch (err) {
      const errorMessage = err?.message || t('SAVE_REQUEST.FOLDER_ADD_ERROR');
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
      toast.error(t('SAVE_REQUEST.COLLECTION_NAME_REQUIRED'));
      return;
    }
    if (!validateName(trimmedName)) {
      toast.error(validateNameError(trimmedName));
      return;
    }
    if (!newCollection.location) {
      toast.error(t('SAVE_REQUEST.LOCATION_REQUIRED'));
      return;
    }
    try {
      await dispatch(createCollection(trimmedName, sanitizeName(trimmedName), newCollection.location, { format: newCollection.format }));
      toast.success(t('SAVE_REQUEST.COLLECTION_CREATED'));
      handleCancelNewCollection();
    } catch (err) {
      toast.error(err?.message || t('SAVE_REQUEST.COLLECTION_CREATE_ERROR'));
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
        size="sm"
        title={isSelectingCollection ? t('SAVE_REQUEST.SELECT_COLLECTION') : t('SAVE_REQUEST.TITLE')}
        handleCancel={handleCancel}
        handleConfirm={handleConfirm}
        confirmText={t('COMMON.SAVE')}
        cancelText={t('COMMON.CANCEL')}
        hideFooter={true}
      >
        <div className="save-request-form">
          <div className="form-section">
            <label htmlFor="request-name" className="form-label">
              {t('SAVE_REQUEST.REQUEST_NAME')}
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
              {isSelectingCollection ? t('SAVE_REQUEST.SELECT_COLLECTION_TO_SAVE') : t('SAVE_REQUEST.SAVE_TO_COLLECTIONS')}
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
                  {t('SAVE_REQUEST.COLLECTIONS')}
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
                            {t('SAVE_REQUEST.COLLECTION_NAME')}
                          </label>
                          <input
                            ref={(node) => node?.focus()}
                            type="text"
                            className="new-collection-input"
                            placeholder={t('SAVE_REQUEST.ENTER_COLLECTION_NAME')}
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
                            {t('SAVE_REQUEST.LOCATION')}
                            <Help width={250} placement="top">
                              <p>
                                {t('SAVE_REQUEST.BRUNO_STORES_DESC')}
                              </p>
                              <p className="mt-2">
                                {t('SAVE_REQUEST.CHOOSE_LOCATION_DESC')}
                              </p>
                            </Help>
                          </label>
                          <div className="new-collection-location-row">
                            <input
                              type="text"
                              className="new-collection-input cursor-pointer"
                              placeholder={t('SAVE_REQUEST.SELECT_LOCATION')}
                              value={newCollection.location}
                              readOnly
                              onClick={handleBrowseCollectionLocation}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              color="secondary"
                              size="sm"
                              rounded="sm"
                              onClick={handleBrowseCollectionLocation}
                            >
                              {t('SAVE_REQUEST.BROWSE')}
                            </Button>
                          </div>
                        </div>

                        <div className="new-collection-field">
                          <label className="new-collection-label flex items-center">
                            {t('SAVE_REQUEST.FILE_FORMAT')}
                            <Help width={300} placement="top">
                              <p>
                                {t('DIALOG.FILE_FORMAT_DESC')}
                              </p>
                              <p className="mt-2">
                                <strong>{t('IMPORT.FILE_FORMAT_YAML')}:</strong> {t('IMPORT.FILE_FORMAT_YAML_DESC')}
                              </p>
                              <p className="mt-1">
                                <strong>{t('IMPORT.FILE_FORMAT_BRU')}:</strong> {t('IMPORT.FILE_FORMAT_BRU_DESC')}
                              </p>
                            </Help>
                          </label>
                          <select
                            className="new-collection-select"
                            value={newCollection.format}
                            onChange={(e) => setNewCollection((prev) => ({ ...prev, format: e.target.value }))}
                          >
                            <option value="yml">{t('IMPORT.FILE_FORMAT_YAML')}</option>
                            <option value="bru">{t('IMPORT.FILE_FORMAT_BRU')}</option>
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
                            {t('COMMON.CANCEL')}
                          </Button>
                          <Button
                            type="button"
                            color="primary"
                            size="sm"
                            onClick={handleCreateNewCollection}
                          >
                            {t('COMMON.SAVE')}
                          </Button>
                        </div>
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="collection-empty-state">
                    <p>{t('SAVE_REQUEST.NO_COLLECTIONS_YET')}</p>
                    <p className="collection-empty-state-subtitle">{t('SAVE_REQUEST.NO_COLLECTIONS_DESC')}</p>
                    <Button
                      type="button"
                      color="primary"
                      variant="outline"
                      icon={<IconFolder size={16} strokeWidth={1.5} />}
                      onClick={handleShowNewCollection}
                      className="mt-4"
                    >
                      {t('SAVE_REQUEST.NEW_COLLECTION')}
                    </Button>
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
                    placeholder={t('SAVE_REQUEST.SEARCH_FOLDER')}
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
                              {showFilesystemName ? t('SAVE_REQUEST.NEW_FOLDER_NAME_BRUNO') : t('SAVE_REQUEST.NEW_FOLDER_NAME')}
                            </label>
                          </div>
                          <div className="new-folder-input-row">
                            <input
                              ref={(node) => node?.focus()}
                              type="text"
                              className="new-folder-input"
                              placeholder={t('SAVE_REQUEST.UNTITLED_FOLDER')}
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
                                title={t('COMMON.CANCEL')}
                              >
                                <IconX size={16} strokeWidth={1.5} />
                              </button>
                              <button
                                type="button"
                                className="new-folder-action-btn"
                                onClick={handleCreateNewFolder}
                                title={t('SAVE_REQUEST.NEW_FOLDER')}
                              >
                                <IconCheck size={16} strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>

                          {showFilesystemName && (
                            <div className="new-folder-filesystem-wrapper">
                              <div className="flex items-center justify-between">
                                <label className="new-folder-filesystem-label flex items-center font-medium">
                                  {t('SAVE_REQUEST.FOLDER_NAME_FILESYSTEM')}
                                  <Help width={300} placement="top">
                                    <p>
                                      {t('SAVE_REQUEST.FOLDER_NAME_DIFFERENT_DESC')}
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
                                    placeholder={t('SAVE_REQUEST.FOLDER_NAME')}
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
                                <span>{t('SAVE_REQUEST.HIDE_FILESYSTEM_NAME')}</span>
                              </>
                            ) : (
                              <>
                                <IconEye size={16} strokeWidth={1.5} />
                                <span>{t('SAVE_REQUEST.SHOW_FILESYSTEM_NAME')}</span>
                              </>
                            )}
                          </button>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <div className="folder-empty-state">
                      {searchText.trim() ? t('SAVE_REQUEST.NO_FOLDERS_FOUND') : t('SAVE_REQUEST.NO_FOLDERS_AVAILABLE')}
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
                {t('SAVE_REQUEST.NEW_FOLDER')}
              </Button>
            )}
            {isSelectingCollection && !newCollection.show && availableCollections.length > 0 && (
              <Button
                type="button"
                color="primary"
                variant="ghost"
                icon={<IconFolder size={16} strokeWidth={1.5} />}
                onClick={handleShowNewCollection}
              >
                {t('SAVE_REQUEST.NEW_COLLECTION')}
              </Button>
            )}
          </div>
          <div className="footer-right">
            <Button type="button" color="secondary" variant="ghost" onClick={handleCancel}>
              {t('COMMON.CANCEL')}
            </Button>
            {!isSelectingCollection && (
              <Button type="button" color="primary" onClick={handleConfirm}>
                {t('COMMON.SAVE')}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default SaveTransientRequest;
