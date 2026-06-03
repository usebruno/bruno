import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconAlertTriangle } from '@tabler/icons';
import { removeCollectionFromWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { findCollectionByUid } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';

const DeleteCollection = ({ onClose, collectionUid, workspaceUid }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [confirmText, setConfirmText] = useState('');
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const workspace = useSelector((state) => state.workspaces.workspaces.find((w) => w.uid === workspaceUid));

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const onConfirm = async () => {
    if (!collection || !workspace) {
      toast.error(t('SIDEBAR.COLLECTION_OR_WORKSPACE_NOT_FOUND'));
      onClose();
      return;
    }

    try {
      await dispatch(removeCollectionFromWorkspaceAction(workspace.uid, collection.pathname, { deleteFiles: true }));
      toast.success(t('SIDEBAR.DELETED_COLLECTION', { name: collection.name }));
      onClose();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error(error.message || t('SIDEBAR.ERROR_DELETING_COLLECTION'));
    }
  };

  if (!collection) {
    return null;
  }

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title={t('SIDEBAR.DELETE_COLLECTION')}
        confirmText={t('COMMON.DELETE')}
        cancelText={t('COMMON.CANCEL')}
        confirmButtonColor="danger"
        confirmDisabled={!isConfirmed}
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="modal-description">
          {t('SIDEBAR.DELETE_COLLECTION_CONFIRM', { name: collection.name })}
        </p>
        <div className="collection-info-card">
          <div className="collection-name">{collection.name}</div>
          <div className="collection-path">{collection.pathname}</div>
        </div>
        <p className="warning-text">
          {t('SIDEBAR.DELETE_COLLECTION_WARNING')}
        </p>
        <div className="delete-confirmation">
          <label htmlFor="delete-confirm-input">
            {t('SIDEBAR.TYPE_DELETE_TO_CONFIRM')}
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoComplete="off"
            autoFocus
          />
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollection;
