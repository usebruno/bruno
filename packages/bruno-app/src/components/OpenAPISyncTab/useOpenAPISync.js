import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { addTab, focusTab, closeTabs } from 'providers/ReduxStore/slices/tabs';
import { getDefaultRequestPaneTab } from 'utils/collections';
import { clearCollectionState, setCollectionUpdate } from 'providers/ReduxStore/slices/openapi-sync';
import { flattenItems } from 'utils/collections/index';
import { formatIpcError } from 'utils/common/error';

const useOpenAPISync = (collection) => {
  const dispatch = useDispatch();
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];

  // Core state
  const [sourceUrl, setSourceUrl] = useState(openApiSyncConfig?.sourceUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [specDrift, setSpecDrift] = useState(null);
  // Collection drift state
  const [collectionDrift, setCollectionDrift] = useState(null);
  const [remoteDrift, setRemoteDrift] = useState(null);
  const [isDriftLoading, setIsDriftLoading] = useState(false);
  const [storedSpec, setStoredSpec] = useState(null);

  const tabs = useSelector((state) => state.tabs.tabs);

  const isConfigured = !!openApiSyncConfig?.sourceUrl;

  // Clear Redux state when the sync tab is closed (unmount)
  useEffect(() => {
    return () => {
      dispatch(clearCollectionState({ collectionUid: collection.uid }));
    };
  }, [collection.uid]);

  // Flatten collection items including nested items in folders
  const allHttpItems = useMemo(() => {
    return flattenItems(collection?.items || []).filter((item) => item.type === 'http-request');
  }, [collection?.items]);

  const httpItemCount = useMemo(() => {
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

  const prevItemCountRef = useRef(httpItemCount);
  const isDriftLoadingRef = useRef(false);

  const loadCollectionDrift = async ({ clear = false } = {}) => {
    if (isDriftLoadingRef.current && !clear) return;
    isDriftLoadingRef.current = true;
    if (clear) setCollectionDrift(null);
    setIsDriftLoading(true);
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:get-collection-drift', {
        collectionPath: collection.pathname,
        brunoConfig: collection.brunoConfig
      });

      if (!result.error) {
        setCollectionDrift(result);
      }
    } catch (err) {
      console.error('Error loading collection drift:', err);
    } finally {
      isDriftLoadingRef.current = false;
      setIsDriftLoading(false);
    }
  };

  const checkForUpdates = async ({ sourceUrlOverride } = {}) => {
    const effectiveUrl = (sourceUrlOverride ?? sourceUrl).trim();
    if (!effectiveUrl) {
      setError('Please enter a URL or select a file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileNotFound(false);
    setSpecDrift(null);
    setRemoteDrift(null);

    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:compare-openapi-specs', {
        collectionUid: collection.uid,
        collectionPath: collection.pathname,
        sourceUrl: effectiveUrl,
        environmentContext: {
          activeEnvironmentUid: collection.activeEnvironmentUid,
          environments: collection.environments,
          runtimeVariables: collection.runtimeVariables,
          globalEnvironmentVariables: collection.globalEnvironmentVariables
        }
      });

      if (result.errorCode === 'SOURCE_FILE_NOT_FOUND') {
        setFileNotFound(true);
        setError(result.error);
        return;
      }

      setSpecDrift(result);
      if (result.storedSpec) {
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
        const remoteComparison = await ipcRenderer.invoke('renderer:get-collection-drift', {
          collectionPath: collection.pathname,
          brunoConfig: collection.brunoConfig,
          compareSpec: result.newSpec
        });
        if (remoteComparison.error) {
          console.error('Error computing remote drift:', remoteComparison.error);
          setError(remoteComparison.error);
        } else {
          setRemoteDrift(remoteComparison);
        }
      }

      // Refresh collection drift (stored spec vs collection) — skip if no stored spec
      if (!result.storedSpecMissing) {
        await loadCollectionDrift({ clear: true });
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

  useEffect(() => {
    if (isConfigured) {
      checkForUpdates();
      loadCollectionDrift();
    }
  }, [isConfigured]);

  // Reload drift when collection items change (e.g., endpoint deleted from sidebar)
  useEffect(() => {
    if (prevItemCountRef.current !== httpItemCount && isConfigured) {
      prevItemCountRef.current = httpItemCount;
      loadCollectionDrift();
    }
  }, [httpItemCount, isConfigured]);

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
        collectionUid: collection.uid,
        collectionPath: collection.pathname,
        sourceUrl: sourceUrl.trim(),
        environmentContext: {
          activeEnvironmentUid: collection.activeEnvironmentUid,
          environments: collection.environments,
          runtimeVariables: collection.runtimeVariables,
          globalEnvironmentVariables: collection.globalEnvironmentVariables
        }
      });

      if (result.isValid === false) {
        setSpecDrift(result);
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
        const drift = await ipcRenderer.invoke('renderer:get-collection-drift', {
          collectionPath: collection.pathname,
          brunoConfig: collection.brunoConfig,
          compareSpec: result.newSpec
        });

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

  const handleDisconnect = async () => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:remove-openapi-sync-config', {
        collectionPath: collection.pathname,
        sourceUrl: openApiSyncConfig?.sourceUrl || sourceUrl,
        deleteSpecFile: true
      });
      setSourceUrl('');
      setSpecDrift(null);
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

  // Reload drift — passed to useEndpointActions so it can refresh after actions
  const reloadDrift = () => loadCollectionDrift({ clear: true });

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
      // Re-check with new settings — pass newUrl directly to avoid stale closure
      await checkForUpdates({ sourceUrlOverride: newUrl });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    }
  };

  return {
    // State
    sourceUrl, setSourceUrl,
    isLoading,
    error, setError,
    fileNotFound,
    specDrift,
    collectionDrift,
    remoteDrift,
    isDriftLoading,
    storedSpec,

    // Handlers
    checkForUpdates,
    handleConnect,
    handleDisconnect,
    handleSaveSettings,
    openEndpointInTab,
    reloadDrift
  };
};

export default useOpenAPISync;
