import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { IconFiles } from '@tabler/icons';
import { deleteCollection } from 'providers/ReduxStore/slices/collections/actions';

const DeleteCollection = ({ onClose, collection }) => {
  const dispatch = useDispatch();

  const onConfirm = () => {
    dispatch(deleteCollection(collection.uid))
      .then(() => {
        toast.success('Collection deleted');
        onClose();
      })
      .catch(() => toast.error('An error occurred while deleting the collection'));
  };

  return (
    <Modal size="sm" title="Delete Collection" confirmText="Delete" handleConfirm={onConfirm} handleCancel={onClose}>
      <div className="flex items-center">
        <IconFiles size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-semibold">{collection.name}</span>
      </div>
      <div className="break-words text-xs mt-1">{collection.pathname}</div>
      <div className="mt-4">
        Are you sure you want to delete the collection <span className="font-semibold">{collection.name}</span> in Bruno?
      </div>
      <div className="mt-4 text-red-500">
        It will be deleted from your file system and cannot be restored.
      </div>
    </Modal>
  );
};

export default DeleteCollection;
