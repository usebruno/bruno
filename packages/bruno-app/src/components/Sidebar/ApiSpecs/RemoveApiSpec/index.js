import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { IconAlertTriangle } from '@tabler/icons';
import { closeApiSpecFile } from 'providers/ReduxStore/slices/apiSpec';
import { hasUnsavedApiSpecChanges } from 'utils/api-specs';
import ApiSpecInfoCard from 'components/Sidebar/ApiSpecs/ApiSpecInfoCard';

const RemoveApiSpec = ({ onClose, apiSpec }) => {
  const dispatch = useDispatch();

  const hasUnsavedChanges = hasUnsavedApiSpecChanges(apiSpec);

  const onConfirm = () => {
    dispatch(closeApiSpecFile({ uid: apiSpec.uid }))
      .then(() => {
        toast.success('API Spec removed from workspace');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the API Spec'));
  };

  return (
    <Modal
      size="sm"
      title="Remove from Workspace"
      confirmText="Remove"
      confirmButtonColor="danger"
      handleConfirm={onConfirm}
      handleCancel={onClose}
    >
      <p className="mb-4">Are you sure you want to remove the following API Spec from this workspace?</p>

      <ApiSpecInfoCard apiSpec={apiSpec} />

      <p className="mt-4 text-muted text-sm">
        The file stays on disk at the above location and can be opened again later.
      </p>
      {hasUnsavedChanges && (
        <div className="flex items-start mt-4" data-testid="api-spec-unsaved-warning">
          <IconAlertTriangle size={18} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
          <span className="ml-2">
            You have unsaved changes in this spec. Closing it here will discard them.
          </span>
        </div>
      )}
    </Modal>
  );
};

export default RemoveApiSpec;
