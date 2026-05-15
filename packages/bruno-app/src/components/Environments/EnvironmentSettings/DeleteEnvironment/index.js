import React from 'react';
import Portal from 'components/Portal/index';
import toast from 'react-hot-toast';
import Modal from 'components/Modal/index';
import { deleteEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const DeleteEnvironment = ({ onClose, environment, collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const onConfirm = () => {
    dispatch(deleteEnvironment(environment.uid, collection.uid))
      .then(() => {
        toast.success(t('ENV_SETTINGS.ENVIRONMENT_DELETED'));
        onClose();
      })
      .catch(() => toast.error(t('ENV_SETTINGS.ENVIRONMENT_DELETE_ERROR')));
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={t('ENV_SETTINGS.DELETE_ENVIRONMENT')}
          confirmText={t('ENV_SETTINGS.DELETE')}
          handleConfirm={onConfirm}
          handleCancel={onClose}
          confirmButtonColor="danger"
        >
          {t('ENV_SETTINGS.DELETE_CONFIRM')} <span className="font-medium">{environment.name}</span> ?
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironment;
