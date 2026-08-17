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
  const appCount = entries.filter((entry) => entry.item.type === 'app').length;

  const folderDescription = folderCount > 0 ? `${folderCount} ${pluralizeWord('folder', folderCount)}` : null;
  const requestDescription = requestCount > 0 ? `${requestCount} ${pluralizeWord('request', requestCount)}` : null;
  const appDescription = appCount > 0 ? `${appCount} ${pluralizeWord('app', appCount)}` : null;

  const types = [folderDescription, requestDescription, appDescription].filter(Boolean);
  const description = entries.length === 1 ? (
    <span className="font-medium">{entries[0].item.name}</span>
  ) : (
    types.length > 2
      ? `${types.slice(0, -1).join(', ')} and ${types[types.length - 1]}`
      : types.join(' and ')
  );

  let title;
  if (types.length > 1) {
    title = 'Delete Items';
  } else if (folderCount > 0) {
    title = `Delete ${pluralizeWord('Folder', folderCount)}`;
  } else if (appCount > 0) {
    title = `Delete ${pluralizeWord('App', appCount)}`;
  } else {
    title = `Delete ${pluralizeWord('Request', requestCount)}`;
  }

  const onConfirm = async () => {
    for (const entry of entries) {
      try {
        await dispatch(deleteItem(entry.uid, entry.collectionUid));
        const tabUids = isItemAFolder(entry.item)
          ? [...recursivelyGetAllItemUids(entry.item.items), entry.uid]
          : [entry.uid];
        dispatch(closeTabs({ tabUids }));
      } catch (error) {
        console.error(`Error deleting item ${entry.uid}`, error);
        toast.error(error?.message || `Error deleting ${entry.item?.name || 'item'}`);
      }
    }

    dispatch(clearSidebarSelection());
    onClose();
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
