import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { debounce } from 'lodash';
import { interpolate } from '@usebruno/common';
import { loadGrpcMethodsFromReflection } from 'providers/ReduxStore/slices/collections/actions';
import { getAllVariables } from 'utils/collections';

const REFLECTION_DEBOUNCE_MS = 3000;

/**
 * Custom hook for managing reflection data and server discovery
 * @param {Object} item - The request item
 * @param {Object} collection - The collection the item belongs to
 */
export default function useReflectionManagement(item, collection) {
  const dispatch = useDispatch();

  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  const resolveUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const vars = getAllVariables(collection, item);
    return interpolate(url, vars) || url;
  };

  /**
   * Load gRPC methods for a url. Methods a server has already been reflected for are kept by the
   * main process, which answers from them unless this is a manual refresh — that always asks the
   * server again and replaces what was stored for the url.
   * @param {string} url - The gRPC server URL
   * @param {boolean} isManualRefresh - Whether this is a manual refresh
   * @returns {Promise<{methods: Array, error: Error|null, fromCache: boolean}>}
   */
  const loadMethodsFromReflection = async (url, isManualRefresh = false) => {
    const resolvedUrl = resolveUrl(url);
    if (!resolvedUrl) {
      return { methods: [], error: new Error('No URL provided') };
    }

    setIsLoadingMethods(true);
    try {
      const { methods, error, fromCache } = await dispatch(
        loadGrpcMethodsFromReflection(item, collection.uid, resolvedUrl, isManualRefresh)
      );

      if (error) {
        console.error('Error loading gRPC methods:', error);
        return { methods: [], error: error instanceof Error ? error : new Error(error) };
      }

      return { methods, error: null, fromCache };
    } catch (error) {
      console.error('Error loading gRPC methods:', error);
      return { methods: [], error };
    } finally {
      setIsLoadingMethods(false);
    }
  };

  // Keep a ref to the latest loader so the debounced closure isn't stale after
  // renders (item / collection changes).
  const loadRef = useRef(loadMethodsFromReflection);
  loadRef.current = loadMethodsFromReflection;

  const [debouncedLoad] = useState(() =>
    debounce((url, onDone) => {
      loadRef.current(url, false).then((result) => onDone?.(result));
    }, REFLECTION_DEBOUNCE_MS)
  );
  useEffect(() => () => debouncedLoad.cancel(), [debouncedLoad]);

  /**
   * Debounced reflection call. Cancels on unmount.
   * @param {string} url
   * @param {(result: {methods, error, fromCache}) => void} onDone
   */
  const scheduleReflection = (url, onDone) => {
    debouncedLoad(url, onDone);
  };

  return {
    isLoadingMethods,
    loadMethodsFromReflection,
    scheduleReflection
  };
}
