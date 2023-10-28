import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';

const RemoveCollection = ({ onClose, collection }) => {
  const dispatch = useDispatch();

  const onConfirm = () => {
    dispatch(removeCollection(collection.uid))
      .then(() => {
        toast.success('Collection removed');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the collection'));
  };

  return (
    <Modal size="sm" title="Remove Collection" confirmText="Remove" handleConfirm={onConfirm} handleCancel={onClose}>
      Are you sure you want to remove collection <span className="font-semibold">{collection.name}</span> ?
    </Modal>
  );
};

export default RemoveCollection;
