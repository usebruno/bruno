import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconFiles } from '@tabler/icons';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections/index';
import filter from 'lodash/filter';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';

const RemoveCollection = ({ onClose, collectionUid }) => {
  const dispatch = useDispatch();
  const collection = useSelector(state => findCollectionByUid(state.collections.collections, collectionUid));

  // Detect drafts in the collection
  const drafts = useMemo(() => {
    if (!collection) return [];
    const items = flattenItems(collection.items);
    return filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
  }, [collection]);

  const onConfirm = () => {
    dispatch(removeCollection(collection.uid))
      .then(() => {
        toast.success('Collection closed');
        onClose();
      })
      .catch(() => toast.error('An error occurred while closing the collection'));
  };

  // If there are drafts, show the draft confirmation modal
  if (drafts.length > 0) {
    return <ConfirmCollectionCloseDrafts onClose={onClose} collection={collection} collectionUid={collectionUid} />;
  }

  // Otherwise, show the standard close confirmation modal
  return (
    <Modal size="sm" title="Close Collection" confirmText="Close" handleConfirm={onConfirm} handleCancel={onClose}>
      <div className="flex items-center">
        <IconFiles size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-medium">{collection.name}</span>
      </div>
      <div className="break-words text-xs mt-1">{collection.pathname}</div>
      <div className="mt-4">
        Are you sure you want to close collection <span className="font-medium">{collection.name}</span> in Bruno?
      </div>
      <div className="mt-4">
        It will still be available in the file system at the above location and can be re-opened later.
      </div>
    </Modal>
  );
};

export default RemoveCollection;
