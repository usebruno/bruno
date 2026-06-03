import React from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconFolder } from '@tabler/icons';
import { closeWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';

const CloseWorkspace = ({ workspaceUid, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { workspaces } = useSelector((state) => state.workspaces);
  const workspace = workspaces.find((w) => w.uid === workspaceUid);

  const onConfirm = async () => {
    try {
      if (!workspace) {
        toast.error(t('SIDEBAR.WORKSPACE_NOT_FOUND'));
        onClose();
        return;
      }
      if (workspace.type === 'default') {
        toast.error(t('SIDEBAR.CANNOT_CLOSE_DEFAULT_WORKSPACE'));
        onClose();
        return;
      }

      await dispatch(closeWorkspaceAction(workspace.uid));
      toast.success(t('SIDEBAR.WORKSPACE_CLOSED'));
      onClose();
    } catch (error) {
      console.error('Error closing workspace:', error);
      toast.error(t('SIDEBAR.ERROR_CLOSING_WORKSPACE'));
    }
  };

  return (
    <Modal
      size="sm"
      title={t('SIDEBAR.CLOSE_WORKSPACE')}
      confirmText={t('COMMON.CLOSE')}
      handleConfirm={onConfirm}
      handleCancel={onClose}
    >
      <div className="flex items-center">
        <IconFolder size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-semibold">{workspace?.name}</span>
      </div>
      {workspace?.pathname && (
        <div className="break-words text-xs mt-1">{workspace.pathname}</div>
      )}
      <div className="mt-4">
        {t('SIDEBAR.CLOSE_WORKSPACE_CONFIRM', { name: workspace?.name })}
      </div>
      <div className="mt-4">
        {t('SIDEBAR.WORKSPACE_WILL_BE_AVAILABLE')}
      </div>
    </Modal>
  );
};

export default CloseWorkspace;
