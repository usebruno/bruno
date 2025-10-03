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
    .split('\n')
    .map((line) => '  ' + line)
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

module.exports = {
  safeParseJson,
  indentString,
  outdentString,
  getValueString
};
