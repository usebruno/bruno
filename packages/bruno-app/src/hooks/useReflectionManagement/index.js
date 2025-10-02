import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loadGrpcMethodsFromReflection } from 'providers/ReduxStore/slices/collections/actions';
import useLocalStorage from 'hooks/useLocalStorage/index';

/**
 * Custom hook for managing reflection data and server discovery
 * @param {Object} item - The request item
 * @param {string} collectionUid - Collection UID
 */
export default function useReflectionManagement(item, collectionUid) {
  const dispatch = useDispatch();

  const [reflectionCache, setReflectionCache] = useLocalStorage('bruno.grpc.reflectionCache', {});
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

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

    const cachedMethods = reflectionCache[url];
    if (!isManualRefresh && cachedMethods && !isLoadingMethods) {
      return { methods: cachedMethods, error: null };
    }

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await dispatch(loadGrpcMethodsFromReflection(item, collectionUid, url));

      if (error) {
        console.error('Error loading gRPC methods:', error);
        return { methods: [], error };
      }

      setReflectionCache((prevCache) => ({
        ...prevCache,
        [url]: methods
      }));

      return { methods, error: null };
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
    return !!(reflectionCache[url] && reflectionCache[url].length > 0);
  };

  /**
   * Get cached methods for a URL
   * @param {string} url - The gRPC server URL
   * @returns {Array}
   */
  const getCachedMethods = (url) => {
    return reflectionCache[url] || [];
  };

  /**
   * Clear cache for a specific URL
   * @param {string} url - The gRPC server URL
   */
  const clearCacheForUrl = (url) => {
    setReflectionCache((prevCache) => {
      const newCache = { ...prevCache };
      delete newCache[url];
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
