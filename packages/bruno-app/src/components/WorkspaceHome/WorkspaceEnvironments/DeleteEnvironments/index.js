import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconAlertTriangle } from '@tabler/icons';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import { deleteGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { pluralizeWord } from 'utils/common';
import StyledWrapper from './StyledWrapper';

// Bulk delete modal for global (workspace) environments
const DeleteEnvironments = ({ environments, activeEnvironmentUid, onClose, onDeleted }) => {
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!environments?.length) {
    return null;
  }

  const isSingle = environments.length === 1;
  const activeEnv = environments.find((env) => env.uid === activeEnvironmentUid);

  const onConfirm = async () => {
    setIsDeleting(true);
    const failedUids = [];

    for (const env of environments) {
      try {
        await dispatch(deleteGlobalEnvironment({ environmentUid: env.uid }));
      } catch (error) {
        failedUids.push(env.uid);
        toast.error(`Failed to delete "${env.name}"`);
      }
    }

    setIsDeleting(false);

    const succeededCount = environments.length - failedUids.length;
    if (succeededCount > 0) {
      toast.success(`${succeededCount} ${pluralizeWord('environment', succeededCount)} deleted`);
    }

    onDeleted?.(failedUids);
    onClose();
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title={isSingle ? 'Delete environment?' : `Delete ${environments.length} environments?`}
          confirmText={isSingle ? 'Delete' : `Delete (${environments.length})`}
          handleConfirm={onConfirm}
          handleCancel={onClose}
          confirmButtonColor="danger"
          confirmDisabled={isDeleting}
          dataTestId="delete-global-environments-modal"
        >
          <p>This permanently deletes the environment{isSingle ? '' : 's'} from this workspace. This cannot be undone.</p>

          {activeEnv && (
            <div className="env-delete-warning" data-testid="delete-global-environments-active-warning">
              <IconAlertTriangle size={16} strokeWidth={1.5} className="warning-icon" />
              <span>
                <span className="font-medium">{activeEnv.name}</span> is your active environment. Deleting it leaves
                the workspace with no environment selected.
              </span>
            </div>
          )}
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironments;
