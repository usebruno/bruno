const bruToJsonV2 = require('./v2/src/bruToJson');
const jsonToBruV2 = require('./v2/src/jsonToBru.js');
const bruToEnvJsonV2 = require('./v2/src/envToJson.js');
const envJsonToBruV2 = require('./v2/src/jsonToEnv.js');
const dotenvToJson = require('./v2/src/dotenvToJson.js');

const collectionBruToJson = require('./v2/src/collectionBruToJson.js');
const jsonToCollectionBru = require('./v2/src/jsonToCollectionBru.js');

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
