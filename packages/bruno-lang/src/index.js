const {
  bruToJson,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru
} = require('./v1/src');

const bruToJsonV2 = require('./v2/src/bruToJson');

module.exports = {
  bruToJson,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru,

  bruToJsonV2
};