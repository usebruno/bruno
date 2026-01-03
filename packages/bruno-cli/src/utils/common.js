const iconv = require('iconv-lite');

const lpad = (str, width) => {
  let paddedStr = str;
  while (paddedStr.length < width) {
    paddedStr = ' ' + paddedStr;
  }
  return paddedStr;
};

const rpad = (str, width) => {
  let paddedStr = str;
  while (paddedStr.length < width) {
    paddedStr = paddedStr + ' ';
  }
  return paddedStr;
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

/**
 * Checks if an object is a FormData instance
 * Works with both native FormData (Node 18+/browser) and the form-data npm package
 * Uses Symbol.toStringTag for primary detection and falls back to duck typing
 * @param {*} obj - The object to check
 * @returns {boolean} True if the object is a FormData instance
 */
const isFormData = (obj) => {
  // Check Symbol.toStringTag first (most reliable)
  if (Object.prototype.toString.call(obj) === '[object FormData]') {
    return true;
  }

  // Fall back to duck typing for compatibility
  return (
    obj != null
    && typeof obj.append === 'function'
    && typeof obj.delete === 'function'
    && typeof obj.get === 'function'
    && typeof obj.has === 'function'
    && typeof obj.set === 'function'
  );
};

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse,
  isFormData
};
