import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
  IconPlus,
  IconPencil,
  IconTrash,
  IconArrowBackUp,
  IconInfoCircle
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import Modal from 'components/Modal';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import { clearCollectionUpdate, setCollectionUpdate, setTabUiState, selectTabUiState } from 'providers/ReduxStore/slices/openapi-sync';
import { flattenItems } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';
import ConfirmSyncModal from './ConfirmSyncModal';
import SyncReviewPage from './SyncReviewPage';
import SpecInfoCard from './SpecInfoCard';
import SpecReviewPage from './SpecReviewPage';
import ChangeSection, { EndpointItem } from './ChangeSection';

const OpenAPISyncTab = ({ collection }) => {
  const dispatch = useDispatch();
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.sync;

  // Core state
  const [sourceUrl, setSourceUrl] = useState(openApiSyncConfig?.sourceUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [diffResult, setDiffResult] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Collection drift state
  const [collectionDrift, setCollectionDrift] = useState(null);
  const [remoteDrift, setRemoteDrift] = useState(null);
  const [isDriftLoading, setIsDriftLoading] = useState(false);
  const [storedSpec, setStoredSpec] = useState(null);
  const [pendingSyncMode, setPendingSyncMode] = useState(null);

  // Action confirmation state
  const [pendingAction, setPendingAction] = useState(null);

  // Redux-persisted UI state
  const tabUiState = useSelector(selectTabUiState(collection.uid));
  const activeTab = tabUiState.activeTab || 'overview';
  const viewMode = tabUiState.viewMode || 'tabs';

  const setActiveTab = (tab) => dispatch(setTabUiState({ collectionUid: collection.uid, activeTab: tab }));
  const setViewMode = (mode) => dispatch(setTabUiState({ collectionUid: collection.uid, viewMode: mode }));

  const isConfigured = !!openApiSyncConfig?.sourceUrl;
  const groupBy = openApiSyncConfig?.groupBy || 'tags';

  // Derived sync status
  const hasError = error || diffResult?.isValid === false;
  const hasLocalDrift = collectionDrift && (
    (collectionDrift.modified?.length > 0)
    || (collectionDrift.missing?.length > 0)
  );
  // Create a fingerprint of collection items to detect changes (including nested items in folders)
  const collectionFingerprint = useMemo(() => {
    const allItems = flattenItems(collection?.items || []);
    return String(allItems.filter((item) => item.type === 'http-request').length);
  }, [collection?.items]);
  const prevFingerprintRef = useRef(collectionFingerprint);

  useEffect(() => {
    if (sourceUrl && isConfigured) {
      checkForUpdates();
      loadCollectionDrift();
    }
  }, [isConfigured]);

  // Reload drift when collection items change (e.g., endpoint deleted from sidebar)
  useEffect(() => {
    if (prevFingerprintRef.current !== collectionFingerprint && isConfigured) {
      prevFingerprintRef.current = collectionFingerprint;
      loadCollectionDrift();
    }
  }, [collectionFingerprint, isConfigured]);

  const getCollectionItemsForDrift = () => {
    const allItems = flattenItems(collection.items || []);
    return allItems
      .filter((item) => item.type === 'http-request' && !item.partial && !item.loading && item.request)
      .map((item) => ({
        pathname: item.pathname,
        name: item.name,
        request: {
          method: item.request.method,
          url: item.request.url,
          params: (item.request.params || []).map((p) => ({ name: p.name })),
          headers: (item.request.headers || []).map((h) => ({ name: h.name })),
          body: {
            mode: item.request.body?.mode || 'none',
            formUrlEncoded: (item.request.body?.formUrlEncoded || []).map((f) => ({ name: f.name })),
            multipartForm: (item.request.body?.multipartForm || []).map((f) => ({ name: f.name }))
          },
          auth: {
            mode: item.request.auth?.mode || 'none'
          }
        }
      }));
  };

  const loadCollectionDrift = async ({ readFromDisk = false } = {}) => {
    setIsDriftLoading(true);
    try {
      const { ipcRenderer } = window;
      const params = {
        collectionPath: collection.pathname,
        brunoConfig: collection.brunoConfig
      };

      // After actions that modify files on disk, Redux state may be stale (file watcher hasn't fired yet).
      // Skip passing collectionItems so the backend reads fresh data from disk.
      if (!readFromDisk) {
        params.collectionItems = getCollectionItemsForDrift();
      }

      const result = await ipcRenderer.invoke('renderer:get-collection-drift', params);

      if (!result.error) {
        setCollectionDrift(result);
      }
    } catch (err) {
      console.error('Error loading collection drift:', err);
    } finally {
      setIsDriftLoading(false);
    }
  };

  const checkForUpdates = async ({ readFromDisk = false } = {}) => {
    if (!sourceUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiffResult(null);
    setRemoteDrift(null);

    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:compare-openapi-specs', {
        collectionPath: collection.pathname,
        sourceUrl: sourceUrl.trim()
      });

      setDiffResult(result);
      if (result.newSpec) {
        setStoredSpec(result.newSpec);
      }

      // Update Redux store so toolbar status stays in sync
      dispatch(setCollectionUpdate({
        collectionUid: collection.uid,
        hasUpdates: result.isValid !== false && result.hasChanges,
        diff: result,
        error: result.isValid === false ? result.error : null
      }));

      // Fetch remote drift (remote spec vs collection) for collection-centric categorization
      if (result.newSpec) {
        const driftParams = {
          collectionPath: collection.pathname,
          brunoConfig: collection.brunoConfig,
          compareSpec: result.newSpec
        };
        if (!readFromDisk) {
          driftParams.collectionItems = getCollectionItemsForDrift();
        }
        const remoteComparison = await ipcRenderer.invoke('renderer:get-collection-drift', driftParams);
        if (!remoteComparison.error) {
          setRemoteDrift(remoteComparison);
        }
      }

      // Refresh collection drift (stored spec vs collection) — skip if no stored spec
      if (!result.storedSpecMissing) {
        await loadCollectionDrift({ readFromDisk });
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError(err.message || 'Failed to check for updates');
      dispatch(setCollectionUpdate({
        collectionUid: collection.uid,
        hasUpdates: false,
        diff: null,
        error: err.message || 'Failed to check for updates'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!sourceUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { ipcRenderer } = window;

      // Validate the spec first
      const result = await ipcRenderer.invoke('renderer:compare-openapi-specs', {
        collectionPath: collection.pathname,
        sourceUrl: sourceUrl.trim()
      });

      if (result.isValid === false) {
        setDiffResult(result);
        setError(result.error);
        return;
      }

      // Save sync config (no spec file yet — deferred to first sync unless collection already matches)
      await ipcRenderer.invoke('renderer:update-openapi-sync-config', {
        collectionPath: collection.pathname,
        config: {
          sourceUrl: sourceUrl.trim(),
          groupBy: 'tags',
          specFilename: result.specFilename || 'openapi.json'
        }
      });

      // Check if collection already matches the spec
      if (result.newSpec) {
        const driftParams = {
          collectionPath: collection.pathname,
          brunoConfig: collection.brunoConfig,
          compareSpec: result.newSpec,
          collectionItems: getCollectionItemsForDrift()
        };
        const drift = await ipcRenderer.invoke('renderer:get-collection-drift', driftParams);

        const isInSync = !drift.error
          && (!drift.missing || drift.missing.length === 0)
          && (!drift.modified || drift.modified.length === 0)
          && (!drift.localOnly || drift.localOnly.length === 0);

        if (isInSync) {
          // Collection matches — save spec file silently to complete setup
          await ipcRenderer.invoke('renderer:save-openapi-spec', {
            collectionPath: collection.pathname,
            specContent: result.newSpecContent || JSON.stringify(result.newSpec, null, 2),
            specFilename: result.specFilename
          });
        }
      }

      toast.success('OpenAPI sync connected');
    } catch (err) {
      console.error('Error connecting OpenAPI sync:', err);
      setError(err.message || 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const handleDisconnect = () => {
    setShowDisconnectModal(true);
  };

  const [deleteSpecFile, setDeleteSpecFile] = useState(false);

  const confirmDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:remove-openapi-sync-config', {
        collectionPath: collection.pathname,
        deleteSpecFile
      });
      setDeleteSpecFile(false);
      setSourceUrl('');
      setDiffResult(null);
      setCollectionDrift(null);
      setRemoteDrift(null);
      setStoredSpec(null);
      toast.success('OpenAPI sync disconnected');
    } catch (err) {
      console.error('Error disconnecting sync:', err);
      toast.error('Failed to disconnect sync');
    }
  };

  const handleSyncWithMode = async (mode) => {
    if (!diffResult) return;

    // For 'sync' mode, show interactive review modal first
    if (mode === 'sync') {
      const hasModifiedEndpoints = remoteDrift
        ? (remoteDrift.modified?.length > 0)
        : (diffResult.modified?.length > 0) || (collectionDrift?.modified?.length > 0);
      if (hasModifiedEndpoints) {
        setPendingSyncMode(mode);
        setViewMode('review');
        return;
      }
    }

    // For 'reset' mode or 'sync' without modified endpoints, check for endpoints not in spec
    const hasEndpointsNotInSpec = remoteDrift
      ? (remoteDrift.localOnly?.length > 0)
      : (diffResult.removed?.length > 0) || (collectionDrift?.localOnly?.length > 0);

    if ((mode === 'sync' || mode === 'reset') && hasEndpointsNotInSpec) {
      setPendingSyncMode(mode);
      setShowConfirmModal(true);
      return;
    }

    // For other modes, perform sync directly
    await performSync({ removedIds: [], localOnlyIds: [], endpointDecisions: {} }, mode);
  };

  // Sync Now: skip review page, always show confirm modal before syncing
  const handleSyncNow = async () => {
    if (!diffResult) return;

    setPendingSyncMode('sync');
    setShowConfirmModal(true);
  };

  // Handle apply from SyncReviewPage (includes endpoint decisions + removals)
  const handleApplySync = (selections) => {
    const mode = pendingSyncMode || 'sync';
    setViewMode('tabs');
    setPendingSyncMode(null);
    performSync(selections, mode);
  };

  const performSync = async (selections = { removedIds: [], localOnlyIds: [], endpointDecisions: {} }, mode = 'sync') => {
    setShowConfirmModal(false);
    setViewMode('tabs');
    setPendingSyncMode(null);
    setIsSyncing(true);
    setError(null);

    const {
      removedIds = [], localOnlyIds = [], endpointDecisions: decisions = {},
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
          ...diffResult,
          added: newToCollection,
          modified: [...(specUpdates || []), ...(resolvedConflicts || [])],
          removed: [] // Removals handled via localOnlyToRemove
        };

        localOnlyToRemove = localOnlyIds.length > 0
          ? (remoteDrift?.localOnly || []).filter((ep) => localOnlyIds.includes(ep.id))
          : [];

        driftedToReset = localChangesToReset || [];
      } else {
        // Called from "Sync Now" (skip review) or ConfirmSyncModal — use diffResult directly
        filteredDiff = {
          ...diffResult,
          removed: removedIds.length > 0
            ? (diffResult?.removed || []).filter((ep) => removedIds.includes(ep.id))
            : []
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
        sourceUrl: sourceUrl.trim(),
        addNewRequests: mode !== 'spec-only',
        removeDeletedRequests: removedIds.length > 0 || localOnlyIds.length > 0,
        diff: filteredDiff,
        localOnlyToRemove,
        driftedToReset,
        mode,
        endpointDecisions: decisions
      });

      dispatch(clearCollectionUpdate({ collectionUid: collection.uid }));
      toast.success(
        mode === 'spec-only' ? 'Spec updated successfully'
          : mode === 'reset' ? 'Collection reset to spec successfully'
            : 'Collection synced successfully'
      );

      // Re-check to show "up to date" state — read from disk since files were just modified
      await checkForUpdates({ readFromDisk: true });
    } catch (err) {
      console.error('Error syncing collection:', err);
      setError(err.message || 'Failed to sync collection');
    } finally {
      setIsSyncing(false);
    }
  };

  // Action execution functions
  const executeResetEndpoint = async (endpoint) => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:reset-endpoints-to-spec', {
        collectionPath: collection.pathname,
        endpoints: [endpoint]
      });
      toast.success(`Reset ${endpoint.method} ${endpoint.path} to spec`);
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error resetting endpoint:', err);
      toast.error('Failed to reset endpoint');
    }
  };

  const executeResetAllModified = async () => {
    if (!collectionDrift?.modified?.length) return;

    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:reset-endpoints-to-spec', {
        collectionPath: collection.pathname,
        endpoints: collectionDrift.modified
      });
      toast.success(`Reset ${collectionDrift.modified.length} endpoints to spec`);
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error resetting endpoints:', err);
      toast.error('Failed to reset endpoints');
    }
  };

  const executeDeleteEndpoint = async (endpoint) => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:delete-endpoints', {
        collectionPath: collection.pathname,
        collectionUid: collection.uid,
        endpoints: [endpoint]
      });
      toast.success(`Deleted ${endpoint.method} ${endpoint.path}`);
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error deleting endpoint:', err);
      toast.error('Failed to delete endpoint');
    }
  };

  const executeDeleteAllLocalOnly = async () => {
    if (!collectionDrift?.localOnly?.length) return;

    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:delete-endpoints', {
        collectionPath: collection.pathname,
        collectionUid: collection.uid,
        endpoints: collectionDrift.localOnly
      });
      toast.success(`Deleted ${collectionDrift.localOnly.length} local-only endpoints`);
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error deleting endpoints:', err);
      toast.error('Failed to delete endpoints');
    }
  };

  const executeRevertAllChanges = async () => {
    try {
      const { ipcRenderer } = window;
      const promises = [];

      // Reset all modified endpoints
      if (collectionDrift?.modified?.length > 0) {
        promises.push(
          ipcRenderer.invoke('renderer:reset-endpoints-to-spec', {
            collectionPath: collection.pathname,
            endpoints: collectionDrift.modified
          })
        );
      }

      // Restore all missing endpoints
      if (collectionDrift?.missing?.length > 0) {
        promises.push(
          ipcRenderer.invoke('renderer:add-missing-endpoints', {
            collectionPath: collection.pathname,
            endpoints: collectionDrift.missing
          })
        );
      }

      // Delete all local-only endpoints
      if (collectionDrift?.localOnly?.length > 0) {
        promises.push(
          ipcRenderer.invoke('renderer:delete-endpoints', {
            collectionPath: collection.pathname,
            collectionUid: collection.uid,
            endpoints: collectionDrift.localOnly
          })
        );
      }

      await Promise.all(promises);
      toast.success('All changes discarded successfully');
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error discarding changes:', err);
      toast.error('Failed to discard changes');
    }
  };

  // Confirmation handlers - show modal before executing
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

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const { type, endpoint } = pendingAction;
    setPendingAction(null);

    switch (type) {
      case 'reset-endpoint':
        await executeResetEndpoint(endpoint);
        break;
      case 'reset-all-modified':
        await executeResetAllModified();
        break;
      case 'delete-endpoint':
        await executeDeleteEndpoint(endpoint);
        break;
      case 'delete-all-local':
        await executeDeleteAllLocalOnly();
        break;
      case 'revert-all':
        await executeRevertAllChanges();
        break;
      case 'restore-endpoint':
        await executeAddMissingEndpoint(endpoint);
        break;
      case 'restore-all-missing':
        await executeAddAllMissing();
        break;
    }
  };

  // Execute functions for restore actions
  const executeAddMissingEndpoint = async (endpoint) => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:add-missing-endpoints', {
        collectionPath: collection.pathname,
        endpoints: [endpoint]
      });
      toast.success(`Added ${endpoint.method} ${endpoint.path} to collection`);
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error adding endpoint:', err);
      toast.error('Failed to add endpoint');
    }
  };

  const executeAddAllMissing = async () => {
    if (!collectionDrift?.missing?.length) return;

    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:add-missing-endpoints', {
        collectionPath: collection.pathname,
        endpoints: collectionDrift.missing
      });
      toast.success(`Added ${collectionDrift.missing.length} endpoints to collection`);
      await loadCollectionDrift({ readFromDisk: true });
    } catch (err) {
      console.error('Error adding endpoints:', err);
      toast.error('Failed to add endpoints');
    }
  };

  // Confirmation handlers for restore actions
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

  const handleSpecReviewSync = async (mode) => {
    setViewMode('tabs');
    await handleSyncWithMode(mode);
  };

  const renderCollectionDrift = () => {
    if (!collectionDrift) {
      if (isDriftLoading) {
        return (
          <div className="state-message">
            <IconLoader2 size={24} className="animate-spin" />
            <span>Checking collection drift...</span>
          </div>
        );
      }
      return (
        <div className="state-message">
          <IconInfoCircle size={24} />
          <span>Collection drift not checked yet</span>
        </div>
      );
    }

    if (collectionDrift.noStoredSpec) {
      return (
        <div className="state-message">
          <IconInfoCircle size={24} />
          <span>No local spec found for this collection</span>
        </div>
      );
    }

    const localOnlyCount = collectionDrift?.localOnly?.length || 0;

    return (
      <div className="collection-status-section">
        <p className="section-description">Comparison of your collection endpoints against the last synced OpenAPI spec.</p>

        {hasLocalDrift ? (
          <div className="sync-alert-banner">
            <div className="alert-content">
              <IconAlertTriangle size={16} />
              <span>Your collection has local changes that are not present in the OpenAPI spec</span>
            </div>
            <Button
              size="xs"
              onClick={handleRevertAllChanges}
            >
              Discard All Changes
            </Button>
          </div>
        ) : (null
        // <div className="sync-success-banner">
        //   <div className="alert-content">
        //     <IconCheck size={16} />
        //     <span>
        //       Your collection has no local changes.
        //       {localOnlyCount > 0 && `. You have ${localOnlyCount} local-only endpoint${localOnlyCount > 1 ? 's' : ''}.`}
        //     </span>
        //   </div>
        // </div>
        )}

        {/* Summary Section */}
        <div className="drift-summary">
          <h4 className="drift-summary-title">Summary</h4>
          <div className="drift-summary-grid">
            <div className="drift-summary-item">
              <span className="drift-summary-count">{collectionDrift?.inSync?.length || 0}</span>
              <span className="drift-summary-label">In Sync</span>
            </div>
            <div className="drift-summary-item">
              <span className="drift-summary-count modified">{collectionDrift?.modified?.length || 0}</span>
              <span className="drift-summary-label">Modified</span>
            </div>
            <div className="drift-summary-item">
              <span className="drift-summary-count missing">{collectionDrift?.missing?.length || 0}</span>
              <span className="drift-summary-label">Missing <span className="drift-summary-sublabel">(Not in collection)</span></span>
            </div>
            <div className="drift-summary-item">
              <span className="drift-summary-count local-only">{collectionDrift?.localOnly?.length || 0}</span>
              <span className="drift-summary-label">Local only <span className="drift-summary-sublabel">(Not in spec)</span></span>
            </div>
          </div>
        </div>

        {/* Modified Endpoints */}
        {collectionDrift?.modified?.length > 0 && (
          <ChangeSection
            title="Modified Endpoints"
            // icon={IconPencil}
            count={collectionDrift.modified.length}
            type="modified"
            endpoints={collectionDrift.modified}
            defaultExpanded={false}
            expandable={true}
            collectionPath={collection.pathname}
            newSpec={storedSpec || diffResult?.newSpec}
            diffLeftLabel="Last Synced Spec"
            diffRightLabel="Current (in collection)"
            swapDiffSides={true}
            collectionUid={collection.uid}
            sectionKey="drift-modified"
            renderItemActions={(endpoint) => (
              <Button size="xs" variant="ghost" onClick={() => handleResetEndpoint(endpoint)} title="Reset to spec" icon={<IconArrowBackUp size={14} />}>
                Reset
              </Button>
            )}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleResetAllModified}
                title="Reset all modified endpoints to match the spec"
                icon={<IconArrowBackUp size={14} />}
              >
                Reset All
              </Button>
            )}
          />
        )}

        {/* Deleted Endpoints (in spec but missing from collection) */}
        {collectionDrift?.missing?.length > 0 && (
          <ChangeSection
            title="Missing Endpoints"
            // icon={IconTrash}
            count={collectionDrift.missing.length}
            type="missing"
            endpoints={collectionDrift.missing}
            defaultExpanded={false}
            expandable={true}
            collectionPath={collection.pathname}
            newSpec={storedSpec || diffResult?.newSpec}
            diffLeftLabel="Last Synced Spec"
            diffRightLabel="Current (in collection)"
            swapDiffSides={true}
            collectionUid={collection.uid}
            sectionKey="drift-missing"
            renderItemActions={(endpoint) => (
              <Button size="xs" variant="ghost" color="success" onClick={() => handleAddMissingEndpoint(endpoint)} title="Restore to collection" icon={<IconPlus size={14} />}>
                Restore
              </Button>
            )}
            actions={(
              <Button
                size="xs"
                variant="outline"
                color="success"
                onClick={() => handleAddAllMissing()}
                title="Add all deleted endpoints back to collection"
                icon={<IconPlus size={14} />}
              >
                Restore All
              </Button>
            )}
          />
        )}

        {/* Added Endpoints (in collection but not in spec) */}
        {collectionDrift?.localOnly?.length > 0 && (
          <ChangeSection
            title="Local only Endpoints"
            // icon={IconPlus}
            count={collectionDrift.localOnly.length}
            type="local-only"
            endpoints={collectionDrift.localOnly}
            defaultExpanded={false}
            expandable={true}
            collectionPath={collection.pathname}
            newSpec={storedSpec || diffResult?.newSpec}
            diffLeftLabel="Last Synced Spec"
            diffRightLabel="Current (in collection)"
            swapDiffSides={true}
            collectionUid={collection.uid}
            sectionKey="drift-local-only"
            renderItemActions={(endpoint) => (
              <Button size="xs" variant="ghost" color="danger" onClick={() => handleDeleteEndpoint(endpoint)} title="Delete endpoint" icon={<IconTrash size={14} />}>
                Delete
              </Button>
            )}
            actions={(
              <Button
                size="xs"
                variant="outline"
                color="danger"
                onClick={handleDeleteAllLocalOnly}
                title="Delete all locally added endpoints"
                icon={<IconTrash size={14} />}
              >
                Delete All
              </Button>
            )}
          />
        )}

        {/* In Sync Endpoints */}
        {collectionDrift?.inSync?.length > 0 && (
          <ChangeSection
            title="In Sync Endpoints"
            // icon={IconCheck}
            count={collectionDrift.inSync.length}
            type="in-sync"
            endpoints={collectionDrift.inSync}
            defaultExpanded={false}
            collectionUid={collection.uid}
            sectionKey="drift-in-sync"
            renderItem={(endpoint, idx) => (
              <EndpointItem
                key={endpoint.id || idx}
                endpoint={endpoint}
                type="in-sync"
              />
            )}
          />
        )}
      </div>
    );
  };

  // Calculate change count for the badge
  const localChangesCount = (collectionDrift?.modified?.length || 0)
    + (collectionDrift?.missing?.length || 0)
    + (collectionDrift?.localOnly?.length || 0);

  // Tabs configuration for ResponsiveTabs
  const syncTabs = useMemo(() => [
    { key: 'overview', label: 'Overview' },
    {
      key: 'local-changes',
      label: 'Local Changes',
      indicator: localChangesCount > 0 ? (
        <sup className="content-indicator ml-1">{localChangesCount}</sup>
      ) : null
    }
  ], [localChangesCount]);

  return (
    <StyledWrapper className={`flex flex-col h-full relative px-4 py-4 overflow-auto ${viewMode === 'review' || viewMode === 'spec-review' ? ' review-active' : ''}`}>
      <div className="sync-page max-w-screen-xl">

        {/* Setup UI (only when not configured) */}
        {!isConfigured && (
          <div className="setup-section">
            <div className="setup-header">
              <h2 className="setup-title">Connect to OpenAPI Spec</h2>
              <p className="setup-description">
                Keep your collection synchronized with an OpenAPI specification. Changes in the spec will be detected automatically.
              </p>
            </div>

            <form
              className="setup-form"
              onSubmit={(e) => {
                e.preventDefault(); handleConnect();
              }}
            >
              <label className="url-label">OpenAPI Specification URL</label>
              <div className="url-row">
                <input
                  type="text"
                  className="url-input"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://api.example.com/openapi.json"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!sourceUrl.trim()}
                  loading={isLoading}
                >
                  Connect
                </Button>
              </div>
              <p className="setup-hint">Supports OpenAPI 3.x specifications in JSON or YAML format</p>
            </form>

            <div className="setup-features">
              <div className="setup-feature">
                <IconCheck size={16} />
                <span>Detect new, modified, and removed endpoints</span>
              </div>
              <div className="setup-feature">
                <IconCheck size={16} />
                <span>Track local changes against the spec</span>
              </div>
              <div className="setup-feature">
                <IconCheck size={16} />
                <span>Sync collection with a single click</span>
              </div>
              <div className="setup-feature">
                <IconCheck size={16} />
                <span>Your tests, assertions, and scripts are preserved during sync</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs - always visible when configured */}
        {isConfigured && (
          <>
            <ResponsiveTabs
              tabs={syncTabs}
              activeTab={activeTab}
              onTabSelect={(tab) => { setActiveTab(tab); }}
            />

            <div className="sync-tab-content">
              {activeTab === 'overview' && (
                <>
                  {viewMode === 'tabs' && (
                    <>
                      <div className="section-description">Keep your collection synchronized with OpenAPI specification.</div>

                      {/* Spec Overview Card with Sync Status Footer */}
                      <SpecInfoCard
                        collection={collection}
                        spec={storedSpec || diffResult?.newSpec}
                        sourceUrl={sourceUrl}
                        onCheck={checkForUpdates}
                        isChecking={isLoading}
                        canCheck={!!sourceUrl.trim()}
                        groupBy={groupBy}
                        diffResult={diffResult}
                        remoteDrift={remoteDrift}
                        onShowDiff={() => setViewMode('spec-review')}
                        onDisconnect={handleDisconnect}
                        error={error}
                        hasLocalDrift={hasLocalDrift}
                        onPreviewAndSync={() => {
                          setPendingSyncMode('sync'); setViewMode('review');
                        }}
                        onSyncNow={handleSyncNow}
                        onReviewAndSync={() => {
                          setPendingSyncMode('sync'); setViewMode('review');
                        }}
                        onDiscardAndSync={() => handleSyncWithMode('reset')}
                        onViewLocalChanges={() => setActiveTab('local-changes')}
                        onResetAllModified={handleRevertAllChanges}
                      />
                    </>
                  )}

                  {viewMode === 'review' && (
                    <SyncReviewPage
                      diffResult={diffResult}
                      remoteDrift={remoteDrift}
                      collectionDrift={collectionDrift}
                      collectionPath={collection.pathname}
                      collectionUid={collection.uid}
                      newSpec={diffResult?.newSpec}
                      isSyncing={isSyncing}
                      onGoBack={() => {
                        setViewMode('tabs'); setPendingSyncMode(null);
                      }}
                      onApplySync={handleApplySync}
                    />
                  )}

                  {viewMode === 'spec-review' && diffResult?.hasRemoteChanges && (
                    <SpecReviewPage
                      diffResult={diffResult}
                      onSync={handleSpecReviewSync}
                      onGoBack={() => setViewMode('tabs')}
                      isSyncing={isSyncing}
                    />
                  )}
                </>
              )}

              {activeTab === 'local-changes' && (
                <div className="main-content-section">
                  {renderCollectionDrift()}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showConfirmModal && (
        <ConfirmSyncModal
          diffResult={diffResult}
          remoteDrift={remoteDrift}
          collectionDrift={collectionDrift}
          isSyncing={isSyncing}
          onCancel={() => {
            setShowConfirmModal(false);
            setPendingSyncMode(null);
          }}
          onSync={(selections) => performSync({ ...selections, endpointDecisions: {} }, pendingSyncMode || 'sync')}
        />
      )}

      {showDisconnectModal && (
        <Modal
          size="sm"
          title="Disconnect Sync"
          hideFooter={true}
          handleCancel={() => {
            setShowDisconnectModal(false); setDeleteSpecFile(false);
          }}
        >
          <div className="disconnect-modal">
            <p className="disconnect-message">
              Are you sure you want to disconnect OpenAPI sync? This will remove the sync configuration but keep your collection intact.
            </p>
            <label className="disconnect-checkbox">
              <input
                type="checkbox"
                checked={deleteSpecFile}
                onChange={(e) => setDeleteSpecFile(e.target.checked)}
              />
              <span>Also delete the local spec file</span>
            </label>
            <div className="disconnect-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDisconnectModal(false); setDeleteSpecFile(false);
                }}
              >
                Cancel
              </Button>
              <Button color="danger" onClick={confirmDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {pendingAction && (
        <Modal size="sm" title={pendingAction.title} hideFooter={true} handleCancel={() => setPendingAction(null)}>
          <div className="action-confirm-modal">
            <p className="confirm-message">{pendingAction.message}</p>
            <div className="confirm-actions">
              <Button variant="ghost" onClick={() => setPendingAction(null)}>
                Cancel
              </Button>
              <Button
                color={pendingAction.type.includes('delete') ? 'danger' : 'primary'}
                onClick={confirmPendingAction}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default OpenAPISyncTab;
