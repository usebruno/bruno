import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { deleteItem, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { recursivelyGetAllItemUids, isItemAFolder, isItemARequest } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';

const DeleteCollectionItems = ({ entries, onClose }) => {
  const dispatch = useDispatch();

  if (!entries.length) {
    return null;
  }

  const folderCount = entries.filter((entry) => isItemAFolder(entry.item)).length;
  const requestCount = entries.filter((entry) => isItemARequest(entry.item)).length;

  const description = entries.length === 1 ? (
    <span className="font-medium">{entries[0].item.name}</span>
  ) : (
    [
      folderCount > 0 ? `${folderCount} ${pluralizeWord('folder', folderCount)}` : null,
      requestCount > 0 ? `${requestCount} ${pluralizeWord('request', requestCount)}` : null
    ]
      .filter(Boolean)
      .join(' and ')
  );

  const title = folderCount > 0 && requestCount > 0
    ? 'Delete Items'
    : folderCount > 0
      ? `Delete ${pluralizeWord('Folder', folderCount)}`
      : `Delete ${pluralizeWord('Request', requestCount)}`;

  const onConfirm = async () => {
    try {
      for (const entry of entries) {
        await dispatch(deleteItem(entry.uid, entry.collectionUid));
        const tabUids = isItemAFolder(entry.item)
          ? [...recursivelyGetAllItemUids(entry.item.items), entry.uid]
          : [entry.uid];
        dispatch(closeTabs({ tabUids }));
      }
    } catch (error) {
      console.error('Error deleting items', error);
      toast.error(error?.message || 'Error deleting items');
    } finally {
      dispatch(clearSidebarSelection());
      onClose();
    }
  };

  return (
    <Modal
      size="md"
      title={title}
      confirmText="Delete"
      confirmButtonColor="danger"
      handleConfirm={onConfirm}
      handleCancel={onClose}
    >
      Are you sure you want to delete {description}?
    </Modal>
  );
};

export default DeleteCollectionItems;
