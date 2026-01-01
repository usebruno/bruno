import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertCircle } from '@tabler/icons';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections/index';
import filter from 'lodash/filter';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';

const RemoveCollection = ({ onClose, collectionUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  // Detect drafts in the collection
  const drafts = useMemo(() => {
    if (!collection) return [];
    const items = flattenItems(collection.items);
    return filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
  }, [collection]);

  const onConfirm = () => {
    if (!collection) {
      toast.error('Collection not found');
      onClose();
      return;
    }
    dispatch(removeCollection(collection.uid))
      .then(() => {
        toast.success('Collection removed from workspace');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the collection'));
  };

  if (!collection) {
    return <div>Collection not found</div>;
  }

  // If there are drafts, show the draft confirmation modal
  if (drafts.length > 0) {
    return <ConfirmCollectionCloseDrafts onClose={onClose} collection={collection} collectionUid={collectionUid} />;
  }

  const customHeader = (
    <div className="flex items-center gap-2" data-testid="close-collection-modal-title">
      <IconAlertCircle size={18} strokeWidth={1.5} className="text-red-500" />
      <span>Remove Collection</span>
    </div>
  );

  // Otherwise, show the standard remove confirmation modal
  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Remove Collection"
        customHeader={customHeader}
        confirmText="Remove"
        confirmButtonColor="warning"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="mb-4">Are you sure you want to close following collection in Bruno?</p>
        <div className="collection-info-card">
          <div className="collection-name">{collection.name}</div>
          <div className="collection-path">{collection.pathname}</div>
        </div>
        <p className="mt-4 text-muted text-sm">
          It will still be available in the filesystem at the above location and can be re-opened later.
        </p>
      </Modal>
    </StyledWrapper>
  );
};

export default RemoveCollection;
