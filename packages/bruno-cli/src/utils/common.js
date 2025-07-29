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

// Check for meaningful test() calls (not commented out or in strings)
const hasValidTests = (script) => {
  if (!script) return false;
  
  // Remove single-line comments (// ...) and multi-line comments (/* ... */)
  let cleanScript = script
    .replace(/\/\/.*$/gm, '')  // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
  
  // Remove string literals to avoid matching test() inside strings
  cleanScript = cleanScript
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')  // Remove double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")  // Remove single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '``'); // Remove template literals
  
  // Look for standalone test() calls (not object method calls like obj.test())
  // Find all test( occurrences and check they're not preceded by dots
  let hasValidTest = false;
  let searchFrom = 0;
  
  while (true) {
    const index = cleanScript.indexOf('test', searchFrom);
    if (index === -1) break;
    
    // Check if this looks like test( with optional whitespace
    const afterTest = cleanScript.substring(index + 4);
    if (/^\s*\(/.test(afterTest)) {
      // Found test( - check if it's not preceded by a dot
      if (index === 0 || cleanScript[index - 1] !== '.') {
        hasValidTest = true;
        break;
      }
    }
    
    searchFrom = index + 1;
  }
  
  return hasValidTest;
};

module.exports = {
  lpad,
  rpad,
  parseDataFromResponse,
  hasValidTests
};
