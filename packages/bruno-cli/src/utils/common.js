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
  // Keep charset parsing in sync with the CLI/Electron counterpart.
  // Split only at semicolons outside quoted values, including escaped quotes.
  const parameters = (response.headers['content-type'] || '').match(/(?:[^;"]|"(?:\\.|[^"\\])*")+/g) || [];
  const charsetParameter = parameters.find((parameter) => /^\s*charset\s*=/i.test(parameter));
  const charsetMatch = /^\s*charset\s*=\s*(?:"([^"]*)"|([^()<>@,;:"/[\]?.=\s]*))/i.exec(charsetParameter || '');
  const charsetValue = charsetMatch?.[1] ?? charsetMatch?.[2];
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

const parseListOption = (value) => {
  if (value == null) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .flatMap((part) => String(part).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const pluralizeWord = (count, word) => `${word}${count === 1 ? '' : 's'}`;

const stripRequestItems = (items = []) =>
  items.map((item) => {
    if (item.type === 'folder') {
      return { ...item, items: stripRequestItems(item.items || []) };
    }
    if (!Array.isArray(item.items)) return item;
    const request = { ...item };
    delete request.items;
    return request;
  });

const isBinaryRequestBody = (data) => Buffer.isBuffer(data) || typeof data?.pipe === 'function';

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse,
  parseListOption,
  pluralizeWord,
  stripRequestItems,
  isBinaryRequestBody
};
