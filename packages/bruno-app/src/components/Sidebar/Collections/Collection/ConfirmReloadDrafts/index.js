import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  saveRequest,
  saveMultipleRequests,
  saveMultipleCollections,
  saveMultipleFolders,
  reloadCollection
} from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { findCollectionByUid, getCollectionDrafts } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const MAX_UNSAVED_REQUESTS_TO_SHOW = 5;

const ConfirmReloadDrafts = ({ onClose, collectionUid }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector((state) => state.collections.collections || []);

  const collection = useMemo(() => findCollectionByUid(allCollections, collectionUid), [allCollections, collectionUid]);

  const {
    requestDrafts: currentRequestDrafts,
    transientDrafts: currentTransientDrafts,
    folderDrafts: currentFolderDrafts,
    collectionDrafts: currentCollectionDrafts
  } = useMemo(() => (collection ? getCollectionDrafts([collection]) : {
    requestDrafts: [],
    transientDrafts: [],
    folderDrafts: [],
    collectionDrafts: []
  }), [collection]);

  const allDraftsCount = currentRequestDrafts.length + currentTransientDrafts.length + currentFolderDrafts.length + currentCollectionDrafts.length;

  const handleReload = () => {
    dispatch(reloadCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    })).catch((error) => {
      console.error('Error reloading the collection', error);
      toast.error(error?.message || 'Error reloading the collection');
    });
    onClose();
  };

  const handleSaveAllAndReload = async () => {
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

      handleReload();
    } catch (err) {
      toast.error('Failed to save drafts!');
    }
  };

  const handleDiscardAndReload = () => {
    const allRequestDrafts = [...currentRequestDrafts, ...currentTransientDrafts];
    allRequestDrafts.forEach((draft) => {
      dispatch(deleteRequestDraft({
        collectionUid: draft.collectionUid,
        itemUid: draft.uid
      }));
    });

    handleReload();
  };

  const handleSaveTransient = (draft) => {
    dispatch(saveRequest(draft.uid, collectionUid));
  };

  const otherDraftsCount = currentFolderDrafts.length + currentCollectionDrafts.length;

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Reload Collection"
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
          {pluralizeWord('item', allDraftsCount)}. Reloading will re-read the collection from disk.
        </p>

        {currentRequestDrafts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              Saved {pluralizeWord('Request', currentRequestDrafts.length)} ({currentRequestDrafts.length})
            </p>
            <ul className="ml-2">
              {currentRequestDrafts.slice(0, MAX_UNSAVED_REQUESTS_TO_SHOW).map((item) => (
                <li key={item.uid} className="mt-1 text-xs draft-list-item">
                  • {item.filename || item.name}
                </li>
              ))}
            </ul>
            {currentRequestDrafts.length > MAX_UNSAVED_REQUESTS_TO_SHOW && (
              <p className="ml-2 mt-1 text-xs draft-list-item">
                ...{currentRequestDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW} additional{' '}
                {pluralizeWord('request', currentRequestDrafts.length - MAX_UNSAVED_REQUESTS_TO_SHOW)} not shown
              </p>
            )}
          </div>
        )}

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

        {currentTransientDrafts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">
              Transient {pluralizeWord('Request', currentTransientDrafts.length)} ({currentTransientDrafts.length})
            </p>
            <p className="text-xs transient-hint mb-3">
              These requests need to be saved individually before reloading.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {currentTransientDrafts.map((item) => (
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
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <div>
            <Button color="danger" onClick={handleDiscardAndReload}>
              Discard and Reload
            </Button>
          </div>
          <div>
            <Button className="mr-2" color="secondary" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAllAndReload}
              disabled={currentTransientDrafts.length > 0}
              title={currentTransientDrafts.length > 0 ? 'Please save or discard transient requests first' : ''}
            >
              {allDraftsCount > 1 ? 'Save All and Reload' : 'Save and Reload'}
            </Button>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ConfirmReloadDrafts;
