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

  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const indentString = (str, indentLevel = 2) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = ' '.repeat(indentLevel);
  return normalizeNewlines(str)
    .split('\n')
    .map((line) => indent + line)
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

const getValueString = (value, indentLevel = 2) => {
  const hasNewLines = value?.includes('\n') || value?.includes('\r');

  if (!hasNewLines) {
    return value;
  }

  // Join the lines back together with newline characters and enclose them in triple single quotes
  // For env files, the closing ''' needs 2-space indent to align with the key
  // For bru files, this gets wrapped with indentString() so no closing indent needed here
  const closingIndent = indentLevel > 2 ? '  ' : '';
  return `'''\n${indentString(value, indentLevel)}\n${closingIndent}'''`;
};

module.exports = {
  safeParseJson,
  normalizeNewlines,
  indentString,
  outdentString,
  getValueString
};
