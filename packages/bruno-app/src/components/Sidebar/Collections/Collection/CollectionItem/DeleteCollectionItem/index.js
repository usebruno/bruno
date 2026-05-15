import React from 'react';
import Modal from 'components/Modal';
import { isItemAFolder } from 'utils/tabs';
import { useDispatch } from 'react-redux';
import { deleteItem, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { recursivelyGetAllItemUids } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const DeleteCollectionItem = ({ onClose, item, collectionUid }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isFolder = isItemAFolder(item);
  const onConfirm = () => {
    dispatch(deleteItem(item.uid, collectionUid)).then(() => {
      if (isFolder) {
        // close all tabs that belong to the folder
        // including the folder itself and its children
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
      toast.error(error?.message || t('SIDEBAR_COLLECTIONS.DELETE_ITEM_ERROR'));
    });
    onClose();
  };

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={t('SIDEBAR_COLLECTIONS.DELETE_ITEM', { type: isFolder ? t('SIDEBAR_COLLECTIONS.FOLDER') : t('SIDEBAR_COLLECTIONS.REQUEST') })}
        confirmText={t('COMMON.DELETE')}
        confirmButtonColor="danger"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        {t('SIDEBAR_COLLECTIONS.DELETE_ITEM_CONFIRM')} <span className="font-medium">{item.name}</span> ?
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollectionItem;
