const _ = require('lodash');

/**
 * Strips @description('''...''') or @description("...") from end of pair.value and sets pair.description.
 * Double-quoted form supports backslash-escaped characters (e.g. \" for a literal quote).
 * @param {Object} pair - The pair object (must have value as string)
 */
const extractDescription = (pair) => {
  if (!_.isString(pair.value)) {
    return;
  }
  // Multiline: @description('''...''')
  const tripleMatch = pair.value.match(/\s*@description\('''([\s\S]*?)'''\)\s*$/);
  if (tripleMatch) {
    pair.description = tripleMatch[1].trim();
    pair.value = pair.value.slice(0, -tripleMatch[0].length).trim();
    return;
  }
  // Single-line: @description("...") with optional escaped content
  const doubleMatch = pair.value.match(/\s*@description\("((?:\\.|[^"\\])*)"\)\s*$/);
  if (doubleMatch) {
    let decoded;
    try {
      decoded = JSON.parse('"' + doubleMatch[1] + '"');
    } catch {
      decoded = doubleMatch[1].replace(/\\"/g, '"');
    }
    pair.description = decoded.trim();
    pair.value = pair.value.slice(0, -doubleMatch[0].length).trim();
    return;
  }
};

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

    const result = {
      name,
      value,
      enabled
    };
    extractDescription(result);
    return result;
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

    const result = {
      name,
      value,
      enabled,
      type
    };
    extractDescription(result);
    return result;
  });
};

/**
 * Extracts content type from multipart form pair value
 * @param {Object} pair - The pair object to extract content type from
 */
const multipartExtractContentType = (pair) => {
  if (_.isString(pair.value)) {
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/s);
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
    const match = pair.value.match(/^(.*?)\s*@contentType\((.*?)\)\s*$/s);
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
    extractDescription(pair);
    multipartExtractContentType(pair);

    if (_.isString(pair.value) && pair.value.startsWith('@file(') && pair.value.endsWith(')')) {
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
  extractDescription,
  multipartExtractContentType,
  fileExtractContentType,
  mapPairListToKeyValPairsMultipart,
  mapPairListToKeyValPairsFile,
  concatArrays
};
