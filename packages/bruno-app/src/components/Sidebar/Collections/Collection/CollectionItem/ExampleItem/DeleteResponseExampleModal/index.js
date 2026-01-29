import React from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import { useDispatch } from 'react-redux';
import { deleteResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';

const DeleteResponseExampleModal = ({ onClose, example, item, collection }) => {
  const dispatch = useDispatch();

  const onConfirm = (e) => {
    e.stopPropagation();
    dispatch(closeTabs({ tabUids: [example.uid] }));
    dispatch(deleteResponseExample({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: example.uid
    }));
    dispatch(saveRequest(item.uid, collection.uid, true))
      .then(() => {
        onClose();
      });
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title="Delete Example"
        confirmText="Delete"
        handleConfirm={onConfirm}
        handleCancel={onClose}
        confirmButtonColor="danger"
      >
        Are you sure you want to delete the example <span className="font-medium">{example.name}</span>?
      </Modal>
    </Portal>
  );
};

export default DeleteResponseExampleModal;
