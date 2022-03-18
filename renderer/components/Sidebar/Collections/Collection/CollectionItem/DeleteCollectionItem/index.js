import React from 'react';
import Modal from 'components/Modal';
import { isItemAFolder } from 'utils/tabs';
import { useDispatch } from 'react-redux';
import { closeTab } from 'providers/ReduxStore/slices/tabs';
import { deleteItem } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const DeleteCollectionItem = ({onClose, item, collection}) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const onConfirm = () =>{
    dispatch(closeTab({
      tabUid: item.uid
    }));
    dispatch(deleteItem(item.uid, collection.uid));
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
