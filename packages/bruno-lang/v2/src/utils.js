// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};


const indentString = (str, levels = 1) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = '  '.repeat(levels);
  return str
    .split(/\r\n|\r|\n/)
    .map((line) => indent + line)
    .join('\n');
};

const outdentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return str
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/^  /, ''))
    .join('\n');
};

const getValueString = (value) => {
  // Handle null, undefined, and empty strings
  if (!value) {
    return '';
  }

  const hasNewLines = value.includes('\n') || value.includes('\r');

  if (!hasNewLines) {
    return value;
  }

  // Wrap multiline values in triple quotes with 2-space indentation
  return `'''\n${indentString(value)}\n'''`;
};

const getKeyString = (key) => {
  if (!key) {
    return '';
  }

  // Check if key contains newlines - if so, use triple-quote format
  const hasNewLines = key.includes('\n') || key.includes('\r');
  if (hasNewLines) {
    const normalizedKey = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return `'''\n${normalizedKey}\n'''`;
  }

  // Otherwise, check for other quotable characters
  const quotableChars = [':', '"', '{', '}', ' '];
  return quotableChars.some((char) => key.includes(char)) ? ('"' + key.replaceAll('"', '\\"') + '"') : key;
};

const getValueUrl = (url) => {
  // Handle null, undefined, and empty strings
  if (!url) {
    return '';
  }

  const hasNewLines = url.includes('\n') || url.includes('\r');

  if (!hasNewLines) {
    return url;
  }

  // Wrap multiline values in triple quotes with 4-space indentation (2 levels)
  return `'''\n${indentString(url, 2)}\n'''`;
};

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  getValueString,
  getKeyString,
  getValueUrl
};
