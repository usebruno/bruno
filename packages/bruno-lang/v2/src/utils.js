// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const indentString = (str, indentLevel = 2) => {
  if (!str || !str.length) {
    return str || '';
  }

  const indent = ' '.repeat(indentLevel);
  return str
    .split('\n')
    .map((line) => indent + line)
    .join('\n');
};

const outdentString = (str) => {
  if (!str || !str.length) {
    return str || '';
  }

  return str
    .split('\n')
    .map((line) => line.replace(/^  /, ''))
    .join('\n');
};

const getValueString = (value, indentLevel = 2) => {
  const hasNewLines = value?.includes('\n');

  if (!hasNewLines) {
    return value;
  }

  // Join the lines back together with newline characters and enclose them in triple single quotes
  // The closing ''' should be indented at the same level as the key (2 spaces for env files)
  const closingIndent = ' '.repeat(2);
  return `'''\n${indentString(value, indentLevel)}\n${closingIndent}'''`;
};

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  getValueString
};
