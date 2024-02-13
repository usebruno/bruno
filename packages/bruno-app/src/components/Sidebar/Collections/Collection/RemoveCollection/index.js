import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { IconFiles } from '@tabler/icons';
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
      <div className="flex items-center">
        <IconFiles size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-semibold">{collection.name}</span>
      </div>
      <div className="break-words text-xs mt-1">{collection.pathname}</div>
      <div className="mt-4">
        Are you sure you want to close collection <span className="font-semibold">{collection.name}</span> in Bruno?
      </div>
      <div className="mt-4">
        It will still be available in the file system at the above location and can be re-opened later.
      </div>
    </Modal>
  );
};

export default RemoveCollection;
