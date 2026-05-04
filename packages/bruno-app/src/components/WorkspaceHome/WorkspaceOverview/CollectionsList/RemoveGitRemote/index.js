import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { disconnectCollectionFromGit } from 'providers/ReduxStore/slices/workspaces/actions';

const RemoveGitRemote = ({ collectionPath, collectionName, remoteUrl, onClose }) => {
  const dispatch = useDispatch();
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);

  const handleConfirm = () => {
    dispatch(
      disconnectCollectionFromGit({
        workspaceUid: activeWorkspaceUid,
        collectionPath
      })
    )
      .then(() => {
        toast.success('Git remote removed');
        onClose();
      })
      .catch(() => {
        // toast already handled in the thunk
      });
  };

  return (
    <Modal
      size="md"
      title="Remove Git Remote"
      confirmText="Remove"
      confirmButtonColor="primary"
      handleConfirm={handleConfirm}
      handleCancel={onClose}
    >
      <div className="text-sm">
        <p>
          Disconnect <span className="font-medium">{collectionName}</span> from its Git remote?
        </p>
        {remoteUrl ? (
          <p className="mt-2 font-mono text-xs text-muted break-all">{remoteUrl}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          This only removes the remote URL from <span className="font-mono">workspace.yml</span>. Local files
          and any <span className="font-mono">.git</span> folder are left untouched.
        </p>
      </div>
    </Modal>
  );
};

export default RemoveGitRemote;
