/**
 * This modules stores the configs loaded from bruno.json
 */

const config = {};

// collectionUid is a hash based on the collection path
const getBrunoConfig = (collectionUid) => {
  return config[collectionUid] || {};
};

const setBrunoConfig = (collectionUid, brunoConfig) => {
  config[collectionUid] = brunoConfig;
};

module.exports = {
  getBrunoConfig,
  setBrunoConfig
};
