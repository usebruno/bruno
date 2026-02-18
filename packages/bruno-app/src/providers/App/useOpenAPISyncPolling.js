import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAllCollectionsForUpdates, setLastPollTime } from 'providers/ReduxStore/slices/openapi-sync';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

const useOpenAPISyncPolling = () => {
  const dispatch = useDispatch();
  const pollingEnabled = useSelector((state) => state.openapiSync?.pollingEnabled ?? true);
  const collections = useSelector((state) => state.collections?.collections || []);
  const intervalRef = useRef(null);

  // Derive a stable boolean so polling doesn't restart on every collection mutation
  const hasSyncableCollections = useMemo(
    () => collections.some((c) => c.brunoConfig?.openapi?.sync?.sourceUrl),
    [collections]
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
      dispatch(checkAllCollectionsForUpdates());
    }, 10000); // 10 seconds after app starts

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      dispatch(checkAllCollectionsForUpdates());
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
