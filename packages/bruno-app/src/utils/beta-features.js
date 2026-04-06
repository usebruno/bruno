import { useSelector } from 'react-redux';

/**
 * Beta features configuration object
 * Contains all available beta feature keys
 */
export const BETA_FEATURES = Object.freeze({
  NODE_VM: 'nodevm',
  OPENAPI_SYNC: 'openapi-sync',
  SIDEBAR_OPTIMIZATIONS: 'sidebar-optimizations',
  SKIP_LOADING_BADGE_EVENT: 'skip-loading-badge-event',
  PARALLEL_WORKERS: 'parallel-workers'
});

/**
 * Hook to check if a beta feature is enabled
 * @param {string} featureName - The name of the beta feature
 * @returns {boolean} - Whether the feature is enabled
 */
export const useBetaFeature = (featureName) => {
  const preferences = useSelector((state) => state.app.preferences);
  return preferences?.beta?.[featureName] || false;
};
