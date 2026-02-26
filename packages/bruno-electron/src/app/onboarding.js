const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { preferencesUtil, getPreferences, savePreferences } = require('../store/preferences');
const { importCollection, findUniqueFolderName } = require('../utils/collection-import');
const { resolveDefaultLocation } = require('../utils/default-location');
const { resolveOnboarding } = require('./onboarding-state');

/**
 * Import sample collection for new users
 */
async function importSampleCollection(collectionLocation, mainWindow) {
  // Handle both development and production paths
  const sampleCollectionPath = app.isPackaged
    ? path.join(process.resourcesPath, 'data', 'sample-collection.json')
    : path.join(app.getAppPath(), 'resources', 'data', 'sample-collection.json');

  if (!fs.existsSync(sampleCollectionPath)) {
    throw new Error(`Sample collection file not found at: ${sampleCollectionPath}`);
  }

  const sampleCollectionData = fs.readFileSync(sampleCollectionPath, 'utf8');
  const sampleCollection = JSON.parse(sampleCollectionData);

  const collectionName = await findUniqueFolderName('Sample API Collection', collectionLocation);

  const collectionToImport = {
    ...sampleCollection,
    name: collectionName
  };

  try {
    const {
      collectionPath: createdPath,
      uid,
      brunoConfig
    } = await importCollection(
      collectionToImport,
      collectionLocation,
      mainWindow,
      collectionName
    );

    return { collectionPath: createdPath, uid, brunoConfig };
  } catch (error) {
    console.error('Failed to import sample collection:', error);
    throw error;
  }
}

/**
 * Onboard new users by creating a sample collection.
 *
 * This also determines whether the welcome modal should be shown:
 * - Genuinely new users (no collections, no previous launch) → show welcome modal
 * - Existing users upgrading (have collections but no hasLaunchedBefore flag) → skip welcome modal
 *
 * The resolveOnboarding() call in finally unblocks the renderer:ready IPC handler,
 * ensuring the renderer always gets the correct preference values.
 */
async function onboardUser(mainWindow, lastOpenedCollections) {
  try {
    if (preferencesUtil.hasLaunchedBefore()) {
      return;
    }

    // Check if user already has collections — this indicates an existing user
    // upgrading to a version that introduced onboarding, not a genuinely new user
    const collections = lastOpenedCollections ? lastOpenedCollections.getAll() : [];
    const isExistingUser = collections.length > 0;

    if (isExistingUser) {
      // Existing user upgrading: mark as launched, don't show welcome modal
      // hasSeenWelcomeModal is intentionally NOT set here — it will be absent
      // from preferences, and the renderer defaults absent values to true (no modal)
      await preferencesUtil.markAsLaunched();
      return;
    }

    // Genuinely new user
    if (process.env.DISABLE_SAMPLE_COLLECTION_IMPORT !== 'true') {
      const collectionLocation = resolveDefaultLocation();
      await importSampleCollection(collectionLocation, mainWindow);
    }

    // Mark as launched and explicitly enable the welcome modal for new users
    const preferences = getPreferences();
    preferences.onboarding = {
      ...preferences.onboarding,
      hasLaunchedBefore: true,
      hasSeenWelcomeModal: false
    };
    await savePreferences(preferences);
  } catch (error) {
    console.error('Failed to handle onboarding:', error);
    // Still mark as launched to prevent retry on next startup
    await preferencesUtil.markAsLaunched();
  } finally {
    // Always unblock the renderer:ready handler so the app can proceed
    resolveOnboarding();
  }
}

module.exports = onboardUser;
