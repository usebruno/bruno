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

module.exports = {
  safeParseJson,
  indentString,
  outdentString
};
