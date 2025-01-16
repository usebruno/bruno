const { customAlphabet } = require('nanoid');

// a customized version of nanoid without using _ and -
const uuid = () => {
  // https://github.com/ai/nanoid/blob/main/url-alphabet/index.js
  const urlAlphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  const customNanoId = customAlphabet(urlAlphabet, 21);

  return customNanoId();
};

const stringifyJson = async (str) => {
  try {
    return JSON.stringify(str, null, 2);
  } catch (err) {
    return Promise.reject(err);
  }
};

const parseJson = async (obj) => {
  try {
    return JSON.parse(obj);
  } catch (err) {
    return Promise.reject(err);
  }
};

const safeStringifyJSON = (data) => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return data;
  }
};

const safeParseJSON = (data) => {
  try {
    return JSON.parse(data);
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
