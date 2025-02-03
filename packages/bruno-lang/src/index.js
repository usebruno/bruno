const { parser: bruToJsonV2, grammar: requestBruGrammar } = require('../v2/src/bruToJson');
const { parser: collectionBruToJson, grammar: folderBruGrammar } = require('../v2/src/collectionBruToJson');
const { parser: bruToEnvJsonV2, grammar: envBruGrammar } = require('../v2/src/envToJson');
const jsonToBruV2 = require('../v2/src/jsonToBru');
const envJsonToBruV2 = require('../v2/src/jsonToEnv');
const dotenvToJson = require('../v2/src/dotenvToJson');
const jsonToCollectionBru = require('../v2/src/jsonToCollectionBru');

// Todo: remove V2 suffixes
// Changes will have to be made to the CLI and GUI

module.exports = {
  bruToJsonV2,
  requestBruGrammar,
  collectionBruToJson,
  folderBruGrammar,
  bruToEnvJsonV2,
  envBruGrammar,
  jsonToBruV2,
  envJsonToBruV2,
  jsonToCollectionBru,
  dotenvToJson
};
