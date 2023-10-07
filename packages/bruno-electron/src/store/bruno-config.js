/**
 * This modules stores the configs loaded from bruno.json
 */

const config = {};

/**
 * @param {string} collectionUid collectionUid is a hash based on the collection path
 * @returns {{ lang: 'bru' | 'json' }}
 */
const getBrunoConfig = (collectionUid) => {
  return config[collectionUid] || {};
};

const setBrunoConfig = (collectionUid, brunoConfig) => {
  config[collectionUid] = brunoConfig;
};

/**
 * Get default file format from Bruno config.
 *
 * @param {string} collectionUid
 */
const getLangFromBrunoConfig = (collectionUid) => getBrunoConfig(collectionUid).lang;

module.exports = {
  getBrunoConfig,
  setBrunoConfig,
  getLangFromBrunoConfig
};
