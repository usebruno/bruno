import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { deleteItem, closeTabs, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection, deleteResponseExample } from 'providers/ReduxStore/slices/collections';
import { recursivelyGetAllItemUids, isItemAFolder, isItemARequest } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';

const DeleteCollectionItems = ({ entries, onClose }) => {
  const dispatch = useDispatch();

  if (!entries.length) {
    return null;
  }

  let folderCount = 0;
  let requestCount = 0;
  let appCount = 0;
  let exampleCount = 0;

  for (const entry of entries) {
    if (entry.type === 'example') exampleCount++;
    else if (isItemAFolder(entry.item)) folderCount++;
    else if (isItemARequest(entry.item)) requestCount++;
    else if (entry.item.type === 'app') appCount++;
  }

  const folderDescription = folderCount > 0 ? `${folderCount} ${pluralizeWord('folder', folderCount)}` : null;
  const requestDescription = requestCount > 0 ? `${requestCount} ${pluralizeWord('request', requestCount)}` : null;
  const appDescription = appCount > 0 ? `${appCount} ${pluralizeWord('app', appCount)}` : null;
  const exampleDescription = exampleCount > 0 ? `${exampleCount} ${pluralizeWord('example', exampleCount)}` : null;

  const types = [folderDescription, requestDescription, appDescription, exampleDescription].filter(Boolean);
  const description = entries.length === 1 ? (
    <span className="font-medium">{entries[0].type === 'example' ? entries[0].example.name : entries[0].item.name}</span>
  ) : (
    types.length > 2
      ? `${types.slice(0, -1).join(', ')} and ${types[types.length - 1]}`
      : types.join(' and ')
  );

  const getTitle = () => {
    if (types.length > 1) {
      return 'Delete Items';
    } else if (folderCount > 0) {
      return `Delete ${pluralizeWord('Folder', folderCount)}`;
    } else if (appCount > 0) {
      return `Delete ${pluralizeWord('App', appCount)}`;
    } else if (exampleCount > 0) {
      return `Delete ${pluralizeWord('Example', exampleCount)}`;
    }
    return `Delete ${pluralizeWord('Request', requestCount)}`;
  };

  const title = getTitle();

  const onConfirm = async () => {
    const parentItemsToSave = new Map(); // itemUid -> collectionUid

    for (const entry of entries) {
      try {
        if (entry.type === 'example') {
          dispatch(deleteResponseExample({ itemUid: entry.item.uid, collectionUid: entry.collectionUid, exampleUid: entry.uid }));
          dispatch(closeTabs({ tabUids: [entry.uid] }));
          parentItemsToSave.set(entry.item.uid, entry.collectionUid);
          continue;
        }

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

    for (const [itemUid, collectionUid] of parentItemsToSave) {
      try {
        await dispatch(saveRequest(itemUid, collectionUid, true));
      } catch (error) {
        console.error(`Error saving request ${itemUid} after deleting examples`, error);
        toast.error(error?.message || 'Error saving request after deleting examples');
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
      dataTestId="delete-collection-item-modal"
    >
      Are you sure you want to delete {description}?
    </Modal>
  );
};

export default DeleteCollectionItems;
