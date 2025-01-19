import React from 'react';
import Modal from 'components/Modal';
import { isItemAFolder } from 'utils/tabs';
import { useDispatch } from 'react-redux';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { deleteItem } from 'providers/ReduxStore/slices/collections/actions';
import { recursivelyGetAllItemUids } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const DeleteCollectionItem = ({ onClose, item, collection }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const onConfirm = () => {
    dispatch(deleteItem(item.uid, collection.uid)).then(() => {

      if (isFolder) {
        // close all tabs that belong to the folder
        // including the folder itself and its children
        const tabUids = [...recursivelyGetAllItemUids(item.items), item.uid]

        dispatch(
          closeTabs({
            tabUids: tabUids
          })
        );
      } else {
        dispatch(
          closeTabs({
            tabUids: [item.uid]
          })
        );
      }
    });
    onClose();
  };

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={`Delete ${isFolder ? 'Folder' : 'Request'}`}
        confirmText="Delete"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        Are you sure you want to delete <span className="font-semibold">{item.name}</span> ?
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollectionItem;
