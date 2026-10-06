import React from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { IconAlertTriangle, IconFileCode } from '@tabler/icons';
import { closeApiSpecFile } from 'providers/ReduxStore/slices/apiSpec';
import { hasUnsavedApiSpecChanges } from 'utils/api-specs';

const CloseApiSpec = ({ onClose, apiSpec }) => {
  const dispatch = useDispatch();

  const hasUnsavedChanges = hasUnsavedApiSpecChanges(apiSpec);

  const onConfirm = () => {
    dispatch(closeApiSpecFile({ uid: apiSpec.uid }))
      .then(() => {
        toast.success('API Spec closed');
        onClose();
      })
      .catch(() => toast.error('An error occurred while closing the API Spec'));
  };

  return (
    <Modal size="sm" title="Close Api Spec" confirmText="Close" handleConfirm={onConfirm} handleCancel={onClose}>
      <div className="flex items-center">
        <IconFileCode size={18} strokeWidth={1.5} />
        <span className="ml-2 mr-4 font-semibold">{apiSpec.name}</span>
      </div>
      <div className="break-words text-xs mt-1">{apiSpec.pathname}</div>
      <div className="mt-4">
        Are you sure you want to close API Spec <span className="font-semibold">{apiSpec.name}</span> in Bruno?
      </div>
      <div className="mt-4">
        It will still be available in the file system at the above location and can be re-opened later.
      </div>
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

export default CloseApiSpec;
