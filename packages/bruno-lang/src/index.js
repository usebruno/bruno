const { parser: bruToJsonV2, grammar: bruToJsonV2Grammar } = require('../v2/src/bruToJson');
const { parser: collectionBruToJson, grammar: collectionBruToJsonGrammar } = require('../v2/src/collectionBruToJson');
const { parser: bruToEnvJsonV2, grammar: bruToEnvJsonV2Grammar } = require('../v2/src/envToJson');
const jsonToBruV2 = require('../v2/src/jsonToBru');
const envJsonToBruV2 = require('../v2/src/jsonToEnv');
const dotenvToJson = require('../v2/src/dotenvToJson');
const jsonToCollectionBru = require('../v2/src/jsonToCollectionBru');

// Todo: remove V2 suffixes
// Changes will have to be made to the CLI and GUI

module.exports = {
  bruToJsonV2,
  bruToJsonV2Grammar,
  collectionBruToJson,
  collectionBruToJsonGrammar,
  bruToEnvJsonV2,
  bruToEnvJsonV2Grammar,
  jsonToBruV2,
  envJsonToBruV2,
  jsonToCollectionBru,
  dotenvToJson
};
