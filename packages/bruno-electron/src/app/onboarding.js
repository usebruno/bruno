const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { preferencesUtil } = require('../store/preferences');
const { importCollection, findUniqueFolderName } = require('../utils/collection-import');

/**
 * Get the default location for collections
 * Tries documents first, then desktop, then userData as fallback
 */
function getDefaultCollectionLocation() {
  const preferredPaths = ['documents', 'desktop', 'userData'];

  for (const pathType of preferredPaths) {
    try {
      return app.getPath(pathType);
    } catch (error) {
      console.warn(`Failed to get ${pathType} path:`, error.message);
      // Continue to next path
    }
  }

  // This should never happen since userData should always be available
  throw new Error('No valid collection location found');
}

/**
 * Import sample collection for new users
 */
async function importSampleCollection(collectionLocation, mainWindow, lastOpenedCollections) {
  // Handle both development and production paths
  const sampleCollectionPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sample-collection.json')
    : path.join(app.getAppPath(), 'src/assets/sample-collection.json');

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
      lastOpenedCollections,
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
      console.log('Onboarding: User has launched before, skipping onboarding');
      return;
    }

    if (process.env.DISABLE_SAMPLE_COLLECTION_IMPORT !== 'true') {
      // Onboarding was added later;
      // if a collection already exists, user is old → skip onboarding
      const collections = await lastOpenedCollections.getAll();
      if (collections.length > 0) {
        console.log('Onboarding: Existing collections found, skipping onboarding');
        preferencesUtil.markAsLaunched();
        return;
      }

      console.log('Onboarding: First launch detected, creating sample collection...');
      const collectionLocation = getDefaultCollectionLocation();
      const result = await importSampleCollection(collectionLocation, mainWindow, lastOpenedCollections);
      console.log(`Onboarding: Sample collection created successfully at: ${result.collectionPath}`);
    } else {
      console.log('Onboarding: Sample collection import disabled via environment variable');
    }

    preferencesUtil.markAsLaunched();
  } catch (error) {
    console.error('Onboarding: Failed to create sample collection:', error.message);
    // Still mark as launched to prevent retry on next startup
    preferencesUtil.markAsLaunched();
  }
}

module.exports = onboardUser;
