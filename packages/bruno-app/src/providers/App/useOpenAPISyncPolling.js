import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkActiveWorkspaceCollectionsForUpdates } from 'providers/ReduxStore/slices/openapi-sync';
import { normalizePath } from 'utils/common/path';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { selectCollections } from 'src/selectors/collections';
import { selectActiveWorkspace } from 'src/selectors/workspaces';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

const useOpenAPISyncPolling = () => {
  const dispatch = useDispatch();

  const isOpenAPISyncEnabled = useBetaFeature(BETA_FEATURES.OPENAPI_SYNC);
  // Global toggle for pausing all OpenAPI sync polling
  const pollingEnabled = useSelector((state) => state.openapiSync?.pollingEnabled ?? true) && isOpenAPISyncEnabled;
  const collections = useSelector(selectCollections);
  const activeWorkspace = useSelector(selectActiveWorkspace);
  const intervalRef = useRef(null);

  // Filter to only active workspace collections
  const activeWorkspaceCollections = useMemo(() => {
    if (!activeWorkspace) return [];
    return collections.filter((c) =>
      activeWorkspace.collections?.some((wc) => normalizePath(wc.path) === normalizePath(c.pathname))
    );
  }, [activeWorkspace, collections]);

  // Derive a stable boolean so polling doesn't restart on every collection mutation
  const hasSyncableCollections = useMemo(
    () => activeWorkspaceCollections.some((c) => {
      const syncConfig = c.brunoConfig?.openapi?.[0];
      return syncConfig?.sourceUrl && syncConfig.autoCheck !== false;
    }),
    [activeWorkspaceCollections]
  );

  useEffect(() => {
    if (!pollingEnabled || !hasSyncableCollections) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check after a short delay (to let the app initialize)
    const initialTimeout = setTimeout(() => {
      dispatch(checkActiveWorkspaceCollectionsForUpdates());
    }, 10000); // 10 seconds after app starts

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      dispatch(checkActiveWorkspaceCollectionsForUpdates());
    }, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [dispatch, pollingEnabled, hasSyncableCollections]);

  return null;
};

export default useOpenAPISyncPolling;
