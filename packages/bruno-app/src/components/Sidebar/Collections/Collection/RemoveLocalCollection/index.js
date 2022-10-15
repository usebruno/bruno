import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { removeLocalCollection } from 'providers/ReduxStore/slices/collections/actions';

const RemoveLocalCollection = ({onClose, collection}) => {
  const dispatch = useDispatch();

  const onConfirm = () =>{
    dispatch(removeLocalCollection(collection.uid))
      .then(() => {
        toast.success("Collection removed");
        onClose();
      })
      .catch(() => toast.error("An error occured while removing the collection"));
  };

  return (
    <Modal
      size="sm"
      title="Remove Collection"
      confirmText="Remove"
      handleConfirm={onConfirm}
      handleCancel={onClose}
    >
      Are you sure you want to remove this collection?
    </Modal>
  );
};

export default RemoveLocalCollection;
