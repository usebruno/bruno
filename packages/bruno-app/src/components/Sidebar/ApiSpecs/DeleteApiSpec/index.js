import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { IconAlertTriangle } from '@tabler/icons';
import { deleteApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { hasUnsavedApiSpecChanges } from 'utils/api-specs';
import ApiSpecInfoCard from 'components/Sidebar/ApiSpecs/ApiSpecInfoCard';

const DeleteApiSpec = ({ onClose, apiSpec }) => {
  const dispatch = useDispatch();
  const hasUnsavedChanges = hasUnsavedApiSpecChanges(apiSpec);

  const onConfirm = () => {
    dispatch(deleteApiSpec({ uid: apiSpec.uid }))
      .then(() => {
        toast.success('API Spec deleted');
        onClose();
      })
      .catch((err) => toast.error(err?.message || 'An error occurred while deleting the API Spec'));
  };

  return (
    <Modal
      size="sm"
      title="Delete API Spec"
      confirmText="Delete"
      confirmButtonColor="danger"
      handleConfirm={onConfirm}
      handleCancel={onClose}
      dataTestId="delete-api-spec-modal"
    >
      <p className="mb-4">Are you sure you want to delete the following API Spec?</p>

      <ApiSpecInfoCard apiSpec={apiSpec} />

      <p className="mt-4 text-muted text-sm">
        The file will be permanently deleted from disk at the above location. This cannot be undone.
      </p>
      {hasUnsavedChanges && (
        <div className="flex items-start mt-4" data-testid="api-spec-unsaved-warning">
          <IconAlertTriangle size={18} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
          <span className="ml-2">
            You have unsaved changes in this spec. Deleting it will discard them.
          </span>
        </div>
      )}
    </Modal>
  );
};

export default DeleteApiSpec;
