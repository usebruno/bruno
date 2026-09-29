import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { deleteApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { countCollectionsSyncingFromSpec } from 'utils/api-specs';
import { formatIpcError } from 'utils/common/error';
import ConfirmApiSpecAction from 'components/Sidebar/ApiSpecs/ConfirmApiSpecAction';

const formatConnectedCollectionsMessage = (count) =>
  count === 1
    ? '1 collection syncs from this spec. Deleting it will stop that collection from getting updates.'
    : `${count} collections sync from this spec. Deleting it will stop them from getting updates.`;

const DeleteApiSpec = ({ onClose, apiSpec }) => {
  const dispatch = useDispatch();
  const connectedCollectionsCount = useSelector((state) => {
    const activeWorkspace = state.workspaces.workspaces.find((w) => w.uid === state.workspaces.activeWorkspaceUid);
    return countCollectionsSyncingFromSpec(state.collections.collections, activeWorkspace, apiSpec.pathname);
  });

  const onConfirm = () =>
    dispatch(deleteApiSpec({ uid: apiSpec.uid }))
      .then(() => {
        toast.success('API Spec deleted');
        onClose();
      })
      .catch((err) => toast.error(formatIpcError(err) || 'An error occurred while deleting the API Spec'));

  const warnings = connectedCollectionsCount > 0
    ? [{ testId: 'api-spec-connected-collections-warning', message: formatConnectedCollectionsMessage(connectedCollectionsCount) }]
    : [];

  return (
    <ConfirmApiSpecAction
      apiSpec={apiSpec}
      title="Delete API Spec"
      confirmText="Delete"
      question="Are you sure you want to delete the following API Spec?"
      note="The file will be permanently deleted from disk at the above location. This cannot be undone."
      unsavedChangesMessage="You have unsaved changes in this spec. Deleting it will discard them."
      warnings={warnings}
      dataTestId="delete-api-spec-modal"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};

export default DeleteApiSpec;
