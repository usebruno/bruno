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

const getContentType = (headers) => {
  const headersArray = typeof headers === 'object' ? Object.entries(headers) : [];

  if (headersArray.length > 0) {
    let contentType = headersArray
      .filter((header) => header[0].toLowerCase() === 'content-type')
      .map((header) => {
        return header[1];
      });
    if (contentType && contentType.length) {
      // Define regex patterns with explanatory comments
      // This pattern matches content types like application/json, application/ld+json, text/json, etc.
      const JSON_PATTERN = /^[\w\-]+\/([\w\-]+\+)?json/;
      
      // This pattern matches content types like application/xml, text/xml, application/atom+xml, etc.
      const XML_PATTERN = /^[\w\-]+\/([\w\-]+\+)?xml/;
      
      if (typeof contentType[0] == 'string' && JSON_PATTERN.test(contentType[0])) {
        return 'application/ld+json';
      } else if (typeof contentType[0] == 'string' && XML_PATTERN.test(contentType[0])) {
        return 'application/xml';
      }

      return contentType[0];
    }
  }

  return '';
};

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse,
  getContentType
};
