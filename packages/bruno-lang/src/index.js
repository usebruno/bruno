const bruToJsonV2 = require('../v2/src/bruToJson');
const jsonToBruV2 = require('../v2/src/jsonToBru');
const bruToEnvJsonV2 = require('../v2/src/envToJson');
const envJsonToBruV2 = require('../v2/src/jsonToEnv');
const dotenvToJson = require('../v2/src/dotenvToJson');

const collectionBruToJson = require('../v2/src/collectionBruToJson');
const jsonToCollectionBru = require('../v2/src/jsonToCollectionBru');

// Todo: remove V2 suffixes
// Changes will have to be made to the CLI and GUI

module.exports = {
  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2,

  collectionBruToJson,
  jsonToCollectionBru,

  dotenvToJson
};
