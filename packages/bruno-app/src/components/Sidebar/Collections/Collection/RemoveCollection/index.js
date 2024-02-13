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
        toast.success('Collection closed');
        onClose();
      })
      .catch(() => toast.error('An error occurred while closing the collection'));
  };

  return (
    <Modal size="sm" title="Close Collection" confirmText="Close" handleConfirm={onConfirm} handleCancel={onClose}>
      Are you sure you want to close collection <span className="font-semibold">{collection.name}</span> from Bruno? It
      will remain in your file system in <span className="font-semibold break-words">{collection.pathname}</span>.
    </Modal>
  );
};

export default RemoveCollection;
