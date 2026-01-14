import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import Button from 'ui/Button';
import { IconFolder, IconChevronRight, IconFolderPlus } from '@tabler/icons';
import filter from 'lodash/filter';
import NewFolder from 'components/Sidebar/NewFolder';
import Portal from 'components/Portal';
import StyledWrapper from './StyledWrapper';
import useCollectionFolderTree from 'hooks/useCollectionFolderTree';
import { closeSaveTransientRequestModal } from 'providers/ReduxStore/slices/collections';

const SaveTransientRequest = ({ modalId }) => {
  const dispatch = useDispatch();
  const modalState = useSelector((state) => state.collections.saveTransientRequestModals[modalId]);

  const item = modalState?.item;
  const collection = modalState?.collection;
  const isOpen = modalState?.isOpen || false;

  const handleClose = () => {
    dispatch(closeSaveTransientRequestModal({ modalId }));
  };
  const [requestName, setRequestName] = useState(item?.name || '');
  const [searchText, setSearchText] = useState('');
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);

  const {
    currentFolders,
    breadcrumbs,
    selectedFolderUid,
    setSelectedFolderUid,
    navigateIntoFolder,
    goBack,
    navigateToRoot,
    navigateToBreadcrumb,
    getCurrentParentFolder,
    reset,
    isAtRoot
  } = useCollectionFolderTree(collection?.uid);

  // Reset form when item changes or modal opens
  useEffect(() => {
    if (isOpen && item) {
      setRequestName(item.name || '');
      setSearchText('');
      reset();
    }
  }, [isOpen, item, reset]);

  // Filter folders based on search text
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

  const handleConfirm = () => {
    // TODO: Implement save logic
    // This should:
    // 1. Save the transient request to the selected folder (or root if no folder selected)
    // 2. Use the requestName for the saved request
    // 3. Delete the transient request from temp directory
    console.log('Save request:', { requestName, selectedFolderUid, item, collection });
    handleClose();
  };

  const handleNewFolder = () => {
    setNewFolderModalOpen(true);
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
          {/* Request Name Input */}
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
            />
          </div>

          {/* Save to Collections Section */}
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

            {/* Search Bar */}
            <div className="search-container">
              <SearchInput
                searchText={searchText}
                setSearchText={setSearchText}
                placeholder="Search for folder"

              />
            </div>

            {/* Folder List */}
            <div className="folder-list">
              {filteredFolders.length > 0 ? (
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
                </ul>
              ) : (
                <div className="folder-empty-state">
                  {searchText.trim() ? 'No folders found' : 'No folders available'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Footer */}
        <div className="custom-modal-footer">
          <div className="footer-left">
            <Button
              type="button"
              color="primary"
              variant="ghost"
              icon={<IconFolderPlus size={16} strokeWidth={1.5} />}
              onClick={handleNewFolder}
            >
              New Folder
            </Button>
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

      {/* New Folder Modal */}
      {newFolderModalOpen && (
        <Portal>
          <NewFolder
            collectionUid={collection?.uid}
            item={getCurrentParentFolder()}
            onClose={() => setNewFolderModalOpen(false)}
          />
        </Portal>
      )}
    </StyledWrapper>
  );
};

export default SaveTransientRequest;
