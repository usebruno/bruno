import { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { clearCollectionUpdate } from 'providers/ReduxStore/slices/openapi-sync';
import { formatIpcError } from 'utils/common/error';

const useSyncFlow = ({
  collection, specDrift, remoteDrift, collectionDrift,
  setError, checkForUpdates
}) => {
  const dispatch = useDispatch();

  const [pendingSyncMode, setPendingSyncMode] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const performSync = async (selections = { localOnlyIds: [], endpointDecisions: {} }, mode = 'sync') => {
    setShowConfirmModal(false);
    setIsSyncing(true);
    setError(null);

    const {
      localOnlyIds = [], endpointDecisions: decisions = {},
      newToCollection, specUpdates, resolvedConflicts, localChangesToReset
    } = selections;

    try {
      const { ipcRenderer } = window;

      let filteredDiff;
      let localOnlyToRemove;
      let driftedToReset;

      if (newToCollection) {
        // Called from SyncReviewPage with categorized remoteDrift data
        filteredDiff = {
          ...specDrift,
          added: newToCollection,
          modified: [...(specUpdates || []), ...(resolvedConflicts || [])],
          removed: [] // Removals handled via localOnlyToRemove
        };

        localOnlyToRemove = localOnlyIds.length > 0
          ? (remoteDrift?.localOnly || []).filter((ep) => localOnlyIds.includes(ep.id))
          : [];

        driftedToReset = localChangesToReset || [];
      } else {
        // Called from "Sync Now" (skip review) or ConfirmSyncModal — use specDrift directly
        filteredDiff = {
          ...specDrift,
          removed: [] // Removals handled via localOnlyToRemove
        };

        localOnlyToRemove = localOnlyIds.length > 0
          ? (remoteDrift?.localOnly || collectionDrift?.localOnly || []).filter((ep) => localOnlyIds.includes(ep.id))
          : [];

        driftedToReset = collectionDrift?.modified?.filter((ep) => {
          const decision = decisions[ep.id];
          return decision === 'accept-incoming';
        }) || [];
      }

      await ipcRenderer.invoke('renderer:apply-openapi-sync', {
        collectionUid: collection.uid,
        collectionPath: collection.pathname,
        addNewRequests: mode !== 'spec-only',
        removeDeletedRequests: localOnlyIds.length > 0,
        diff: filteredDiff,
        localOnlyToRemove,
        driftedToReset,
        mode,
        endpointDecisions: decisions
      });

      setPendingSyncMode(null);

      dispatch(clearCollectionUpdate({ collectionUid: collection.uid }));
      toast.success(
        mode === 'spec-only' ? 'Spec updated successfully'
          : mode === 'reset' ? 'Collection reset to spec successfully'
            : 'Collection synced successfully'
      );

      // Re-check to show "up to date" state
      await checkForUpdates();
    } catch (err) {
      console.error('Error syncing collection:', err);
      setError(formatIpcError(err) || 'Failed to sync collection');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncNow = () => {
    if (!remoteDrift) return;
    setPendingSyncMode('sync');
    setShowConfirmModal(true);
  };

  const handleApplySync = (selections) => {
    const mode = pendingSyncMode || 'sync';
    setPendingSyncMode(null);
    performSync(selections, mode);
  };

  const cancelConfirmModal = () => {
    setShowConfirmModal(false);
    setPendingSyncMode(null);
  };

  // Only treat endpoints as spec changes if they actually changed in the spec
  // (not locally-added/deleted endpoints that were never in or removed from the spec)
  const specAddedIds = useMemo(() => {
    return new Set((specDrift?.added || []).map((ep) => ep.id));
  }, [specDrift]);

  const specRemovedIds = useMemo(() => {
    return new Set((specDrift?.removed || []).map((ep) => ep.id));
  }, [specDrift]);

  const handleRestoreSpec = () => {
    const localOnlyIds = (remoteDrift?.localOnly || [])
      .filter((ep) => specRemovedIds.has(ep.id))
      .map((ep) => ep.id);
    performSync({ localOnlyIds, endpointDecisions: {} }, 'sync');
  };

  const handleConfirmModalSync = () => {
    const localOnlyIds = (remoteDrift?.localOnly || [])
      .filter((ep) => specRemovedIds.has(ep.id))
      .map((ep) => ep.id);
    performSync({
      localOnlyIds,
      endpointDecisions: {}
    }, pendingSyncMode || 'sync');
  };

  const confirmGroups = useMemo(() => {
    if (!remoteDrift) return [];
    const groups = [];
    const actuallyAdded = (remoteDrift.missing || []).filter((ep) => specAddedIds.has(ep.id));
    if (actuallyAdded.length > 0) {
      groups.push({ label: 'New endpoints to add', type: 'add', endpoints: actuallyAdded });
    }
    if (remoteDrift.modified?.length > 0) {
      groups.push({ label: 'Endpoints to update', type: 'update', endpoints: remoteDrift.modified });
    }
    const actuallyRemoved = (remoteDrift.localOnly || []).filter((ep) => specRemovedIds.has(ep.id));
    if (actuallyRemoved.length > 0) {
      groups.push({ label: 'Endpoints to delete', type: 'remove', endpoints: actuallyRemoved });
    }
    return groups;
  }, [remoteDrift, specAddedIds, specRemovedIds]);

  return {
    isSyncing, showConfirmModal, confirmGroups,
    handleSyncNow, handleRestoreSpec,
    handleApplySync, cancelConfirmModal, handleConfirmModalSync
  };
};

export default useSyncFlow;
