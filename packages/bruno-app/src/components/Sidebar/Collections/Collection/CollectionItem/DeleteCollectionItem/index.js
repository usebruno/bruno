import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal';
import { isItemAFolder } from 'utils/tabs';
import { useDispatch } from 'react-redux';
import { deleteItem, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { recursivelyGetAllItemUids } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';

const DeleteCollectionItem = ({ onClose, item, collectionUid }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const onConfirm = () => {
    dispatch(deleteItem(item.uid, collectionUid)).then(() => {
      if (isFolder) {
        const tabUids = [...recursivelyGetAllItemUids(item.items), item.uid];
        dispatch(
          closeTabs({
            tabUids: tabUids
          })
        );
      } else {
        dispatch(
          closeTabs({
            tabUids: [item.uid]
          })
        );
      }
    }).catch((error) => {
      console.error('Error deleting item', error);
      toast.error(error?.message || t('SIDEBAR.ERROR_DELETING_ITEM'));
    });
    onClose();
  };

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={isFolder ? t('SIDEBAR.DELETE_FOLDER') : t('SIDEBAR.DELETE_REQUEST')}
        confirmText={t('COMMON.DELETE')}
        confirmButtonColor="danger"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        {t('SIDEBAR.DELETE_ITEM_CONFIRM', { name: item.name })}
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollectionItem;
