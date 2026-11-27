import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import TypeToConfirmDeleteModal from 'components/TypeToConfirmDeleteModal';
import { closeWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';

const DeleteWorkspaceFolder = ({ workspace, onClose }) => {
  const dispatch = useDispatch();

  const onConfirm = async () => {
    try {
      const result = await dispatch(closeWorkspaceAction(workspace.uid, { deleteFiles: true }));
      if (!result?.filesLeftOnDisk) {
        toast.success(`Deleted "${workspace.name}" workspace`);
      }
      onClose();
    } catch {}
  };

  return (
    <TypeToConfirmDeleteModal
      title="Delete Workspace"
      name={workspace.name}
      pathname={workspace.pathname}
      warning="This action cannot be undone. The whole workspace folder will be permanently deleted from disk, including every file in it and any collections stored inside it. Collections stored outside the folder are not affected."
      onConfirm={onConfirm}
      onClose={onClose}
      dataTestId="delete-workspace-modal"
    />
  );
};

export default DeleteWorkspaceFolder;
