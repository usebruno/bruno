import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertCircle } from '@tabler/icons';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections/index';
import filter from 'lodash/filter';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';

const RemoveCollection = ({ onClose, collectionUid }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  // Detect drafts in the collection
  const drafts = useMemo(() => {
    if (!collection) return [];
    const items = flattenItems(collection.items);
    return filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
  }, [collection]);

  const onConfirm = () => {
    if (!collection) {
      toast.error(t('SIDEBAR.COLLECTION_NOT_FOUND'));
      onClose();
      return;
    }
    dispatch(removeCollection(collection.uid))
      .then(() => {
        toast.success(t('SIDEBAR.COLLECTION_REMOVED'));
        onClose();
      })
      .catch(() => toast.error(t('SIDEBAR.ERROR_REMOVING_COLLECTION')));
  };

  if (!collection) {
    return <div>{t('SIDEBAR.COLLECTION_NOT_FOUND')}</div>;
  }

  // If there are drafts, show the draft confirmation modal
  if (drafts.length > 0) {
    return <ConfirmCollectionCloseDrafts onClose={onClose} collection={collection} collectionUid={collectionUid} />;
  }

  // Otherwise, show the standard remove confirmation modal
  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={t('SIDEBAR.REMOVE_COLLECTION')}
        confirmText={t('COMMON.REMOVE')}
        confirmButtonColor="danger"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="mb-4">{t('SIDEBAR.REMOVE_COLLECTION_CONFIRM')}</p>
        <div className="collection-info-card">
          <div className="collection-name">{collection.name}</div>
          <div className="collection-path">{collection.pathname}</div>
        </div>
        <p className="mt-4 text-muted text-sm">
          {t('SIDEBAR.REMOVE_COLLECTION_HINT')}
        </p>
      </Modal>
    </StyledWrapper>
  );
};

export default RemoveCollection;
