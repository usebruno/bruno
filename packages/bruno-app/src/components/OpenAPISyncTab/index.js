import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconLoader2,
  IconCheck,
  IconPlus,
  IconTrash,
  IconArrowBackUp,
  IconExternalLink,
  IconClock,
  IconAlertTriangle
} from '@tabler/icons';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import Modal from 'components/Modal';
import { addTab, focusTab, closeTabs } from 'providers/ReduxStore/slices/tabs';
import { getDefaultRequestPaneTab } from 'utils/collections';
import { clearCollectionUpdate, clearCollectionState, setCollectionUpdate, setTabUiState, selectTabUiState } from 'providers/ReduxStore/slices/openapi-sync';
import { flattenItems } from 'utils/collections/index';
import { formatIpcError } from 'utils/common/error';
import Help from 'components/Help';
import StyledWrapper from './StyledWrapper';
import ConfirmSyncModal from './ConfirmSyncModal';
import SyncReviewPage from './SyncReviewPage';
import SpecInfoCard from './SpecInfoCard';
import SpecStatusSection from './SpecStatusSection';
import ChangeSection, { EndpointItem } from './ChangeSection';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const OpenAPISyncTab = ({ collection }) => {
  const dispatch = useDispatch();
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];

  // Core state
  const [sourceUrl, setSourceUrl] = useState(openApiSyncConfig?.sourceUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Setup form state
  const [setupMode, setSetupMode] = useState('url'); // 'url' | 'file'
  const setupFileInputRef = useRef(null);

  // For file-not-found banner actions
  const browseForFileRef = useRef(null);
  const [triggerOpenSettings, setTriggerOpenSettings] = useState(false);

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
  const viewMode = tabUiState.viewMode || 'tabs';
  const tabs = useSelector((state) => state.tabs.tabs);
  const lastCheckedAt = useSelector((state) => state.openapiSync?.collectionUpdates?.[collection.uid]?.lastChecked);

  const setViewMode = (mode) => dispatch(setTabUiState({ collectionUid: collection.uid, viewMode: mode }));

  const isConfigured = !!openApiSyncConfig?.sourceUrl;

  // Clear Redux state when the sync tab is closed (unmount)
  useEffect(() => {
    return () => {
      dispatch(clearCollectionState({ collectionUid: collection.uid }));
    };
  }, [collection.uid]);

  // Derived sync status
  const hasLocalDrift = collectionDrift && (
    (collectionDrift.modified?.length > 0)
    || (collectionDrift.missing?.length > 0)
  );
  // Create a fingerprint of collection items to detect changes (including nested items in folders)
  const allHttpItems = useMemo(() => {
    return flattenItems(collection?.items || []).filter((item) => item.type === 'http-request');
  }, [collection?.items]);

  const collectionFingerprint = useMemo(() => {
    return String(allHttpItems.filter((item) => !item.partial && !item.loading).length);
  }, [allHttpItems]);

  // Map endpoint drift id (METHOD:path) → collection item uid
  const endpointUidMap = useMemo(() => {
    const normalize = (url) => (url || '')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/\?.*$/, '')
      .replace(/{([^}]+)}/g, ':$1')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
    const map = {};
    allHttpItems.forEach((item) => {
      if (item.request?.method && item.request?.url) {
        const key = `${item.request.method.toUpperCase()}:${normalize(item.request.url)}`;
        map[key] = item.uid;
      }
    });
    return map;
  }, [allHttpItems]);

  // Open an endpoint in a tab (focus existing or add new), same as sidebar click
  const openEndpointInTab = (endpointId) => {
    const itemUid = endpointUidMap[endpointId];
    if (!itemUid) return;
    const existingTab = tabs.find((t) => t.uid === itemUid);
    if (existingTab) {
      dispatch(focusTab({ uid: itemUid }));
    } else {
      const item = allHttpItems.find((i) => i.uid === itemUid);
      dispatch(addTab({
        uid: itemUid,
        collectionUid: collection.uid,
        requestPaneTab: item ? getDefaultRequestPaneTab(item) : undefined,
        type: 'request'
      }));
    }
  };

  const prevFingerprintRef = useRef(collectionFingerprint);
  // Tracks when the last disk-read drift check happened, so fingerprint-triggered
  // reloads don't overwrite fresh results with stale Redux data.
  const lastDiskReadRef = useRef(0);

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
      // After sync/actions, file watcher events update Redux incrementally.
      // Skip reload if a disk-read check was done recently to avoid stale overwrites.
      const timeSinceLastDiskRead = Date.now() - lastDiskReadRef.current;
      if (timeSinceLastDiskRead > 3000) {
        loadCollectionDrift();
      }
    }
  }, [collectionFingerprint, isConfigured]);

  const getCollectionItemsForDrift = () => {
    const allItems = flattenItems(collection.items || []);
    return allItems
      .filter((item) => item.type === 'http-request' && !item.partial && !item.loading && !item.isTransient && item.request)
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
    if (readFromDisk) {
      lastDiskReadRef.current = Date.now();
      // Clear stale data so the loading spinner shows instead of outdated results
      setCollectionDrift(null);
    }
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
      setError('Please enter a URL or select a file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileNotFound(false);
    setDiffResult(null);
    setRemoteDrift(null);

    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:compare-openapi-specs', {
        collectionPath: collection.pathname,
        sourceUrl: sourceUrl.trim()
      });

      if (result.errorCode === 'LOCAL_FILE_NOT_FOUND') {
        setFileNotFound(true);
        setError(result.error);
        return;
      }

      setDiffResult(result);
      if (result.newSpec) {
        setStoredSpec(result.newSpec);
      } else if (result.storedSpec) {
        setStoredSpec(result.storedSpec);
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
      setError(formatIpcError(err) || 'Failed to check for updates');
      dispatch(setCollectionUpdate({
        collectionUid: collection.uid,
        hasUpdates: false,
        diff: null,
        error: formatIpcError(err) || 'Failed to check for updates'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!sourceUrl.trim()) {
      setError('Please enter a URL or select a file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileNotFound(false);

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
          autoCheck: true,
          autoCheckInterval: 5
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
            sourceUrl: sourceUrl.trim()
          });
        }
      }

      toast.success('OpenAPI sync connected');
    } catch (err) {
      console.error('Error connecting OpenAPI sync:', err);
      setError(formatIpcError(err) || 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const handleDisconnect = () => {
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:remove-openapi-sync-config', {
        collectionPath: collection.pathname,
        sourceUrl: openApiSyncConfig?.sourceUrl || sourceUrl,
        deleteSpecFile: true
      });
      setSourceUrl('');
      setDiffResult(null);
      setCollectionDrift(null);
      setRemoteDrift(null);
      setStoredSpec(null);

      // Clear Redux state for this collection
      dispatch(clearCollectionState({ collectionUid: collection.uid }));

      // Close the openapi-spec tab if open (spec file no longer exists)
      const specTab = tabs.find((t) => t.collectionUid === collection.uid && t.type === 'openapi-spec');
      if (specTab) {
        dispatch(closeTabs({ tabUids: [specTab.uid] }));
      }

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
      setError(formatIpcError(err) || 'Failed to sync collection');
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
      case 'discard-all':
        await executeRevertAllChanges();
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

  // Open the OpenAPI spec in a dedicated tab
  const handleViewSpec = () => {
    dispatch(addTab({
      uid: uuid(),
      collectionUid: collection.uid,
      type: 'openapi-spec'
    }));
  };

  // Save connection settings from the modal
  const handleSaveSettings = async ({ sourceUrl: newUrl, autoCheck, autoCheckInterval }) => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:update-openapi-sync-config', {
        collectionPath: collection.pathname,
        oldSourceUrl: openApiSyncConfig?.sourceUrl,
        config: {
          sourceUrl: newUrl,
          autoCheck,
          autoCheckInterval
        }
      });
      setSourceUrl(newUrl);
      setFileNotFound(false);
      toast.success('Settings saved');
      // Re-check with new settings
      await checkForUpdates();
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    }
  };

  // Spec update counts for summary card sub-lines
  const specAdded = diffResult?.added?.length || 0;
  const specModified = diffResult?.modified?.length || 0;
  const specRemoved = diffResult?.removed?.length || 0;

  return (
    <StyledWrapper className={`flex flex-col h-full relative px-4 py-4 overflow-auto ${viewMode === 'review' ? ' review-active' : ''}`}>
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
              <label className="url-label">OpenAPI Specification</label>
              <div className="url-row">
                <div className="setup-mode-toggle">
                  <button
                    type="button"
                    className={`setup-mode-btn ${setupMode === 'url' ? 'active' : ''}`}
                    onClick={() => {
                      setSetupMode('url'); setSourceUrl('');
                    }}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    className={`setup-mode-btn ${setupMode === 'file' ? 'active' : ''}`}
                    onClick={() => {
                      setSetupMode('file'); setSourceUrl('');
                    }}
                  >
                    File
                  </button>
                </div>

                {setupMode === 'url' ? (
                  <input
                    type="text"
                    className="url-input"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://api.example.com/openapi.json"
                  />
                ) : (
                  <>
                    <input
                      ref={setupFileInputRef}
                      type="file"
                      accept=".json,.yaml,.yml"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const filePath = window.ipcRenderer.getFilePath(file);
                          setSourceUrl(filePath);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="url-input file-pick-btn"
                      onClick={() => setupFileInputRef.current?.click()}
                    >
                      {sourceUrl ? sourceUrl.split(/[\\/]/).pop() : 'Choose file...'}
                    </button>
                  </>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={!sourceUrl.trim()}
                  loading={isLoading}
                >
                  Connect
                </Button>
              </div>
              <p className="setup-hint">
                {setupMode === 'url'
                  ? 'Supports OpenAPI 3.x specifications in JSON or YAML format'
                  : 'Select a local OpenAPI/Swagger JSON or YAML file'}
              </p>
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

        {/* Unified view — no tabs */}
        {isConfigured && (
          <>
            {viewMode === 'tabs' && (
              <>
                {/* Spec Header */}
                <SpecInfoCard
                  collection={collection}
                  spec={storedSpec || diffResult?.newSpec}
                  sourceUrl={sourceUrl}
                  onDisconnect={handleDisconnect}
                  onViewSpec={handleViewSpec}
                  onSaveSettings={handleSaveSettings}
                  triggerOpenSettings={triggerOpenSettings}
                  onTriggerOpenSettingsHandled={() => setTriggerOpenSettings(false)}
                />

                {/* File not found banner */}
                {fileNotFound && (
                  <div className="file-not-found-banner">
                    <div className="file-not-found-content">
                      <IconAlertTriangle size={16} className="file-not-found-icon" />
                      <div>
                        <div className="file-not-found-title">Spec file not found</div>
                        <div className="file-not-found-desc">
                          The file at <code>{sourceUrl}</code> could not be found — it may have been moved or deleted.
                        </div>
                      </div>
                    </div>
                    <div className="file-not-found-actions">
                      <input
                        ref={browseForFileRef}
                        type="file"
                        accept=".json,.yaml,.yml"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const filePath = window.ipcRenderer.getFilePath(file);
                            await handleSaveSettings({
                              sourceUrl: filePath,
                              autoCheck: openApiSyncConfig?.autoCheck !== false,
                              autoCheckInterval: openApiSyncConfig?.autoCheckInterval || 5
                            });
                          }
                        }}
                      />
                      <Button variant="ghost" size="sm" onClick={() => setTriggerOpenSettings(true)}>
                        Update connection settings
                      </Button>
                      <Button size="sm" onClick={() => browseForFileRef.current?.click()}>
                        Browse for file
                      </Button>
                    </div>
                  </div>
                )}

                {/* Spec Status — always-visible banner with check for updates */}
                <SpecStatusSection
                  diffResult={diffResult}
                  storedSpec={storedSpec}
                  openApiSyncConfig={openApiSyncConfig}
                  lastCheckedAt={lastCheckedAt}
                  error={error}
                  isLoading={isLoading}
                  hasLocalDrift={hasLocalDrift}
                  specAdded={specAdded}
                  specModified={specModified}
                  specRemoved={specRemoved}
                  sourceUrl={sourceUrl}
                  onCheck={checkForUpdates}
                  onDismissError={() => setError(null)}
                  onPreviewAndSync={() => {
                    setPendingSyncMode('sync'); setViewMode('review');
                  }}
                  onSyncNow={handleSyncNow}
                  onReviewAndSync={() => {
                    setPendingSyncMode('sync'); setViewMode('review');
                  }}
                />

                {/* Loading state */}
                {isDriftLoading && !collectionDrift && (
                  <div className="state-message">
                    <IconLoader2 size={24} className="animate-spin" />
                    <span>Checking collection status...</span>
                  </div>
                )}

                {/* Collection Status — summary cards + change sections */}
                {collectionDrift && !collectionDrift.noStoredSpec && (
                  <div className="collection-status-section">
                    <div className="sync-summary-title-row">
                      <div>
                        <div className="sync-summary-title">Collection Status</div>
                        <div className="sync-summary-subtitle">Changes made to the collection since the last sync</div>
                      </div>
                      {openApiSyncConfig?.lastSyncDate && (
                        <div className="last-synced-pill">
                          <IconClock size={13} />
                          <span>Last synced</span>
                          <strong>v{diffResult?.storedVersion || storedSpec?.info?.version || '?'}</strong>
                          <span className="last-synced-sep">&middot;</span>
                          <span>{formatRelativeTime(openApiSyncConfig.lastSyncDate)}</span>
                        </div>
                      )}
                    </div>
                    <div className="sync-summary-cards">
                      <div className="summary-card">
                        <span className="card-info-icon"><Help icon="info" size={12} placement="top" width={220}>Endpoints that match the last synced spec exactly</Help></span>
                        <div className="summary-count-row">
                          <span className="summary-count green">{collectionDrift.inSync?.length || 0}</span>
                          <span className="summary-count-unit">{collectionDrift.inSync?.length > 1 ? 'endpoints' : 'endpoint'}</span>
                        </div>
                        <div className="summary-label">In Sync with Spec</div>
                      </div>
                      <div className="summary-card">
                        <span className="card-info-icon"><Help icon="info" size={12} placement="top" width={220}>Endpoints that have been edited in your collection and now differ from the spec</Help></span>
                        <div className="summary-count-row">
                          <span className="summary-count amber">{collectionDrift.modified?.length || 0}</span>
                          <span className="summary-count-unit">{collectionDrift.modified?.length > 1 ? 'endpoints' : 'endpoint'}</span>
                        </div>
                        <div className="summary-label">Modified in Collection</div>
                      </div>
                      <div className="summary-card">
                        <span className="card-info-icon"><Help icon="info" size={12} placement="top" width={220}>Endpoints from the spec that were removed from your collection</Help></span>
                        <div className="summary-count-row">
                          <span className="summary-count red">{collectionDrift.missing?.length || 0}</span>
                          <span className="summary-count-unit">{collectionDrift.missing?.length > 1 ? 'endpoints' : 'endpoint'}</span>
                        </div>
                        <div className="summary-label">Deleted from Collection</div>
                      </div>
                      <div className="summary-card">
                        <span className="card-info-icon"><Help icon="info" size={12} placement="top" width={220}>Endpoints in your collection that don't exist in the spec</Help></span>
                        <div className="summary-count-row">
                          <span className="summary-count muted">{collectionDrift.localOnly?.length || 0}</span>
                          <span className="summary-count-unit">{collectionDrift.localOnly?.length > 1 ? 'endpoints' : 'endpoint'}</span>
                        </div>
                        <div className="summary-label">Added to Collection</div>
                      </div>
                    </div>
                    {(collectionDrift.modified?.length > 0 || collectionDrift.missing?.length > 0 || collectionDrift.localOnly?.length > 0) && (
                      <div className="discard-all-row">
                        <Button
                          size="xs"
                          variant="ghost"
                          color="danger"
                          onClick={() => setPendingAction({
                            type: 'discard-all',
                            message: 'Are you sure you want to discard all local changes? This will reset modified endpoints, restore deleted endpoints, and remove locally created endpoints.'
                          })}
                        >
                          Discard All Changes
                        </Button>
                      </div>
                    )}
                    {/* Modified in Collection */}
                    {collectionDrift.modified?.length > 0 && (
                      <ChangeSection
                        title="Modified in Collection"
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
                          <>
                            <Button size="xs" variant="ghost" onClick={() => openEndpointInTab(endpoint.id)} title="Open in tab" icon={<IconExternalLink size={14} />}>
                              Open
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => handleResetEndpoint(endpoint)} title="Reset to spec" icon={<IconArrowBackUp size={14} />}>
                              Reset
                            </Button>
                          </>
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

                    {/* Deleted from Collection */}
                    {collectionDrift.missing?.length > 0 && (
                      <ChangeSection
                        title="Deleted from Collection"
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
                          <Button size="xs" variant="ghost" onClick={() => handleAddMissingEndpoint(endpoint)} title="Restore to collection" icon={<IconPlus size={14} />}>
                            Restore
                          </Button>
                        )}
                        actions={(
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleAddAllMissing()}
                            title="Add all deleted endpoints back to collection"
                            icon={<IconPlus size={14} />}
                          >
                            Restore All
                          </Button>
                        )}
                      />
                    )}

                    {/* Added to Collection */}
                    {collectionDrift.localOnly?.length > 0 && (
                      <ChangeSection
                        title="Added to Collection"
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
                          <>
                            <Button size="xs" variant="ghost" onClick={() => openEndpointInTab(endpoint.id)} title="Open in tab" icon={<IconExternalLink size={14} />}>
                              Open
                            </Button>
                            <Button size="xs" variant="ghost" color="danger" onClick={() => handleDeleteEndpoint(endpoint)} title="Delete endpoint" icon={<IconTrash size={14} />}>
                              Delete
                            </Button>
                          </>
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

                    {/* In Sync */}
                    {collectionDrift.inSync?.length > 0 && (
                      <ChangeSection
                        title="In Sync with Spec"
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
                            actions={(
                              <Button size="xs" variant="ghost" onClick={() => openEndpointInTab(endpoint.id)} title="Open in tab" icon={<IconExternalLink size={14} />}>
                                Open
                              </Button>
                            )}
                          />
                        )}
                      />
                    )}
                  </div>
                )}
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
          handleCancel={() => setShowDisconnectModal(false)}
        >
          <div className="disconnect-modal">
            <p className="disconnect-message">
              <>Are you sure you want to disconnect OpenAPI sync? </> <br /> <br />
              <>This will only disconnect the sync configuration. Your collection will remain intact.</>
            </p>
            <div className="disconnect-actions">
              <Button
                variant="ghost"
                onClick={() => setShowDisconnectModal(false)}
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
