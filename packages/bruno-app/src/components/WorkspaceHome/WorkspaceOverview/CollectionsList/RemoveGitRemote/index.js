import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { disconnectCollectionFromGit } from 'providers/ReduxStore/slices/workspaces/actions';
import { useTranslation } from 'react-i18next';

const RemoveGitRemote = ({ collectionPath, collectionName, remoteUrl, onClose }) => {
  const { t } = useTranslation();
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
        toast.success(t('WORKSPACE.OVERVIEW.GIT_REMOTE_REMOVED'));
        onClose();
      })
      .catch(() => {
        // toast already handled in the thunk
      });
  };

  return (
    <Modal
      size="md"
      title={t('WORKSPACE.OVERVIEW.REMOVE_GIT_REMOTE')}
      confirmText={t('WORKSPACE.OVERVIEW.REMOVE')}
      confirmButtonColor="primary"
      handleConfirm={handleConfirm}
      handleCancel={onClose}
    >
      <div className="text-sm leading-relaxed break-words">
        <p className="m-0">
          {t('WORKSPACE.OVERVIEW.DISCONNECT_FROM_GIT')}{' '}
          <span className="font-medium break-words" title={collectionName}>
            {collectionName}
          </span>{' '}
          {t('WORKSPACE.OVERVIEW.FROM_GIT_REMOTE')}?
        </p>
        {remoteUrl ? (
          <p className="mt-2 mb-0 font-mono text-xs text-muted break-all">{remoteUrl}</p>
        ) : null}
        <p className="mt-3 mb-0 text-xs text-muted">
          {t('WORKSPACE.OVERVIEW.REMOVE_GIT_REMOTE_NOTE')}
        </p>
      </div>
    </Modal>
  );
};

export default RemoveGitRemote;
