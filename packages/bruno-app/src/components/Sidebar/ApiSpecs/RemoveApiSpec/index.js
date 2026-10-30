import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { removeApiSpecFromWorkspace } from 'providers/ReduxStore/slices/apiSpec';
import ConfirmApiSpecAction from 'components/Sidebar/ApiSpecs/ConfirmApiSpecAction';

const RemoveApiSpec = ({ onClose, apiSpec }) => {
  const dispatch = useDispatch();

  const onConfirm = () =>
    dispatch(removeApiSpecFromWorkspace({ uid: apiSpec.uid }))
      .then(() => {
        toast.success('API Spec removed from workspace');
        onClose();
      })
      .catch(() => toast.error('An error occurred while removing the API Spec'));

  return (
    <ConfirmApiSpecAction
      apiSpec={apiSpec}
      title="Remove from Workspace"
      confirmText="Remove"
      question="Are you sure you want to remove the following API Spec from this workspace?"
      note="The file stays on disk at the above location and can be opened again later."
      unsavedChangesMessage="You have unsaved changes in this spec. Removing it from the workspace will discard them."
      dataTestId="remove-api-spec-modal"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};

export default RemoveApiSpec;
