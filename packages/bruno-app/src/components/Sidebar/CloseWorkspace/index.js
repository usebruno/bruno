import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { IconFolder } from '@tabler/icons';
import { closeWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { useTranslation } from 'react-i18next';

const CloseWorkspace = ({ workspaceUid, onClose }) => {
  const dispatch = useDispatch();
  const { workspaces } = useSelector((state) => state.workspaces);
  const workspace = workspaces.find((w) => w.uid === workspaceUid);
  const { t } = useTranslation();

  const onConfirm = async () => {
    try {
      if (!workspace) {
        toast.error(t('SIDEBAR.CLOSE_WORKSPACE_NOT_FOUND'));
        onClose();
        return;
      }
      if (workspace.type === 'default') {
        toast.error(t('SIDEBAR.CLOSE_WORKSPACE_DEFAULT_ERROR'));
        onClose();
        return;
      }

      await dispatch(closeWorkspaceAction(workspace.uid));
      toast.success(t('SIDEBAR.CLOSE_WORKSPACE_SUCCESS'));
      onClose();
    } catch (error) {
      console.error('Error closing workspace:', error);
      toast.error(t('SIDEBAR.CLOSE_WORKSPACE_ERROR'));
    }
  };

  return (
    <Modal
      size="sm"
      title={t('SIDEBAR.CLOSE_WORKSPACE_TITLE')}
      confirmText={t('SIDEBAR.CLOSE_WORKSPACE_CONFIRM')}
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
        {t('SIDEBAR.CLOSE_WORKSPACE_ARE_YOU_SURE')} <span className="font-semibold">{workspace?.name}</span>?
      </div>
      <div className="mt-4">
        {t('SIDEBAR.CLOSE_WORKSPACE_STILL_AVAILABLE')}
      </div>
    </Modal>
  );
};

export default CloseWorkspace;
