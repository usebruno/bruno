import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import Button from 'ui/Button';
import { IconFolder, IconChevronRight, IconCheck, IconX, IconEye, IconEyeOff } from '@tabler/icons';
import filter from 'lodash/filter';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import useCollectionFolderTree from 'hooks/useCollectionFolderTree';
import { closeSaveTransientRequestModal, deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { newFolder } from 'providers/ReduxStore/slices/collections/actions';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import { resolveRequestFilename } from 'utils/common/platform';
import { transformRequestToSaveToFilesystem, findCollectionByUid, findItemInCollection } from 'utils/collections';
import { itemSchema } from '@usebruno/schema';

const SaveTransientRequest = ({ modalId }) => {
  const dispatch = useDispatch();
  const modalState = useSelector((state) => state.collections.saveTransientRequestModals[modalId]);

  const item = modalState?.item;
  const collection = modalState?.collection;
  const isOpen = modalState?.isOpen || false;

  const latestCollection = useSelector((state) =>
    collection ? findCollectionByUid(state.collections.collections, collection.uid) : null
  );
  const latestItem = latestCollection && item ? findItemInCollection(latestCollection, item.uid) : item;

  const handleClose = () => {
    dispatch(closeSaveTransientRequestModal({ modalId }));
  };
  const [requestName, setRequestName] = useState(item?.name || '');
  const [searchText, setSearchText] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDirectoryName, setNewFolderDirectoryName] = useState('');
  const [showFilesystemName, setShowFilesystemName] = useState(false);
  const [newFolderError, setNewFolderError] = useState('');
  const newFolderInputRef = useRef(null);

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
  } = useCollectionFolderTree(collection?.uid);

  useEffect(() => {
    if (isOpen && item) {
      setRequestName(item.name || '');
      setSearchText('');
      reset();
      setShowNewFolderInput(false);
      setNewFolderName('');
      setNewFolderDirectoryName('');
      setShowFilesystemName(false);
      setNewFolderError('');
    }
  }, [isOpen, item, reset]);

  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  const filteredFolders = useMemo(() => {
    if (!searchText.trim()) {
      return currentFolders;
    }
    const searchLower = searchText.toLowerCase();
    return filter(currentFolders, (folder) => folder.name.toLowerCase().includes(searchLower));
  }, [currentFolders, searchText]);

  const handleCancel = () => {
    setRequestName(item?.name || '');
    setSearchText('');
    reset();
    handleClose();
  };

  const handleConfirm = async () => {
    if (!item || !collection || !latestItem) {
      return;
    }

    try {
      const { ipcRenderer } = window;

      const selectedFolder = getCurrentSelectedFolder();
      const targetDirname = selectedFolder ? selectedFolder.pathname : collection.pathname;

      const itemToSave = latestItem.draft
        ? { ...latestItem, ...latestItem.draft }
        : { ...latestItem };
      itemToSave.name = requestName.trim();
      delete itemToSave.draft;

      const transformedItem = transformRequestToSaveToFilesystem(itemToSave);
      await itemSchema.validate(transformedItem);

      const sanitizedFilename = sanitizeName(requestName.trim());
      const format = collection.format || 'bru';
      const targetFilename = resolveRequestFilename(sanitizedFilename, format);

      await ipcRenderer.invoke('renderer:save-transient-request', {
        sourcePathname: item.pathname,
        targetDirname,
        targetFilename,
        request: transformedItem,
        format
      });

      dispatch(closeTabs({
        tabUids: [item.uid]
      }));

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
      toast.error(err?.message || 'Failed to save request');
      console.error('Error saving request:', err);
    }
  };

  const handleShowNewFolder = () => {
    setShowNewFolderInput(true);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
    setNewFolderError('');
  };

  const handleCancelNewFolder = () => {
    setShowNewFolderInput(false);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
    setNewFolderError('');
  };

  const handleNewFolderNameChange = (value) => {
    setNewFolderName(value);
    if (!showFilesystemName) {
      setNewFolderDirectoryName(sanitizeName(value));
    }
    setNewFolderError('');
  };

  const handleDirectoryNameChange = (value) => {
    setNewFolderDirectoryName(value);
    setNewFolderError('');
  };

  const validateNewFolder = () => {
    if (!newFolderName.trim()) {
      setNewFolderError('must be at least 1 character');
      return false;
    }

    const directoryName = newFolderDirectoryName.trim() || sanitizeName(newFolderName.trim());

    if (!directoryName) {
      setNewFolderError('must be at least 1 character');
      return false;
    }

    if (!validateName(directoryName)) {
      setNewFolderError(validateNameError(directoryName));
      return false;
    }

    const parentFolder = getCurrentParentFolder();
    if (!parentFolder && directoryName.toLowerCase().includes('environments')) {
      setNewFolderError('The folder name "environments" at the root of the collection is reserved in bruno');
      return false;
    }

    setNewFolderError('');
    return true;
  };

  const handleCreateNewFolder = async () => {
    if (!validateNewFolder()) {
      return;
    }

    const directoryName = newFolderDirectoryName.trim() || sanitizeName(newFolderName.trim());
    const parentFolder = getCurrentParentFolder();

    try {
      await dispatch(newFolder(newFolderName.trim(), directoryName, collection?.uid, parentFolder?.uid));
      toast.success('New folder created!');
      handleCancelNewFolder();
    } catch (err) {
      const errorMessage = err?.message || 'An error occurred while adding the folder';
      setNewFolderError(errorMessage);
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
        title="Save Request"
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
              autoFocus={true}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="collections-section">
            <div className="collections-label">Save to Collections</div>
            {collection && (
              <div className={`collection-name ${!isAtRoot ? 'collection-name-clickable' : ''}`} onClick={!isAtRoot ? navigateToRoot : undefined}>
                <span>{collection.name}</span>
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
                {isAtRoot && (
                  <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
                )}
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
                      <div className="new-folder-content">
                        <IconFolder size={16} strokeWidth={1.5} />
                        <div className="new-folder-inputs">
                          <div className="new-folder-name-input-wrapper">
                            {showFilesystemName && (
                              <label className="new-folder-name-label">New Folder name (in bruno)</label>
                            )}
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
                                    handleCreateNewFolder();
                                  } else if (e.key === 'Escape') {
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
                          </div>

                          {showFilesystemName && (
                            <div className="new-folder-filesystem-wrapper">
                              <label className="new-folder-filesystem-label">
                                Name on filesystem
                              </label>
                              <input
                                type="text"
                                className="new-folder-input"
                                value={newFolderDirectoryName}
                                onChange={(e) => handleDirectoryNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateNewFolder();
                                  }
                                }}
                              />
                            </div>
                          )}

                          {newFolderError && (
                            <div className="new-folder-error">{newFolderError}</div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="new-folder-toggle-filesystem-btn"
                        onClick={() => {
                          setShowFilesystemName(!showFilesystemName);
                          setNewFolderDirectoryName(sanitizeName(newFolderName));
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
          </div>
        </div>

        <div className="custom-modal-footer">
          <div className="footer-left">
            {!showNewFolderInput && (
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
            <Button type="button" color="primary" onClick={handleConfirm}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default SaveTransientRequest;
