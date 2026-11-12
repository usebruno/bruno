import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { debounce } from 'lodash';
import { interpolate } from '@usebruno/common';
import { loadGrpcMethodsFromReflection } from 'providers/ReduxStore/slices/collections/actions';
import useLocalStorage from 'hooks/useLocalStorage/index';
import { getAllVariables } from 'utils/collections';

const REFLECTION_DEBOUNCE_MS = 3000;
const REFLECTION_CACHE_KEY = 'bruno.grpc.reflectionCache';

// What a non-string url stringifies to when used as a cache key
const NON_STRING_URL_KEY = '[object Object]';

/** Drops the entry a non-string url left behind, whose methods belong to no url. */
const dropNonStringUrlEntry = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(REFLECTION_CACHE_KEY) || '{}');
    if (!Object.hasOwn(stored, NON_STRING_URL_KEY)) return;
    delete stored[NON_STRING_URL_KEY];
    localStorage.setItem(REFLECTION_CACHE_KEY, JSON.stringify(stored));
  } catch {
    // unreadable storage falls back to the hook's default
  }
};

dropNonStringUrlEntry();

/**
 * Custom hook for managing reflection data and server discovery
 * @param {Object} item - The request item
 * @param {Object} collection - The collection the item belongs to
 */
export default function useReflectionManagement(item, collection) {
  const dispatch = useDispatch();

  const [reflectionCache, setReflectionCache] = useLocalStorage(REFLECTION_CACHE_KEY, {});
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  const resolveUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const vars = getAllVariables(collection, item);
    return interpolate(url, vars) || url;
  };

  /**
   * Load gRPC methods from server reflection
   * @param {string} url - The gRPC server URL
   * @param {boolean} isManualRefresh - Whether this is a manual refresh
   * @returns {Promise<{methods: Array, error: Error|null}>}
   */
  const loadMethodsFromReflection = async (url, isManualRefresh = false) => {
    const resolvedUrl = resolveUrl(url);
    if (!resolvedUrl) {
      return { methods: [], error: new Error('No URL provided') };
    }

    const cachedMethods = reflectionCache[resolvedUrl];
    if (!isManualRefresh && cachedMethods && !isLoadingMethods) {
      return { methods: cachedMethods, error: null, fromCache: true };
    }

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await dispatch(loadGrpcMethodsFromReflection(item, collection.uid, resolvedUrl));

      if (error) {
        console.error('Error loading gRPC methods:', error);
        return { methods: [], error };
      }

      setReflectionCache((prevCache) => ({
        ...prevCache,
        [resolvedUrl]: methods
      }));

      return { methods, error: null, fromCache: false };
    } catch (error) {
      console.error('Error loading gRPC methods:', error);
      return { methods: [], error };
    } finally {
      setIsLoadingMethods(false);
    }
  };

  /**
   * Check if methods are cached for a URL
   * @param {string} url - The gRPC server URL
   * @returns {boolean}
   */
  const hasCachedMethods = (url) => {
    const resolvedUrl = resolveUrl(url);
    return !!(resolvedUrl && reflectionCache[resolvedUrl] && reflectionCache[resolvedUrl].length > 0);
  };

  /**
   * Get cached methods for a URL
   * @param {string} url - The gRPC server URL
   * @returns {Array}
   */
  const getCachedMethods = (url) => {
    const resolvedUrl = resolveUrl(url);
    return (resolvedUrl && reflectionCache[resolvedUrl]) || [];
  };

  /**
   * Clear cache for a specific URL
   * @param {string} url - The gRPC server URL
   */
  const clearCacheForUrl = (url) => {
    const resolvedUrl = resolveUrl(url);
    if (!resolvedUrl) return;
    setReflectionCache((prevCache) => {
      const newCache = { ...prevCache };
      delete newCache[resolvedUrl];
      return newCache;
    });
  };

  /**
   * Clear all reflection cache
   */
  const clearAllCache = () => {
    setReflectionCache({});
  };

  // Keep a ref to the latest loader so the debounced closure isn't stale after
  // renders (item / collection changes). Same ref-to-latest pattern applies to
  // the reflection key predicate below.
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
    reflectionCache,
    loadMethodsFromReflection,
    scheduleReflection,
    hasCachedMethods,
    getCachedMethods,
    clearCacheForUrl,
    clearAllCache
  };
}
