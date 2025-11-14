import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { filter, groupBy } from 'lodash';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import { removeCollection, saveMultipleRequests, saveMultipleCollections, saveMultipleFolders } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, isItemAFolder, hasRequestChanges } from 'utils/collections/index';
import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const INITIAL_COLLECTIONS_TO_SHOW = 4;

const RemoveCollectionsModal = ({ collectionUids, onClose }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector((state) => state.collections.collections || []);
  const [showAllCollections, setShowAllCollections] = useState(false);

  const allDrafts = useMemo(() => {
    const requestDrafts = [];
    const collectionDrafts = [];
    const folderDrafts = [];

    collectionUids.forEach((collectionUid) => {
      const collection = findCollectionByUid(allCollections, collectionUid);
      if (collection) {
        // Check for collection draft
        if (collection.draft) {
          collectionDrafts.push({
            name: collection.name,
            collectionUid: collectionUid
          });
        }

        // Check for request and folder drafts
        const items = flattenItems(collection.items);

        // Request drafts
        const unsavedRequests = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
        unsavedRequests.forEach((request) => {
          requestDrafts.push({
            ...request,
            collectionUid: collectionUid
          });
        });

        // Folder drafts
        const unsavedFolders = filter(items, (item) => isItemAFolder(item) && item.draft);
        unsavedFolders.forEach((folder) => {
          folderDrafts.push({
            name: folder.name,
            folderUid: folder.uid,
            collectionUid: collectionUid
          });
        });
      }
    });

    return { requestDrafts, collectionDrafts, folderDrafts };
  }, [collectionUids, allCollections]);

  const collectionsWithUnsavedChanges = useMemo(() => {
    const allDraftTypes = [
      ...allDrafts.collectionDrafts,
      ...allDrafts.folderDrafts,
      ...allDrafts.requestDrafts
    ];
    const draftsByCollection = groupBy(allDraftTypes, 'collectionUid');
    return Object.keys(draftsByCollection)
      .map((collectionUid) => findCollectionByUid(allCollections, collectionUid)?.name)
      .filter(Boolean);
  }, [allDrafts, allCollections]);

  const hasUnsavedChanges = allDrafts.collectionDrafts.length > 0
    || allDrafts.folderDrafts.length > 0
    || allDrafts.requestDrafts.length > 0;

  const handleCloseAllCollections = () => {
    const removalPromises = collectionUids.map((uid) => dispatch(removeCollection(uid)));

    Promise.all(removalPromises)
      .then(() => {
        toast.success('Closed all collections');
      })
      .catch((error) => {
        console.error('Error closing collections:', error);
        toast.error('An error occurred while closing collections');
      })
      .finally(() => {
        onClose();
      });
  };

  const handleDiscard = () => {
    handleCloseAllCollections();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleSave = async () => {
    try {
      const savePromises = [];

      // Save all collection drafts
      if (allDrafts.collectionDrafts.length > 0) {
        savePromises.push(dispatch(saveMultipleCollections(allDrafts.collectionDrafts)));
      }

      // Save all folder drafts
      if (allDrafts.folderDrafts.length > 0) {
        savePromises.push(dispatch(saveMultipleFolders(allDrafts.folderDrafts)));
      }

      // Save all request drafts
      if (allDrafts.requestDrafts.length > 0) {
        savePromises.push(dispatch(saveMultipleRequests(allDrafts.requestDrafts)));
      }

      // Await all saving operations to complete in parallel, then proceed to close all collections.
      await Promise.all(savePromises);
      handleCloseAllCollections();
    } catch (error) {
      console.error('Error saving drafts:', error);
      toast.error('An error occurred while saving changes');
      handleCancel();
    }
  };

  if (collectionUids.length === 0) {
    return null;
  }

  const hasMultipleCollections = collectionUids.length > 1;
  const singleCollectionName = hasMultipleCollections ? null : findCollectionByUid(allCollections, collectionUids[0])?.name;

  return (
    <Portal>
      <Modal
        size="md"
        title="Close all collections"
        disableEscapeKey={hasUnsavedChanges}
        disableCloseOnOutsideClick={hasUnsavedChanges}
        handleCancel={handleCancel}
        hideFooter={true}
      >
        {hasUnsavedChanges ? (
          <>
            <div className="flex items-center font-normal">
              <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
              <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
            </div>
            <div className="font-normal mt-4">
              Do you want to save changes you made to the following{' '}
              {collectionsWithUnsavedChanges.length === 1 ? 'collection' : 'collections'}?
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Collections will still be available in the file system and can be re-opened later.
            </div>

            <StyledWrapper>
              {showAllCollections ? (
                <div className="mt-4 collections-list-container">
                  <div className="collections-list-scrollable">
                    <div className="collections-list">
                      {collectionsWithUnsavedChanges.map((collectionName) => (
                        <span key={collectionName} className="collection-tag">
                          {collectionName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="show-less-link w-fit flex items-center mt-2 cursor-pointer"
                    onClick={() => setShowAllCollections(false)}
                  >
                    <span className="text-sm text-link">Show less</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 collections-preview">
                    {collectionsWithUnsavedChanges.slice(0, INITIAL_COLLECTIONS_TO_SHOW).map((collectionName) => (
                      <span key={collectionName} className="collection-tag">
                        {collectionName}
                      </span>
                    ))}
                  </div>
                  {collectionsWithUnsavedChanges.length > INITIAL_COLLECTIONS_TO_SHOW && (
                    <div
                      className="show-more-link w-fit flex items-center mt-2 cursor-pointer"
                      onClick={() => setShowAllCollections(true)}
                    >
                      <span className="text-sm text-link">Show {collectionsWithUnsavedChanges.length - INITIAL_COLLECTIONS_TO_SHOW} more</span>
                    </div>
                  )}
                </>
              )}
            </StyledWrapper>

            <div className="flex justify-between mt-6">
              <div>
                <button className="btn btn-sm btn-danger" onClick={handleDiscard}>
                  Discard and Close
                </button>
              </div>
              <div>
                <button className="btn btn-close btn-sm mr-2" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleSave}>
                  Save and Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4">
              {hasMultipleCollections ? (
                `Are you sure you want to close all ${collectionUids.length} collections in Bruno?`
              ) : (
                <>
                  Are you sure you want to close the collection <strong>{singleCollectionName}</strong> in Bruno?
                </>
              )}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Collections will still be available in the file system and can be re-opened later.
            </div>
            <div className="flex justify-end mt-6">
              <button className="btn btn-close btn-sm mr-2" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleCloseAllCollections}>
                {hasMultipleCollections ? 'Close All' : 'Close'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </Portal>
  );
};

export default RemoveCollectionsModal;
