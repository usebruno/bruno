import { useState } from 'react';
import toast from 'react-hot-toast';

const useEndpointActions = (collection, collectionDrift, reloadDrift) => {
  const [pendingAction, setPendingAction] = useState(null);

  // Action execution helper — runs IPC call(s), shows toast, reloads drift
  const executeEndpointAction = async (ipcCalls, successMsg, errorMsg) => {
    try {
      const { ipcRenderer } = window;
      if (Array.isArray(ipcCalls[0])) {
        await Promise.all(ipcCalls.map(([channel, params]) => ipcRenderer.invoke(channel, params)));
      } else {
        const [channel, params] = ipcCalls;
        await ipcRenderer.invoke(channel, params);
      }
      toast.success(successMsg);
      await reloadDrift();
    } catch (err) {
      console.error(`Error: ${errorMsg}`, err);
      toast.error(errorMsg);
    }
  };

  // Confirmation handlers — show modal before executing
  const handleResetEndpoint = (endpoint) => {
    setPendingAction({
      type: 'reset-endpoint',
      title: 'Reset Endpoint',
      message: `Are you sure you want to reset "${endpoint.method} ${endpoint.path}" to match the spec? Your local changes will be lost.`,
      endpoint
    });
  };

  const handleResetAllModified = () => {
    if (!collectionDrift?.modified?.length) return;
    setPendingAction({
      type: 'reset-all-modified',
      title: 'Reset All Modified',
      message: `Are you sure you want to reset ${collectionDrift.modified.length} modified endpoint(s) to match the spec? Your local changes will be lost.`
    });
  };

  const handleDeleteEndpoint = (endpoint) => {
    setPendingAction({
      type: 'delete-endpoint',
      title: 'Delete Endpoint',
      message: `Are you sure you want to delete "${endpoint.method} ${endpoint.path}"? This action cannot be undone.`,
      endpoint
    });
  };

  const handleDeleteAllLocalOnly = () => {
    if (!collectionDrift?.localOnly?.length) return;
    setPendingAction({
      type: 'delete-all-local',
      title: 'Delete All Local Endpoints',
      message: `Are you sure you want to delete ${collectionDrift.localOnly.length} local-only endpoint(s)? This action cannot be undone.`
    });
  };

  const handleRevertAllChanges = () => {
    const modifiedCount = collectionDrift?.modified?.length || 0;
    const missingCount = collectionDrift?.missing?.length || 0;
    const localOnlyCount = collectionDrift?.localOnly?.length || 0;

    setPendingAction({
      type: 'revert-all',
      title: 'Revert All Changes',
      message: `Are you sure you want to revert all changes? This will reset ${modifiedCount} modified, restore ${missingCount} missing, and delete ${localOnlyCount} local-only endpoint(s).`
    });
  };

  const handleAddMissingEndpoint = (endpoint) => {
    setPendingAction({
      type: 'restore-endpoint',
      title: 'Restore Endpoint',
      message: `Are you sure you want to restore "${endpoint.method} ${endpoint.path}" to your collection?`,
      endpoint
    });
  };

  const handleAddAllMissing = () => {
    if (!collectionDrift?.missing?.length) return;
    setPendingAction({
      type: 'restore-all-missing',
      title: 'Restore All Missing',
      message: `Are you sure you want to restore ${collectionDrift.missing.length} missing endpoint(s) to your collection?`
    });
  };

  // Execute confirmed action
  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const { type, endpoint } = pendingAction;
    setPendingAction(null);

    switch (type) {
      case 'reset-endpoint':
        return executeEndpointAction(
          ['renderer:reset-endpoints-to-spec', { collectionPath: collection.pathname, endpoints: [endpoint] }],
          `Reset ${endpoint.method} ${endpoint.path} to spec`,
          'Failed to reset endpoint'
        );
      case 'reset-all-modified':
        return executeEndpointAction(
          ['renderer:reset-endpoints-to-spec', { collectionPath: collection.pathname, endpoints: collectionDrift.modified }],
          `Reset ${collectionDrift.modified.length} endpoints to spec`,
          'Failed to reset endpoints'
        );
      case 'delete-endpoint':
        return executeEndpointAction(
          ['renderer:delete-endpoints', { collectionPath: collection.pathname, collectionUid: collection.uid, endpoints: [endpoint] }],
          `Deleted ${endpoint.method} ${endpoint.path}`,
          'Failed to delete endpoint'
        );
      case 'delete-all-local':
        return executeEndpointAction(
          ['renderer:delete-endpoints', { collectionPath: collection.pathname, collectionUid: collection.uid, endpoints: collectionDrift.localOnly }],
          `Deleted ${collectionDrift.localOnly.length} local-only endpoints`,
          'Failed to delete endpoints'
        );
      case 'revert-all': {
        const calls = [];
        if (collectionDrift?.modified?.length > 0) {
          calls.push(['renderer:reset-endpoints-to-spec', { collectionPath: collection.pathname, endpoints: collectionDrift.modified }]);
        }
        if (collectionDrift?.missing?.length > 0) {
          calls.push(['renderer:add-missing-endpoints', { collectionPath: collection.pathname, endpoints: collectionDrift.missing }]);
        }
        if (collectionDrift?.localOnly?.length > 0) {
          calls.push(['renderer:delete-endpoints', { collectionPath: collection.pathname, collectionUid: collection.uid, endpoints: collectionDrift.localOnly }]);
        }
        return executeEndpointAction(calls, 'All changes discarded successfully', 'Failed to discard changes');
      }
      case 'restore-endpoint':
        return executeEndpointAction(
          ['renderer:add-missing-endpoints', { collectionPath: collection.pathname, endpoints: [endpoint] }],
          `Added ${endpoint.method} ${endpoint.path} to collection`,
          'Failed to add endpoint'
        );
      case 'restore-all-missing':
        return executeEndpointAction(
          ['renderer:add-missing-endpoints', { collectionPath: collection.pathname, endpoints: collectionDrift.missing }],
          `Added ${collectionDrift.missing.length} endpoints to collection`,
          'Failed to add endpoints'
        );
    }
  };

  return {
    pendingAction, setPendingAction,
    confirmPendingAction,
    handleResetEndpoint,
    handleResetAllModified,
    handleDeleteEndpoint,
    handleDeleteAllLocalOnly,
    handleRevertAllChanges,
    handleAddMissingEndpoint,
    handleAddAllMissing
  };
};

export default useEndpointActions;
