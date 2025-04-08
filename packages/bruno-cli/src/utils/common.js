const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

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

const sanitizeName = (name) => {
  const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g;
  name = name
    .replace(invalidCharacters, '-')       // replace invalid characters with hyphens
    .replace(/^[.\s]+/, '')               // remove leading dots and spaces
    .replace(/[.\s]+$/, '');              // remove trailing dots and spaces (keep trailing hyphens)
  return name;
};

const getSafePathToWrite = (filePath) => {
  const MAX_FILENAME_LENGTH = 255; // Common limit on most filesystems
  let dir = path.dirname(filePath);
  let ext = path.extname(filePath);
  let base = path.basename(filePath, ext);
  if (base.length + ext.length > MAX_FILENAME_LENGTH) {
      base = sanitizeName(base);
      base = base.slice(0, MAX_FILENAME_LENGTH - ext.length);
  }
  let safePath = path.join(dir, base + ext);
  return safePath;
};

const safeWriteFileSync = (filePath, data) => {
  const safePath = getSafePathToWrite(filePath);
  fs.writeFileSync(safePath, data);
};

const stringifyJson = (data) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (err) {
    throw new Error(`Failed to stringify JSON: ${err.message}`);
  }
};

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse,
  sanitizeName,
  safeWriteFileSync,
  stringifyJson
};
