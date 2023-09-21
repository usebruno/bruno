const { bruToJson, jsonToBru, bruToEnvJson, envJsonToBru } = require('../v1/src');

const bruToJsonV2 = require('../v2/src/bruToJson');
const jsonToBruV2 = require('../v2/src/jsonToBru');
const bruToEnvJsonV2 = require('../v2/src/envToJson');
const envJsonToBruV2 = require('../v2/src/jsonToEnv');

module.exports = {
  bruToJson,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru,

  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2
};
