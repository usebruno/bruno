import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { IconFileCode } from '@tabler/icons';
import { closeApiSpecFile } from 'providers/ReduxStore/slices/apiSpec';

const CloseApiSpec = ({ onClose, apiSpec }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const onConfirm = () => {
    dispatch(closeApiSpecFile({ uid: apiSpec.uid }))
      .then(() => {
        toast.success(t('SIDEBAR.API_SPEC_CLOSED'));
        onClose();
      })
      .catch(() => toast.error(t('SIDEBAR.ERROR_CLOSING_API_SPEC')));
  };

  return (
    <Modal size="sm" title={t('SIDEBAR.CLOSE_API_SPEC')} confirmText={t('COMMON.CLOSE')} handleConfirm={onConfirm} handleCancel={onClose}>
      <div className="flex items-center">
        <IconFileCode size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-semibold">{apiSpec.name}</span>
      </div>
      <div className="break-words text-xs mt-1">{apiSpec.pathname}</div>
      <div className="mt-4">
        {t('SIDEBAR.CLOSE_API_SPEC_CONFIRM', { name: apiSpec.name })}
      </div>
      <div className="mt-4">
        {t('SIDEBAR.REMOVE_COLLECTION_HINT')}
      </div>
    </Modal>
  );
};

export default CloseApiSpec;
