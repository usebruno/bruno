import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { interpolate } from '@usebruno/common';
import { loadGrpcMethodsFromReflection } from 'providers/ReduxStore/slices/collections/actions';
import useLocalStorage from 'hooks/useLocalStorage/index';
import { getAllVariables } from 'utils/collections';

/**
 * Custom hook for managing reflection data and server discovery
 * @param {Object} item - The request item
 * @param {Object} collection - The collection the item belongs to
 */
export default function useReflectionManagement(item, collection) {
  const dispatch = useDispatch();

  const [reflectionCache, setReflectionCache] = useLocalStorage('bruno.grpc.reflectionCache', {});
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  // Interpolated URL is the cache key so distinct envs get distinct slots;
  // falls back to the raw string when placeholders can't resolve.
  const resolveUrl = (url) => {
    if (!url) return null;
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
    if (!url) {
      return { methods: [], error: new Error('No URL provided') };
    }

    const resolvedUrl = resolveUrl(url);
    const cachedMethods = resolvedUrl ? reflectionCache[resolvedUrl] : null;
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

      if (resolvedUrl) {
        setReflectionCache((prevCache) => ({
          ...prevCache,
          [resolvedUrl]: methods
        }));
      }

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

  return {
    isLoadingMethods,
    reflectionCache,
    loadMethodsFromReflection,
    hasCachedMethods,
    getCachedMethods,
    clearCacheForUrl,
    clearAllCache
  };
}
