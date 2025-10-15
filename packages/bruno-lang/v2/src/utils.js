// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};


const indentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return str
    .split(/\r\n|\r|\n/)
    .map((line) => '  ' + line)
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

  const hasNewLines = value?.includes('\n') || value?.includes('\r');

  if (!hasNewLines) {
    return value;
  }

  // Wrap multiline values in triple quotes with 2-space indentation
  return `'''\n${indentString(value)}\n'''`;
};

const getKeyString = (key) => {
  // Check if key contains newlines - if so, use triple-quote format
  const hasNewLines = key?.includes('\n') || key?.includes('\r');
  if (hasNewLines) {
    // Don't indent the content here - let the outer context handle indentation
    // Split by newlines, normalize line endings, and wrap in triple quotes
    const normalizedKey = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return `'''\n${normalizedKey}\n'''`;
  }

  // Otherwise, check for other quotable characters
  const quotableChars = [':', '"', '{', '}', ' '];
  return quotableChars.some((char) => key.includes(char)) ? ('"' + key.replaceAll('"', '\\"') + '"') : key;
};

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  getValueString,
  getKeyString
};
