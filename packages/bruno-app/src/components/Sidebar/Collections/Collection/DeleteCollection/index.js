import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { deleteCollection } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const DeleteCollection = ({ onClose, collection }) => {
  const dispatch = useDispatch();
  const onConfirm = () => {
    dispatch(deleteCollection(collection.uid))
      .then(() => {
        toast.success('Collection deleted');
      })
      .catch(() => toast.error('An error occured while deleting the collection'));
  };

  return (
    <StyledWrapper>
      <Modal size="sm" title="Delete Collection" confirmText="Delete" handleConfirm={onConfirm} handleCancel={onClose}>
        Are you sure you want to delete the collection <span className="font-semibold">{collection.name}</span> ?
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollection;
