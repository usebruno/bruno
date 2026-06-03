import React, { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { IconFolder } from '@tabler/icons';
import { closeWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';

const DeleteWorkspace = ({ onClose, workspace }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await dispatch(closeWorkspaceAction(workspace.uid));
      onClose();
    } catch (error) {
      toast.error(error?.message || t('SIDEBAR.ERROR_REMOVING_WORKSPACE'));
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title={t('SIDEBAR.REMOVE_WORKSPACE')}
        confirmText={isDeleting ? t('SIDEBAR.REMOVING') : t('SIDEBAR.REMOVE')}
        handleConfirm={onConfirm}
        handleCancel={onClose}
        confirmDisabled={isDeleting}
        confirmButtonColor="danger"
      >
        <div className="flex items-center">
          <IconFolder size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{workspace?.name}</span>
        </div>
        {workspace?.pathname && (
          <div className="break-words text-xs mt-1">{workspace.pathname}</div>
        )}
        <div className="mt-4">
          {t('SIDEBAR.CONFIRM_REMOVE_WORKSPACE', { name: workspace?.name })}
        </div>
        <div className="mt-4">
          {t('SIDEBAR.WORKSPACE_REMAINS_IN_FILESYSTEM')}
        </div>
      </Modal>
    </Portal>
  );
};

export default DeleteWorkspace;
