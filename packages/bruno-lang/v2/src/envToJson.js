const _ = require('lodash');
const parser = require('./peggy/envToJson.peggy.js');

// Helper functions
const mapPairListToKeyValPairs = (pairList = []) => {
  if (!pairList.length) {
    return [];
  }

  return _.map(pairList, (pair) => {
    let name = _.keys(pair)[0];
    let value = pair[name];
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

const mapArrayListToKeyValPairs = (arrayList = []) => {
  arrayList = arrayList.filter((v) => v && v.length);

  if (!arrayList.length) {
    return [];
  }

  return _.map(arrayList, (value) => {
    let name = value;
    let enabled = true;
    if (name && name.length && name.charAt(0) === '~') {
      name = name.slice(1);
      enabled = false;
    }

    return {
      name,
      value: '',
      enabled
    };
  });
};

const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

// Export the parser function
module.exports = (input) => {
  try {
    return parser.parse(input, {
      _,
      mapPairListToKeyValPairs,
      mapArrayListToKeyValPairs,
      concatArrays
    });
  } catch (error) {
    throw new Error(error.message);
  }
};
