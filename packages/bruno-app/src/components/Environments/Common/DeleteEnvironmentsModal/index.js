import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconAlertTriangle } from '@tabler/icons';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import { pluralizeWord } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const DELETE_ENVIRONMENT_TYPE_CONFIG = {
  collection: {
    testIdPrefix: 'delete-environments',
    getDescription: (isSingle) =>
      `This permanently deletes the environment ${isSingle ? 'file' : 'files'} from disk. This cannot be undone.`
  },
  global: {
    testIdPrefix: 'delete-global-environments',
    getDescription: (isSingle) =>
      `This permanently deletes the environment${isSingle ? '' : 's'} from this workspace. This cannot be undone.`
  }
};

/**
 * Confirmation modal for deleting one or more environments.
 *
 * @param {'collection'|'global'} environmentType
 * @param {(env: object) => Promise} onDeleteEnvironment - deletes a single environment. reject to mark it failed
 * @param {(failedEnvUids: string[]) => void} [onDeleteComplete]
 */
const DeleteEnvironmentsModal = ({
  environmentType,
  environments,
  activeEnvironmentUid,
  onDeleteEnvironment,
  onClose,
  onDeleteComplete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!environments?.length) {
    return null;
  }

  const { testIdPrefix, getDescription } = DELETE_ENVIRONMENT_TYPE_CONFIG[environmentType];
  const isSingleEnv = environments.length === 1;
  const activeEnv = environments.find((env) => env.uid === activeEnvironmentUid);

  const onConfirm = async () => {
    setIsDeleting(true);
    const failedEnvUids = [];

    for (const env of environments) {
      try {
        await onDeleteEnvironment(env);
      } catch (error) {
        failedEnvUids.push(env.uid);
        toast.error(`Failed to delete "${env.name}"`);
      }
    }

    setIsDeleting(false);

    const succeededCount = environments.length - failedEnvUids.length;
    if (succeededCount > 0) {
      toast.success(`${succeededCount} ${pluralizeWord('environment', succeededCount)} deleted`);
    }

    onDeleteComplete?.(failedEnvUids);
    onClose();
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title={isSingleEnv ? 'Delete environment?' : `Delete ${environments.length} environments?`}
          confirmText={isSingleEnv ? 'Delete' : `Delete (${environments.length})`}
          handleConfirm={onConfirm}
          handleCancel={onClose}
          confirmButtonColor="danger"
          confirmDisabled={isDeleting}
          dataTestId={`${testIdPrefix}-modal`}
        >
          <p>{getDescription(isSingleEnv)}</p>

          {activeEnv && (
            <div className="env-delete-warning" data-testid={`${testIdPrefix}-active-warning`}>
              <IconAlertTriangle size={16} strokeWidth={1.5} className="warning-icon" />
              <span>
                <span className="font-medium">{activeEnv.name}</span> is your active environment. Deleting it leaves
                the {environmentType} with no environment selected.
              </span>
            </div>
          )}
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironmentsModal;
