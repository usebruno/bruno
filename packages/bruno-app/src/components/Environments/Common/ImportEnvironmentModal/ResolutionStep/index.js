import React, { useCallback, useMemo } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { pluralizeWord } from 'utils/common/index';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import { ENV_STATUS } from '../hooks/useEnvironmentImport';
import { RESOLUTION_TYPES } from '../utils';
import { Button } from 'ui/index';

const ResolutionStep = ({
  modalTitle,
  modalTestId,
  onBack,
  handleConfirmImport,
  items,
  selected,
  resolutions,
  setResolutions
}) => {
  const duplicateEnvs = useMemo(() => items.filter((env) => env.status === ENV_STATUS.DUPLICATE && selected.has(env.id)), [items, selected]);

  const handleResolution = useCallback(async (resolutionType) => {
    // update resolution state for all selected duplicate envs
    const newResolutions = new Map(resolutions);
    duplicateEnvs.forEach((env) => {
      newResolutions.set(env.id, resolutionType);
    });

    // We update the state, but we also want to trigger import immediately.
    // However, setResolutions is async. To be safe, we can just call handleConfirmImport directly?
    // Wait, handleConfirmImport reads from the 'resolutions' state.
    // We should probably update the state and then call handleConfirmImport, or handleConfirmImport needs to be modified to accept resolutions as argument.
    // Since handleConfirmImport is a closure from useEnvironmentImport, it uses the LATEST state if we wait, or we can just pass it?
    // In the hook, handleConfirmImport reads `resolutions` state.
    // To ensure it works without race condition, we can just update the state and call handleConfirmImport.
    // Actually, `handleConfirmImport` doesn't take arguments right now. Let's look at how the hook defines it.

    // Let's pass the resolution to handleConfirmImport if needed, or simply update state.
    // Wait, let's just do it cleanly:
    setResolutions(newResolutions);

    // Hack: Wait for state to propagate or modify hook.
    // It's better if `handleConfirmImport` takes an optional `overrideResolutions`.
    // Let's modify the hook to support that.
    handleConfirmImport(newResolutions);
  }, [duplicateEnvs, resolutions, setResolutions, handleConfirmImport]);

  return (
    <Portal>
      <Modal
        size="md"
        title={modalTitle}
        confirmText="Import as copy"
        cancelText="Replace existing"
        handleConfirm={() => handleResolution(RESOLUTION_TYPES.COPY)}
        handleCancel={() => handleResolution(RESOLUTION_TYPES.REPLACE)}
        dataTestId={modalTestId}
        disableCloseOnOutsideClick
        footerLeft={(
          <Button size="md" variant="secondary" onClick={onBack}>
            &larr; Back
          </Button>
        )}
      >
        <div className="p-4 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-md mb-4" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)' }}>
            <IconAlertTriangleFilled size={18} style={{ color: '#d97706' }} />
            <span className="font-medium" style={{ color: '#92400e' }}>
              {duplicateEnvs.length} {pluralizeWord('environment', duplicateEnvs.length)} already {duplicateEnvs.length > 1 ? 'exist' : 'exists'} in this collection.
            </span>
          </div>
          <p className="text-sm">
            Replace to overwrite them, or import as a copy to keep both.
          </p>
        </div>
      </Modal>
    </Portal>
  );
};

export default ResolutionStep;
