const _ = require('lodash');
const parser = require('./peggy/collectionBruToJson.peggy.js');
const { safeParseJson } = require('./utils');

// Helper functions
const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList, (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];

    if (!parseEnabled) {
      return {
        name,
        value
      };
    }

    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value,
      enabled
    };
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

const mapPairListToKeyValPair = (pairList = []) => {
  if (!pairList || !pairList.length) {
    return {};
  }

  return _.merge({}, ...pairList);
};


// Export the parser function
module.exports = (input) => {
  try {
    return parser.parse(input, {
      _,
      mapPairListToKeyValPairs,
      mapPairListToKeyValPair,
      concatArrays,
      safeParseJson
    });
  } catch (error) {
    throw new Error(error.message);
  }
};
