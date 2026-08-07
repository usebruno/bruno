import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { deleteItem, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { recursivelyGetAllItemUids } from 'utils/collections/index';

const pluralize = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

const DeleteCollectionItems = ({ entries, onClose }) => {
  const dispatch = useDispatch();

  if (!entries.length) {
    return null;
  }

  const folderCount = entries.filter((entry) => entry.type === 'folder').length;
  const requestCount = entries.filter((entry) => entry.type === 'request').length;

  const description = entries.length === 1 ? (
    <span className="font-medium">{entries[0].item.name}</span>
  ) : (
    [
      folderCount > 0 ? pluralize(folderCount, 'folder') : null,
      requestCount > 0 ? pluralize(requestCount, 'request') : null
    ]
      .filter(Boolean)
      .join(' and ')
  );

  const title = entries.length === 1
    ? `Delete ${entries[0].type === 'folder' ? 'Folder' : 'Request'}`
    : folderCount > 0 && requestCount > 0
      ? 'Delete Items'
      : folderCount > 0
        ? 'Delete Folders'
        : 'Delete Requests';

  const onConfirm = () => {
    const deletions = entries.map((entry) =>
      dispatch(deleteItem(entry.uid, entry.collectionUid)).then(() => {
        const tabUids = entry.type === 'folder'
          ? [...recursivelyGetAllItemUids(entry.item.items), entry.uid]
          : [entry.uid];
        dispatch(closeTabs({ tabUids }));
      })
    );

    Promise.all(deletions)
      .catch((error) => {
        console.error('Error deleting items', error);
        toast.error(error?.message || 'Error deleting items');
      })
      .finally(() => {
        dispatch(clearSidebarSelection());
      });

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
      dataTestId="delete-collection-items-modal"
    >
      Are you sure you want to delete {description}?
    </Modal>
  );
};

export default DeleteCollectionItems;
