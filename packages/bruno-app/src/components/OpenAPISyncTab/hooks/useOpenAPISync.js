import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { getDefaultRequestPaneTab } from 'utils/collections';
import {
  clearCollectionState,
  setCollectionUpdate,
  setStoredSpec,
  setStoredSpecMeta,
  setDrift
} from 'providers/ReduxStore/slices/openapi-sync';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import { isHttpUrl } from 'utils/url/index';
import { flattenItems } from 'utils/collections/index';
import { formatIpcError } from 'utils/common/error';
import { countEndpoints } from '../utils';
import { useTranslation } from 'react-i18next';

const useOpenAPISync = (collection) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];

  // Core state
  const [sourceUrl, setSourceUrl] = useState(openApiSyncConfig?.sourceUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [isDriftLoading, setIsDriftLoading] = useState(false);

  const drift = useSelector((state) => state.openapiSync?.drift?.[collection.uid] || null);
  const specDrift = drift?.specDrift || null;
  const collectionDrift = drift?.collectionDrift || null;
  const remoteDrift = drift?.remoteDrift || null;
  const storedSpec = useSelector((state) => state.openapiSync?.storedSpec?.[collection.uid] || null);

  const updateDrift = (patch) => dispatch(setDrift({ collectionUid: collection.uid, patch }));

  // useStore: tabs are read only inside handlers — useSelector would re-render on every tab change.
  const store = useStore();

  const isConfigured = !!openApiSyncConfig?.sourceUrl;

  const updateStoredSpec = (spec) => {
    dispatch(setStoredSpec({ collectionUid: collection.uid, spec }));
    dispatch(setStoredSpecMeta({
      collectionUid: collection.uid,
      title: spec?.info?.title || null,
      version: spec?.info?.version || null,
      endpointCount: spec ? countEndpoints(spec) : null
    }));
  };

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
    const tabs = store.getState().tabs?.tabs || [];
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

  const isDriftLoadingRef = useRef(false);
  const specDriftRef = useRef(specDrift);

  const loadCollectionDrift = async ({ clear = false } = {}) => {
    if (isDriftLoadingRef.current && !clear) return;
    isDriftLoadingRef.current = true;
    if (clear) updateDrift({ collectionDrift: null });
    setIsDriftLoading(true);
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:get-collection-drift', {
        collectionPath: collection.pathname
      });

      if (!result.error) {
        updateDrift({ collectionDrift: result, itemCountAtLastFetch: httpItemCount });
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
      setError(t('OPENAPI_SYNC.ERROR_ENTER_URL_OR_FILE'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileNotFound(false);
    updateDrift({ fetching: true });

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

      updateDrift({ specDrift: result, lastChecked: Date.now() });
      updateStoredSpec(result.storedSpec || null);

      // Update Redux store so toolbar status stays in sync
      dispatch(setCollectionUpdate({
        collectionUid: collection.uid,
        hasUpdates: result.isValid !== false && result.hasChanges,
        error: result.isValid === false ? result.error : null
      }));

      // Fetch remote drift (remote spec vs collection) for collection-centric categorization
      if (result.newSpec) {
        const remoteComparison = await ipcRenderer.invoke('renderer:get-collection-drift', {
          collectionPath: collection.pathname,
          compareSpec: result.newSpec
        });
        if (remoteComparison.error) {
          console.error('Error computing remote drift:', remoteComparison.error);
          setError(remoteComparison.error);
        } else {
          updateDrift({ remoteDrift: remoteComparison });
        }
      }

      // Refresh collection drift (stored spec vs collection) — skip if no stored spec
      if (!result.storedSpecMissing) {
        await loadCollectionDrift({ clear: true });
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError(formatIpcError(err) || t('OPENAPI_SYNC.ERROR_FAILED_TO_CHECK'));
      dispatch(setCollectionUpdate({
        collectionUid: collection.uid,
        hasUpdates: false,
        error: formatIpcError(err) || t('OPENAPI_SYNC.ERROR_FAILED_TO_CHECK')
      }));
    } finally {
      updateDrift({ fetching: false });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && !drift?.specDrift && !drift?.fetching) {
      checkForUpdates();
    }
  }, [isConfigured]);

  // Reload drift when the collection's HTTP item count differs from what was recorded at the last fetch.
  useEffect(() => {
    if (!isConfigured) return;
    const cachedCount = drift?.itemCountAtLastFetch;
    if (cachedCount !== undefined && cachedCount !== httpItemCount && !drift?.fetching) {
      loadCollectionDrift();
    }
  }, [httpItemCount, isConfigured]);

  const handleConnect = async () => {
    const trimmedUrl = sourceUrl.trim();
    if (!trimmedUrl) {
      setError(t('OPENAPI_SYNC.ERROR_ENTER_URL_OR_FILE'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileNotFound(false);

    try {
      // Validate it's a valid OpenAPI spec before proceeding (URL only; files are validated at picker)
      if (isHttpUrl(trimmedUrl)) {
        try {
          const { specType } = await fetchAndValidateApiSpecFromUrl({ url: trimmedUrl });
          if (specType !== 'openapi') {
            setError(t('OPENAPI_SYNC.ERROR_INVALID_URL_SPEC'));
            return;
          }
        } catch {
          setError(t('OPENAPI_SYNC.ERROR_INVALID_URL_SPEC'));
          return;
        }
      }

      const { ipcRenderer } = window;

      // Validate the spec first
      const result = await ipcRenderer.invoke('renderer:compare-openapi-specs', {
        collectionUid: collection.uid,
        collectionPath: collection.pathname,
        sourceUrl: trimmedUrl,
        environmentContext: {
          activeEnvironmentUid: collection.activeEnvironmentUid,
          environments: collection.environments,
          runtimeVariables: collection.runtimeVariables,
          globalEnvironmentVariables: collection.globalEnvironmentVariables
        }
      });

      if (result.isValid === false) {
        updateDrift({ specDrift: result });
        setError(result.error);
        return;
      }

      // Save sync config (no spec file yet — deferred to first sync unless collection already matches)
      await ipcRenderer.invoke('renderer:update-openapi-sync-config', {
        collectionPath: collection.pathname,
        config: {
          sourceUrl: trimmedUrl,
          groupBy: 'tags',
          autoCheck: true,
          autoCheckInterval: 5
        }
      });

      // Check if collection already matches the spec
      if (result.newSpec) {
        const initialDrift = await ipcRenderer.invoke('renderer:get-collection-drift', {
          collectionPath: collection.pathname,
          compareSpec: result.newSpec
        });

        const isInSync = !initialDrift.error
          && (!initialDrift.missing || initialDrift.missing.length === 0)
          && (!initialDrift.modified || initialDrift.modified.length === 0)
          && (!initialDrift.localOnly || initialDrift.localOnly.length === 0);

        if (isInSync) {
          // Collection matches — save spec file silently to complete setup
          await ipcRenderer.invoke('renderer:save-openapi-spec', {
            collectionPath: collection.pathname,
            specContent: result.newSpecContent || JSON.stringify(result.newSpec, null, 2)
          });
        }
      }

      toast.success(t('OPENAPI_SYNC.TOAST_CONNECTED'));
    } catch (err) {
      console.error('Error connecting OpenAPI sync:', err);
      setError(formatIpcError(err) || t('OPENAPI_SYNC.ERROR_FAILED_TO_CONNECT'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { ipcRenderer } = window;
      await ipcRenderer.invoke('renderer:remove-openapi-sync-config', {
        collectionPath: collection.pathname,
        deleteSpecFile: true
      });
      setSourceUrl('');

      // Clear Redux state for this collection
      dispatch(clearCollectionState({ collectionUid: collection.uid }));

      // Close the openapi-spec tab if open (spec file no longer exists)
      const tabs = store.getState().tabs?.tabs || [];
      const specTab = tabs.find((t) => t.collectionUid === collection.uid && t.type === 'openapi-spec');
      if (specTab) {
        dispatch(closeTabs({ tabUids: [specTab.uid] }));
      }

      toast.success(t('OPENAPI_SYNC.TOAST_DISCONNECTED'));
    } catch (err) {
      console.error('Error disconnecting sync:', err);
      toast.error(t('OPENAPI_SYNC.ERROR_FAILED_TO_DISCONNECT'));
    }
  };

  // Keep ref in sync so reloadDrift always reads the latest specDrift
  specDriftRef.current = specDrift;

  // Reload both drifts — passed to useEndpointActions so it can refresh after actions.
  // Uses specDriftRef to avoid stale closure over specDrift state.
  const reloadDrift = async () => {
    await loadCollectionDrift({ clear: true });
    // Refresh remoteDrift if we have a remote spec cached from the last check
    const currentSpecDrift = specDriftRef.current;
    if (currentSpecDrift?.newSpec) {
      try {
        const { ipcRenderer } = window;
        const remoteComparison = await ipcRenderer.invoke('renderer:get-collection-drift', {
          collectionPath: collection.pathname,
          compareSpec: currentSpecDrift.newSpec
        });
        if (!remoteComparison.error) {
          updateDrift({ remoteDrift: remoteComparison });
        }
      } catch (err) {
        console.error('Error reloading remote drift:', err);
      }
    }
  };

  // Save connection settings from the modal
  const handleSaveSettings = async ({ sourceUrl: newUrl, autoCheck, autoCheckInterval }) => {
    const sourceUrlChanged = newUrl !== openApiSyncConfig?.sourceUrl;

    // Validate the spec before saving if source URL changed (URL only; files are validated at picker)
    // Kept outside try-catch so validation errors propagate to the caller and the modal stays open
    if (sourceUrlChanged && isHttpUrl(newUrl)) {
      let specType;
      try {
        ({ specType } = await fetchAndValidateApiSpecFromUrl({ url: newUrl }));
      } catch {
        toast.error(t('OPENAPI_SYNC.ERROR_INVALID_URL_SPEC'));
        throw new Error('Invalid OpenAPI specification');
      }
      if (specType !== 'openapi') {
        toast.error(t('OPENAPI_SYNC.ERROR_INVALID_URL_SPEC'));
        throw new Error('Invalid OpenAPI specification');
      }
    }

    try {
      const { ipcRenderer } = window;

      await ipcRenderer.invoke('renderer:update-openapi-sync-config', {
        collectionPath: collection.pathname,
        config: {
          sourceUrl: newUrl,
          autoCheck,
          autoCheckInterval
        }
      });
      setSourceUrl(newUrl);
      setFileNotFound(false);
      toast.success(t('OPENAPI_SYNC.TOAST_SETTINGS_SAVED'));
      // Re-check with new settings — pass newUrl directly to avoid stale closure
      await checkForUpdates({ sourceUrlOverride: newUrl });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(t('OPENAPI_SYNC.ERROR_FAILED_TO_SAVE_SETTINGS'));
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
