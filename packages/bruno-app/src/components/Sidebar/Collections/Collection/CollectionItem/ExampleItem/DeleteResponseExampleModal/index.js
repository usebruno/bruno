import React from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import { useDispatch } from 'react-redux';
import { deleteResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { useTranslation } from 'react-i18next';

const DeleteResponseExampleModal = ({ onClose, example, item, collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

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
        title={t('SIDEBAR_COLLECTIONS.DELETE_EXAMPLE')}
        confirmText={t('COMMON.DELETE')}
        handleConfirm={onConfirm}
        handleCancel={onClose}
        confirmButtonColor="danger"
      >
        {t('SIDEBAR_COLLECTIONS.DELETE_EXAMPLE_CONFIRM')} <span className="font-medium">{example.name}</span>?
      </Modal>
    </Portal>
  );
};

export default DeleteResponseExampleModal;
