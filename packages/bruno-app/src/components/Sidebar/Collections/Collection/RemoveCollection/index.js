import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, isItemAFolder, hasRequestChanges } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import filter from 'lodash/filter';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';

const RemoveCollection = ({ onClose, collectionUid, collectionUids }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector((state) => state.collections.collections || []);

  const targetUids = useMemo(() => {
    return collectionUids || (collectionUid ? [collectionUid] : []);
  }, [collectionUid, collectionUids]);

  const collections = useMemo(() => {
    return targetUids
      .map((uid) => findCollectionByUid(allCollections, uid))
      .filter(Boolean);
  }, [allCollections, targetUids]);

  // Detect drafts in the collections
  const drafts = useMemo(() => {
    const requestDrafts = [];
    const collectionDrafts = [];
    const folderDrafts = [];

    collections.forEach((collection) => {
      if (collection.draft) {
        collectionDrafts.push(collection);
      }
      const items = flattenItems(collection.items);
      const unsavedRequests = filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
      requestDrafts.push(...unsavedRequests);

      const unsavedFolders = filter(items, (item) => isItemAFolder(item) && item.draft);
      folderDrafts.push(...unsavedFolders);
    });

    return [...requestDrafts, ...collectionDrafts, ...folderDrafts];
  }, [collections]);

  const onConfirm = () => {
    if (!collections.length) {
      toast.error('Collection not found');
      onClose();
      return;
    }

    const removalPromises = collections.map((collection) => dispatch(removeCollection(collection.uid)));

    Promise.all(removalPromises)
      .then(() => {
        toast.success(`${pluralizeWord('Collection', collections.length)} removed from workspace`);
      })
      .catch((error) => {
        console.error('Error closing collections:', error);
        toast.error('An error occurred while removing the collection(s)');
      })
      .finally(() => {
        if (collections.length > 1) {
          dispatch(clearSidebarSelection());
        }
        onClose();
      });
  };

  if (!collections.length) {
    return <div>Collection not found</div>;
  }

  // If there are drafts, show the draft confirmation modal
  if (drafts.length > 0) {
    return <ConfirmCollectionCloseDrafts onClose={onClose} collectionUids={targetUids} />;
  }

  const isMultiple = collections.length > 1;

  // Otherwise, show the standard remove confirmation modal
  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={`Remove ${pluralizeWord('Collection', collections.length)}`}
        confirmText="Remove"
        confirmButtonColor="danger"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="mb-4">
          {isMultiple
            ? `Are you sure you want to close all ${collections.length} collections from this workspace?`
            : 'Are you sure you want to close the following collection in Bruno?'}
        </p>

        <div className="collections-list-container">
          {collections.map((c) => (
            <div className="collection-info-card">
              <div className="collection-name">{c.name}</div>
              <div className="collection-path">{c.pathname}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-muted text-sm">
          {isMultiple ? 'They' : 'It'} will still be available in the filesystem at the above location and can be re-opened later.
        </p>
      </Modal>
    </StyledWrapper>
  );
};

export default RemoveCollection;
