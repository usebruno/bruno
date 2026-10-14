import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconAlertTriangle } from '@tabler/icons';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import { pluralizeWord } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const SCOPE_CONFIG = {
  collection: {
    testIdPrefix: 'delete-environments',
    description: (isSingle) =>
      `This permanently deletes the environment ${isSingle ? 'file' : 'files'} from disk. This cannot be undone.`
  },
  workspace: {
    testIdPrefix: 'delete-global-environments',
    description: (isSingle) =>
      `This permanently deletes the environment${isSingle ? '' : 's'} from this workspace. This cannot be undone.`
  }
};

/**
 * Confirmation modal for deleting one or more environments.
 *
 * @param {'collection'|'workspace'} scope - selects the copy and test ids
 * @param {(env: object) => Promise} onDeleteEnvironment - deletes a single environment; reject to mark it failed
 * @param {(failedUids: string[]) => void} [onDeleted] - called once all deletes have been attempted
 */
const DeleteEnvironmentsModal = ({
  scope,
  environments,
  activeEnvironmentUid,
  onDeleteEnvironment,
  onClose,
  onDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!environments?.length) {
    return null;
  }

  const { testIdPrefix, description } = SCOPE_CONFIG[scope];
  const isSingle = environments.length === 1;
  const activeEnv = environments.find((env) => env.uid === activeEnvironmentUid);

  const onConfirm = async () => {
    setIsDeleting(true);
    const failedUids = [];

    for (const env of environments) {
      try {
        await onDeleteEnvironment(env);
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
          dataTestId={`${testIdPrefix}-modal`}
        >
          <p>{description(isSingle)}</p>

          {activeEnv && (
            <div className="env-delete-warning" data-testid={`${testIdPrefix}-active-warning`}>
              <IconAlertTriangle size={16} strokeWidth={1.5} className="warning-icon" />
              <span>
                <span className="font-medium">{activeEnv.name}</span> is your active environment. Deleting it leaves
                the {scope} with no environment selected.
              </span>
            </div>
          )}
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironmentsModal;
