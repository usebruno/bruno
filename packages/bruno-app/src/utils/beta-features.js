import { useSelector } from 'react-redux';

/**
 * Beta features configuration object
 * Contains all available beta feature keys
 */
export const BETA_FEATURES = Object.freeze({
  WEBSOCKET: 'websocket',
  NODE_VM: 'nodevm'
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
