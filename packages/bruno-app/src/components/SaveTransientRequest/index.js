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
import { removeSaveTransientRequestModal, deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { newFolder } from 'providers/ReduxStore/slices/collections/actions';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import { resolveRequestFilename } from 'utils/common/platform';
import { transformRequestToSaveToFilesystem, findCollectionByUid, findItemInCollection } from 'utils/collections';
import { itemSchema } from '@usebruno/schema';

const SaveTransientRequest = ({ item: itemProp, collection: collectionProp, isOpen = false, onClose }) => {
  const dispatch = useDispatch();

  const latestCollection = useSelector((state) =>
    collectionProp ? findCollectionByUid(state.collections.collections, collectionProp.uid) : null
  );
  const latestItem = latestCollection && itemProp ? findItemInCollection(latestCollection, itemProp.uid) : itemProp;

  const item = itemProp;
  const collection = collectionProp;

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    // Remove from Redux array
    dispatch(removeSaveTransientRequestModal({ itemUid: item.uid }));
  };
  const [requestName, setRequestName] = useState(item?.name || '');
  const [searchText, setSearchText] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDirectoryName, setNewFolderDirectoryName] = useState('');
  const [showFilesystemName, setShowFilesystemName] = useState(false);
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

  const resetForm = () => {
    setRequestName(item.name || '');
    setSearchText('');
    reset();
    setShowNewFolderInput(false);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
  };

  useEffect(() => {
    isOpen && item && resetForm();
  }, [isOpen, item]);

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
    resetForm();
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

      const format = collection.format || 'bru';
      const targetFilename = resolveRequestFilename(sanitizedFilename, format);

      await ipcRenderer.invoke('renderer:save-transient-request', {
        sourcePathname: item.pathname,
        targetDirname,
        targetFilename,
        request: transformedItem,
        format
      });

      dispatch(
        closeTabs({
          tabUids: [item.uid]
        })
      );

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
  };

  const handleCancelNewFolder = () => {
    setShowNewFolderInput(false);
    setNewFolderName('');
    setNewFolderDirectoryName('');
    setShowFilesystemName(false);
  };

  const handleNewFolderNameChange = (value) => {
    setNewFolderName(value);
    if (!showFilesystemName) {
      setNewFolderDirectoryName(sanitizeName(value));
    }
  };

  const handleDirectoryNameChange = (value) => {
    setNewFolderDirectoryName(value);
  };

  const handleCreateNewFolder = async () => {
    const directoryName = newFolderDirectoryName.trim() || sanitizeName(newFolderName.trim());
    const parentFolder = getCurrentParentFolder();

    try {
      await dispatch(newFolder(newFolderName.trim(), directoryName, collection?.uid, parentFolder?.uid));
      toast.success('New folder created!');
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
              <div
                className={`collection-name ${!isAtRoot ? 'collection-name-clickable' : ''}`}
                onClick={!isAtRoot ? navigateToRoot : undefined}
              >
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
                              <label className="new-folder-filesystem-label">Name on filesystem</label>
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
