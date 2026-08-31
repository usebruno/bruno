const iconv = require('iconv-lite');
const { execSync } = require('child_process');

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

const splitCsv = (value) => {
  if (value == null) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .flatMap((part) => String(part).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const hasCommaValue = (value) => {
  if (value == null) return false;
  const parts = Array.isArray(value) ? value : [value];
  return parts.some((part) => String(part).includes(','));
};

const findConflicts = (include, exclude) => {
  const excluded = new Set(exclude);
  return [...new Set(include)].filter((name) => excluded.has(name));
};

const getGitRemoteUrl = (collectionPath) => {
  try {
    const url = execSync('git remote get-url origin', {
      cwd: collectionPath,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();
    return url || undefined;
  } catch (error) {
    return undefined;
  }
};

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse,
  splitCsv,
  hasCommaValue,
  findConflicts,
  getGitRemoteUrl
};
