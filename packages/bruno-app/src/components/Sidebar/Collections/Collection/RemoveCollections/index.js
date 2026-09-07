import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, getCollectionDrafts } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import Portal from 'ui/Portal';

const RemoveCollections = ({ onClose, collectionUid, collectionUids }) => {
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
    const { requestDrafts, transientDrafts, folderDrafts, collectionDrafts } = getCollectionDrafts(collections);
    return [...requestDrafts, ...transientDrafts, ...collectionDrafts, ...folderDrafts];
  }, [collections]);

  const onConfirm = () => {
    if (!collections.length) {
      toast.error('Collection not found');
      onClose();
      return;
    }

    const removalPromises = collections.map((collection) => dispatch(removeCollection(collection.uid)));

    Promise.allSettled(removalPromises).then((results) => {
      const failedCollections = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedCollections.push(collections[index]);
          console.error(`Error closing collection ${collections[index].name}:`, result.reason);
        }
      });

      if (failedCollections.length === 0) {
        toast.success(`${pluralizeWord('Collection', collections.length)} removed from workspace`);
        dispatch(clearSidebarSelection());
        onClose();
      } else {
        const failedNames = failedCollections.map((c) => c.name).join(', ');
        toast.error(`Failed to remove: ${failedNames}`);
      }
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
      <Portal>
        <Modal
          size="sm"
          title={`Remove ${pluralizeWord('Collection', collections.length)}`}
          confirmText={isMultiple ? 'Remove All' : 'Remove'}
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
              <div key={c.uid} className="collection-info-card">
                <div className="collection-name">{c.name}</div>
                <div className="collection-path">{c.pathname}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted text-sm">
            {isMultiple ? 'They' : 'It'} will still be available in the filesystem at the above location and can be re-opened later.
          </p>
        </Modal>
      </Portal>
    </StyledWrapper>
  );
};

export default RemoveCollections;
