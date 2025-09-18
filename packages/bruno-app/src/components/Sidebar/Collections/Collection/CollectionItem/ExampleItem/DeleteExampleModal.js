import React from 'react';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { deleteResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const DeleteExampleModal = ({ onClose, example, item, collection }) => {
  const dispatch = useDispatch();

  const onConfirm = () => {
    dispatch(deleteResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: example.uid
    }));
    dispatch(saveRequest(item.uid, collection.uid));
    onClose();
  };

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Delete Example"
        confirmText="Delete"
        handleConfirm={onConfirm}
        handleCancel={onClose}
        confirmButtonClass="btn-danger"
      >
        Are you sure you want to delete the example <span className="font-semibold">{example.name}</span>?
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteExampleModal;
