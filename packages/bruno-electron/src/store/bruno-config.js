/**
 * This modules stores the configs loaded from bruno.json
 */

const config = {};

// collectionUid is a hash based on the collection path. A collection that isn't open in the app
// has no entry here, so its own brunoConfig is used.
const getBrunoConfig = (collectionUid, collection) => {
  if (collection?.draft?.brunoConfig) {
    return collection.draft.brunoConfig;
  }
  return config[collectionUid] || collection?.brunoConfig || {};
};

const setBrunoConfig = (collectionUid, brunoConfig) => {
  config[collectionUid] = brunoConfig;
};

const clearBrunoConfig = (collectionUid) => {
  delete config[collectionUid];
};

module.exports = {
  getBrunoConfig,
  setBrunoConfig,
  clearBrunoConfig
};
