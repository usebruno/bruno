import React from 'react';
import Portal from 'components/Portal/index';
import toast from 'react-hot-toast';
import Modal from 'components/Modal/index';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { deleteGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { useTranslation } from 'react-i18next';

const DeleteEnvironment = ({ onClose, environment }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const onConfirm = () => {
    dispatch(deleteGlobalEnvironment({ environmentUid: environment.uid }))
      .then(() => {
        toast.success(t('WORKSPACE_ENVIRONMENTS.DELETE_SUCCESS'));
        onClose();
      })
      .catch(() => toast.error(t('WORKSPACE_ENVIRONMENTS.DELETE_ERROR')));
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={t('WORKSPACE_ENVIRONMENTS.DELETE_ENVIRONMENT')}
          confirmText={t('WORKSPACE_ENVIRONMENTS.DELETE')}
          handleConfirm={onConfirm}
          handleCancel={onClose}
        >
          {t('WORKSPACE_ENVIRONMENTS.DELETE_CONFIRM')} <span className="font-semibold">{environment.name}</span> ?
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironment;
