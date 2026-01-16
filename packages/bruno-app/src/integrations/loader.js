/**
 * Integration Loader
 *
 * Loads and registers bundled integrations with the registry.
 * This file handles static imports of integration packages and
 * registers them on app startup.
 */

import registry from './registry';

// Bundled integrations - these are statically imported
// In the future, this could support dynamic loading
const bundledIntegrations = [];

// Try to load GitHub integration if available
try {
  // This will be available once the package is added to dependencies
  // Support both default and named exports from the integration package
  const pkg = require('@usebruno/integration-github');
  const GitHubIntegration = (pkg && (pkg.default || pkg.GitHubIntegration || pkg));
  if (GitHubIntegration) {
    bundledIntegrations.push(GitHubIntegration);
  }
} catch (e) {
  // Package not available - this is expected during initial development
  console.log('GitHub integration package not available');
}

/**
 * Register all bundled integrations with the registry
 */
export const loadBundledIntegrations = () => {
  for (const integration of bundledIntegrations) {
    try {
      const registered = registry.register(integration);
      if (registered) {
        console.log(`Registered integration: ${integration.id}`);
      }
    } catch (err) {
      console.error(`Failed to register integration ${integration.id}:`, err);
    }
  }
};

/**
 * Initialize integrations based on user preferences
 * @param {Object} preferences - User preferences object
 * @param {Object} context - Context to pass to integration init functions
 */
export const initializeIntegrations = async (preferences = {}, context = {}) => {
  loadBundledIntegrations();
  await registry.initWithPreferences(preferences, context);
};

export default {
  loadBundledIntegrations,
  initializeIntegrations
};
