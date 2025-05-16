const { customAlphabet } = require('nanoid');
const iconv = require('iconv-lite');
const { cloneDeep } = require('lodash');

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

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
};

const safeStringifyJSON = (data, indent = null) => {
  if (data === undefined) return undefined;
  try {
    // getCircularReplacer - removes circular references that cause an error when stringifying
    return JSON.stringify(data, getCircularReplacer(), indent);
  } catch (e) {
    console.warn('Failed to stringify data:', e.message);
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

const parseDataFromResponse = (response, disableParsingResponseJson = false) => {
  // Parse the charset from content type: https://stackoverflow.com/a/33192813
  const charsetMatch = /charset=([^()<>@,;:"/[\]?.=\s]*)/i.exec(response.headers['content-type'] || '');
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#using_exec_with_regexp_literals
  const charsetValue = charsetMatch?.[1];
  const dataBuffer = Buffer.from(response.data);
  // Overwrite the original data for backwards compatibility
  let data;
  if (iconv.encodingExists(charsetValue)) {
    data = iconv.decode(dataBuffer, charsetValue);
  } else {
    data = iconv.decode(dataBuffer, 'utf-8');
  }
  // Try to parse response to JSON, this can quietly fail
  try {
    // Filter out ZWNBSP character
    // https://gist.github.com/antic183/619f42b559b78028d1fe9e7ae8a1352d
    data = data.replace(/^\uFEFF/, '');
    if (!disableParsingResponseJson) {
      data = JSON.parse(data);
    }
  } catch { }

  return { data, dataBuffer };
};

const parseDataFromRequest = (request) => {
  const requestDataString = request.mode == 'file'? "<request body redacted>": (typeof request?.data === 'string' ? request?.data : safeStringifyJSON(request?.data));
  const requestCopy = cloneDeep(request);
  if (!requestCopy.data) {
    return { data: null, dataBuffer: null };
  }
  requestCopy.data = requestDataString;
  return parseDataFromResponse(requestCopy);
};

module.exports = {
  uuid,
  stringifyJson,
  parseJson,
  safeStringifyJSON,
  safeParseJSON,
  simpleHash,
  generateUidBasedOnHash,
  flattenDataForDotNotation,
  parseDataFromResponse,
  parseDataFromRequest
};
