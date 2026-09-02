import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  saveRequest,
  saveMultipleRequests,
  saveMultipleCollections,
  saveMultipleFolders,
  removeCollection
} from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection, deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { findCollectionByUid, getCollectionDrafts } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

const ConfirmCollectionCloseDrafts = ({ onClose, collectionUids }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector((state) => state.collections.collections || []);

  const targetUids = useMemo(() => {
    return collectionUids || [];
  }, [collectionUids]);

  const activeCollections = useMemo(() => {
    return targetUids.map((uid) => findCollectionByUid(allCollections, uid)).filter(Boolean);
  }, [allCollections, targetUids]);

  const {
    requestDrafts: currentRequestDrafts,
    transientDrafts: currentTransientDrafts,
    folderDrafts: currentFolderDrafts,
    collectionDrafts: currentCollectionDrafts
  } = useMemo(() => getCollectionDrafts(activeCollections), [activeCollections]);

  const allDraftsCount = currentRequestDrafts.length + currentTransientDrafts.length + currentFolderDrafts.length + currentCollectionDrafts.length;

  const handleRemoveCollections = async () => {
    let removedCount = 0;
    for (const c of activeCollections) {
      try {
        await dispatch(removeCollection(c.uid));
        removedCount++;
      } catch (error) {
        console.error(`Error closing collection ${c.name}:`, error);
        toast.error(error?.message || `Error removing collection ${c.name}`);
      }
    }

    if (removedCount > 0) {
      toast.success(`${removedCount} ${pluralizeWord('Collection', removedCount)} removed from workspace`);
    }

    if (removedCount === activeCollections.length) {
      dispatch(clearSidebarSelection());
      onClose();
    }
  };

  const handleSaveAll = async () => {
    if (currentTransientDrafts.length > 0) {
      toast.error('Please save or discard transient requests first');
      return;
    }

    try {
      const savePromises = [];
      if (currentCollectionDrafts.length > 0) savePromises.push(dispatch(saveMultipleCollections(currentCollectionDrafts)));
      if (currentFolderDrafts.length > 0) savePromises.push(dispatch(saveMultipleFolders(currentFolderDrafts)));
      if (currentRequestDrafts.length > 0) savePromises.push(dispatch(saveMultipleRequests(currentRequestDrafts)));

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      await handleRemoveCollections();
    } catch (err) {
      toast.error('Failed to save drafts!');
    }
  };

  const handleDiscardAll = () => {
    const allRequestDrafts = [...currentRequestDrafts, ...currentTransientDrafts];
    allRequestDrafts.forEach((draft) => {
      dispatch(deleteRequestDraft({
        collectionUid: draft.collectionUid,
        itemUid: draft.uid
      }));
    });

    // Folder and collection drafts are simply discarded by removing the collection
    handleRemoveCollections();
  };

  const handleSaveTransient = (draft) => {
    dispatch(saveRequest(draft.uid, draft.collectionUid));
  };

  if (allDraftsCount === 0) {
    return null;
  }

  const otherDraftsCount = currentFolderDrafts.length + currentCollectionDrafts.length;

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={`Remove ${pluralizeWord('Collection', activeCollections.length)}`}
        confirmText="Save and Remove"
        cancelText="Remove without saving"
        handleCancel={onClose}
        disableEscapeKey={true}
        disableCloseOnOutsideClick={true}
        closeModalFadeTimeout={150}
        hideFooter={true}
      >
        <div className="flex items-center">
          <IconAlertTriangle size={32} strokeWidth={1.5} className="warning-text" />
          <h1 className="ml-2 text-lg font-medium">Hold on..</h1>
        </div>
        <p className="mt-4">
          You have unsaved changes in <span className="font-medium">{allDraftsCount}</span>{' '}
          {pluralizeWord('item', allDraftsCount)}.
        </p>

        {/* Regular (saved) requests with changes */}
        {currentRequestDrafts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              Saved {pluralizeWord('Request', currentRequestDrafts.length)} ({currentRequestDrafts.length})
            </p>
            <ul className="ml-2">
              {currentRequestDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => {
                return (
                  <li key={item.uid} className="mt-1 text-xs draft-list-item">
                    • {item.filename || item.name}
                  </li>
                );
              })}
            </ul>
            {currentRequestDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
              <p className="ml-2 mt-1 text-xs draft-list-item">
                ...{currentRequestDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
                {pluralizeWord('request', currentRequestDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
              </p>
            )}
          </div>
        )}

        {/* Other Drafts (Folders / Collections) */}
        {otherDraftsCount > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              Other Changes ({otherDraftsCount})
            </p>
            <p className="ml-2 text-xs text-muted">
              {currentFolderDrafts.length > 0 && `${currentFolderDrafts.length} ${pluralizeWord('folder', currentFolderDrafts.length)}`}
              {currentFolderDrafts.length > 0 && currentCollectionDrafts.length > 0 && ' and '}
              {currentCollectionDrafts.length > 0 && `${currentCollectionDrafts.length} ${pluralizeWord('collection', currentCollectionDrafts.length)}`}
              {' '}with unsaved changes will also be saved.
            </p>
          </div>
        )}

        {/* Transient (unsaved) requests */}
        {currentTransientDrafts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              Transient {pluralizeWord('Request', currentTransientDrafts.length)} ({currentTransientDrafts.length})
            </p>
            <p className="text-xs transient-hint mb-3">
              These requests need to be saved individually before closing the collection.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {currentTransientDrafts.map((item) => {
                return (
                  <div
                    key={item.uid}
                    className="flex items-center justify-between py-2 px-3 transient-item"
                  >
                    <span className="text-sm transient-item-name truncate mr-3">{item.name}</span>
                    <Button
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveTransient(item)}
                      icon={<IconDeviceFloppy size={14} strokeWidth={1.5} />}
                    >
                      Save
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <div>
            <Button color="danger" onClick={handleDiscardAll}>
              Discard All and Remove
            </Button>
          </div>
          <div>
            <Button className="mr-2" color="secondary" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={currentTransientDrafts.length > 0}
              title={currentTransientDrafts.length > 0 ? 'Please save or discard transient requests first' : ''}
            >
              {allDraftsCount > 1 ? 'Save All and Remove' : 'Save and Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ConfirmCollectionCloseDrafts;
