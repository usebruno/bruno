/**
 * Integration IPC Loader
 *
 * Loads and registers IPC handlers from integration packages.
 * Each integration can export a registerIpc function that sets up
 * its Electron main-process handlers.
 */

const { ipcMain } = require('electron');

const registeredIntegrations = new Map();

/**
 * Load IPC handlers from an integration package
 * @param {string} integrationId - Unique integration identifier
 * @param {string} ipcPath - Module path to require (e.g., '@usebruno/integration-github/ipc')
 * @param {BrowserWindow} mainWindow - Electron main window reference
 */
const loadIntegrationIpc = (integrationId, ipcPath, mainWindow) => {
  if (registeredIntegrations.has(integrationId)) {
    console.log(`Integration IPC already registered: ${integrationId}`);
    return;
  }

  try {
    const registerFn = require(ipcPath);
    if (typeof registerFn === 'function') {
      registerFn(mainWindow, ipcMain);
      registeredIntegrations.set(integrationId, { ipcPath });
      console.log(`Loaded IPC for integration: ${integrationId}`);
    } else if (typeof registerFn.default === 'function') {
      registerFn.default(mainWindow);
      registeredIntegrations.set(integrationId, { ipcPath });
      console.log(`Loaded IPC for integration: ${integrationId}`);
    } else {
      console.warn(`Integration ${integrationId} does not export a function`);
    }
  } catch (err) {
    // Don't fail hard if integration package is not available
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log(`Integration package not found: ${ipcPath}`);
    } else {
      console.error(`Failed to load IPC for integration ${integrationId}:`, err);
    }
  }
};

/**
 * Initialize IPC handlers for all bundled integrations
 * @param {BrowserWindow} mainWindow - Electron main window reference
 */
const initializeIntegrationIpc = (mainWindow) => {
  // List of bundled integrations with their IPC module paths
  const bundledIntegrations = [
    { id: 'github', ipcPath: '@usebruno/integration-github/ipc' }
  ];

  for (const integration of bundledIntegrations) {
    loadIntegrationIpc(integration.id, integration.ipcPath, mainWindow);
  }
};

/**
 * Get list of registered integration IPC handlers
 * @returns {string[]} Array of integration IDs
 */
const getRegisteredIntegrations = () => {
  return Array.from(registeredIntegrations.keys());
};

module.exports = {
  loadIntegrationIpc,
  initializeIntegrationIpc,
  getRegisteredIntegrations
};
