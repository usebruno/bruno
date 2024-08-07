const { customAlphabet } = require('nanoid');
const { stringify, parse, LosslessNumber } = require('lossless-json');

// a customized version of nanoid without using _ and -
const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

const stringifyJson = (data) => {
  return stringify(data);
};

const parseJson = (data) => {
  return parse(data, null, (value) => {
    // By default, this will return the LosslessNumber object for big ints
    // need to convert it into a number
    return new LosslessNumber(value).valueOf();
  });
};

const safeStringifyJSON = (data) => {
  try {
    return stringify(data);
  } catch (e) {
    return data;
  }
};

const safeParseJSON = (data) => {
  try {
    return parse(data, null, (value) => {
      // By default, this will return the LosslessNumber object for big ints
      // need to convert it into a number
      return new LosslessNumber(value).valueOf();
    });
  } catch (e) {
    return data;
  }
};

const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
};

const generateUidBasedOnHash = (str) => {
  const hash = simpleHash(str);

  return `${hash}`.padEnd(21, '0');
};

const flattenDataForDotNotation = (data) => {
  var result = {};
  function recurse(current, prop) {
    if (Object(current) !== current) {
      result[prop] = current;
    } else if (Array.isArray(current)) {
      for (var i = 0, l = current.length; i < l; i++) {
        recurse(current[i], prop + '[' + i + ']');
      }
      if (l == 0) {
        result[prop] = [];
      }
    } else {
      var isEmpty = true;
      for (var p in current) {
        isEmpty = false;
        recurse(current[p], prop ? prop + '.' + p : p);
      }
      if (isEmpty && prop) {
        result[prop] = {};
      }
    }
  }

  recurse(data, '');
  return result;
};

module.exports = {
  uuid,
  stringifyJson,
  parseJson,
  safeStringifyJSON,
  safeParseJSON,
  simpleHash,
  generateUidBasedOnHash,
  flattenDataForDotNotation
};
