import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections/index';
import filter from 'lodash/filter';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';

const RemoveCollection = ({ onClose, collectionUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const [deleteFromDisk, setDeleteFromDisk] = useState(false);

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
    dispatch(removeCollection(collection.uid, deleteFromDisk))
      .then(() => {
        toast.success(deleteFromDisk ? 'Collection deleted' : 'Collection removed from workspace');
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
        confirmText={deleteFromDisk ? 'Delete' : 'Remove'}
        confirmButtonColor="danger"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="mb-4">Are you sure you want to close following collection in Bruno?</p>
        <div className="collection-info-card">
          <div className="collection-name">{collection.name}</div>
          <div className="collection-path">{collection.pathname}</div>
        </div>

        <div className="delete-checkbox-container mt-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={deleteFromDisk}
              onChange={(e) => setDeleteFromDisk(e.target.checked)}
            />
            <span className="ml-2">Also delete collection from filesystem</span>
          </label>
        </div>

        {deleteFromDisk ? (
          <div className="delete-warning mt-3">
            <IconAlertTriangle size={16} strokeWidth={1.5} />
            <span>This action is permanent and cannot be undone. The collection folder and all its contents will be deleted from your filesystem.</span>
          </div>
        ) : (
          <p className="mt-4 text-muted text-sm">
            It will still be available in the filesystem at the above location and can be re-opened later.
          </p>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default RemoveCollection;
