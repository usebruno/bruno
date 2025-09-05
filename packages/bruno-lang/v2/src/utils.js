// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const normalizeNewlines = (str) => {
  if (!str || typeof str !== 'string') {
    return str || '';
  }

  // "\r\n" is windows, "\r" is old mac, "\n" is linux
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const indentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return normalizeNewlines(str)
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n');
};

const outdentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return normalizeNewlines(str)
    .split('\n')
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

  // Trim trailing whitespace/newlines to avoid extra blank lines
  const trimmedValue = value.replace(/\s+$/, '');

  // Wrap multiline values in triple quotes with 2-space indentation
  return `'''\n${indentString(trimmedValue)}\n'''`;
};

module.exports = {
  safeParseJson,
  normalizeNewlines,
  indentString,
  outdentString,
  getValueString
};
