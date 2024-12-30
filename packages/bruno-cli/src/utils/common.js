const fs = require('fs');
const FormData = require('form-data');
const { forOwn } = require('lodash');
const path = require('path');
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
    
    // If the response is a string and starts and ends with double quotes, it's a stringified JSON and should not be parsed
    if (!disableParsingResponseJson && !(typeof data === 'string' && data.startsWith('"') && data.endsWith('"'))) {
      data = JSON.parse(data);
    }
  } catch {
    console.log('Failed to parse response data as JSON');
  }

  return { data, dataBuffer };
};

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse
};
