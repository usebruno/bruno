const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { preferencesUtil } = require('../store/preferences');
const { importCollection, findUniqueFolderName } = require('../utils/collection-import');
const { resolveDefaultLocation } = require('../utils/default-location');

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
 * Onboard new users by creating a sample collection
 */
async function onboardUser(mainWindow, lastOpenedCollections) {
  try {
    if (preferencesUtil.hasLaunchedBefore()) {
      return;
    }

    if (process.env.DISABLE_SAMPLE_COLLECTION_IMPORT !== 'true') {
      // Check if user already has collections (indicates they're an existing user)
      // Onboarding was added in a later version, so for existing users we should skip it
      // to avoid creating sample collections
      // lastOpenedCollections is still used here to check for existing collections during migration
      const collections = lastOpenedCollections ? lastOpenedCollections.getAll() : [];
      if (collections.length > 0) {
        await preferencesUtil.markAsLaunched();
        return;
      }

      const collectionLocation = resolveDefaultLocation();
      await importSampleCollection(collectionLocation, mainWindow);
    }

    await preferencesUtil.markAsLaunched();
  } catch (error) {
    console.error('Failed to handle onboarding:', error);
    // Still mark as launched to prevent retry on next startup
    await preferencesUtil.markAsLaunched();
  }
}

module.exports = onboardUser;
