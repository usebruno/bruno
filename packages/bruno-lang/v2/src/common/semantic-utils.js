const _ = require('lodash');

/**
 * Maps a pair list to an array of key-value pairs
 * @param {Array} pairList - The pair list from the AST
 * @param {boolean} parseEnabled - Whether to parse the enabled/disabled state from the name
 * @returns {Array} Array of objects with name, value, and optionally enabled properties
 */
const mapPairListToKeyValPairs = (pairList = [], parseEnabled = true) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
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

/**
 * Maps a pair list to an array of request parameters with type
 * @param {Array} pairList - The pair list from the AST
 * @param {string} type - The type of parameter (e.g., 'path', 'query')
 * @returns {Array} Array of objects with name, value, enabled, and type properties
 */
const mapRequestParams = (pairList = [], type) => {
  if (!pairList.length) {
    return [];
  }
  return _.map(pairList[0], (pair) => {
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
      enabled,
      type
    };
  });
};

/**
 * Extracts content type from multipart form pair value
 * @param {Object} pair - The pair object to extract content type from
 */
const multipartExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match != null && match.length > 2) {
      pair.value = match[1];
      pair.contentType = match[2];
    } else {
      pair.contentType = '';
    }
  }
};

/**
 * Extracts content type from file pair value
 * @param {Object} pair - The pair object to extract content type from
 */
const fileExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/);
    if (match && match.length > 2) {
      pair.value = match[1].trim();
      pair.contentType = match[2].trim();
    } else {
      pair.contentType = '';
    }
  }
};

/**
 * Maps a pair list to multipart form key-value pairs
 * @param {Array} pairList - The pair list from the AST
 * @param {boolean} parseEnabled - Whether to parse the enabled/disabled state from the name
 * @returns {Array} Array of objects with name, value, enabled, type, and contentType properties
 */
const mapPairListToKeyValPairsMultipart = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);

  return pairs.map((pair) => {
    pair.type = 'text';
    multipartExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filestr = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.type = 'file';
      pair.value = filestr.split('|');
    }

    return pair;
  });
};

/**
 * Maps a pair list to file key-value pairs
 * @param {Array} pairList - The pair list from the AST
 * @param {boolean} parseEnabled - Whether to parse the enabled/disabled state from the name
 * @returns {Array} Array of objects with filePath, selected, and contentType properties
 */
const mapPairListToKeyValPairsFile = (pairList = [], parseEnabled = true) => {
  const pairs = mapPairListToKeyValPairs(pairList, parseEnabled);
  return pairs.map((pair) => {
    fileExtractContentType(pair);

    if (pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
      let filePath = pair.value.replace(/^@file\(/, '').replace(/\)$/, '');
      pair.filePath = filePath;
      pair.selected = pair.enabled;

      // Remove pair.value as it only contains the file path reference
      delete pair.value;
      // Remove pair.name as it is auto-generated (e.g., file1, file2, file3, etc.)
      delete pair.name;
      delete pair.enabled;
    }

    return pair;
  });
};

/**
 * Concatenates arrays when merging objects (used with lodash mergeWith)
 * @param {*} objValue - The existing value
 * @param {*} srcValue - The source value
 * @returns {Array|undefined} Concatenated array if both values are arrays, undefined otherwise
 */
const concatArrays = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
};

module.exports = {
  mapPairListToKeyValPairs,
  mapRequestParams,
  multipartExtractContentType,
  fileExtractContentType,
  mapPairListToKeyValPairsMultipart,
  mapPairListToKeyValPairsFile,
  concatArrays
};
