const {
  bruToJson,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru
} = require('../v1/src');

const bruToJsonV2 = require('../v2/src/bruToJson');
const jsonToBruV2 = require('../v2/src/jsonToBru');

module.exports = {
  bruToJson,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru,

  bruToJsonV2,
  jsonToBruV2
};