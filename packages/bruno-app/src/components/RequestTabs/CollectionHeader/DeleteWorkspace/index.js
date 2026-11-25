import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { closeWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import StyledWrapper from './StyledWrapper';

const DeleteWorkspace = ({ workspace, onClose }) => {
  const dispatch = useDispatch();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const onConfirm = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const result = await dispatch(closeWorkspaceAction(workspace.uid, { deleteFiles: true }));
      if (!result?.filesLeftOnDisk) {
        toast.success(`Deleted "${workspace.name}" workspace`);
      }
      onClose();
    } catch (error) {
      setIsDeleting(false);
    }
  };

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Delete Workspace"
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmButtonColor="danger"
        confirmDisabled={!isConfirmed || isDeleting}
        handleConfirm={onConfirm}
        handleCancel={onClose}
        dataTestId="delete-workspace-modal"
      >
        <p className="modal-description">
          Are you sure you want to permanently delete <strong>"{workspace.name}"</strong>?
        </p>
        <div className="workspace-info-card">
          <div className="workspace-name">{workspace.name}</div>
          <div className="workspace-path">{workspace.pathname}</div>
        </div>
        <p className="warning-text">
          This action cannot be undone. The whole workspace folder will be permanently deleted from disk, including
          every file in it and any collections stored inside it. Collections stored outside the folder are not affected.
        </p>
        <div className="delete-confirmation">
          <label htmlFor="delete-workspace-confirm-input">
            Type <span className="delete-keyword">delete</span> to confirm
          </label>
          <input
            id="delete-workspace-confirm-input"
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

export default DeleteWorkspace;
