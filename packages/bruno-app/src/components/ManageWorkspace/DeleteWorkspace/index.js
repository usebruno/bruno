import React, { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { IconFolder } from '@tabler/icons';
import { closeWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';

const DeleteWorkspace = ({ onClose, workspace }) => {
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await dispatch(closeWorkspaceAction(workspace.uid));
      onClose();
    } catch (error) {
      toast.error(error?.message || 'An error occurred while removing the workspace');
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <Modal
        size="sm"
        title="Remove Workspace"
        confirmText={isDeleting ? 'Removing...' : 'Remove'}
        handleConfirm={onConfirm}
        handleCancel={onClose}
        confirmDisabled={isDeleting}
        isDangerButton={true}
      >
        <div className="flex items-center">
          <IconFolder size={18} strokeWidth={1.5} />
          <span className="ml-2 mr-4 font-semibold">{workspace?.name}</span>
        </div>
        {workspace?.pathname && (
          <div className="break-words text-xs mt-1">{workspace.pathname}</div>
        )}
        <div className="mt-4">
          Are you sure you want to remove workspace <span className="font-semibold">{workspace?.name}</span>?
        </div>
        <div className="mt-4">
          The workspace will still be available in the file system and can be re-opened later.
        </div>
      </Modal>
    </Portal>
  );
};

export default DeleteWorkspace;
