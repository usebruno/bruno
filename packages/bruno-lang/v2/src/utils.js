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

const outdentString = (str, outdentLength = 0) => {
  if (!str || !str.length) {
    return str || '';
  }

  if(outdentLength === 0) {
    return str
    .split('\n')
    .map((line) => line.replace(/^  /, ''))
    .join('\n');
  }

  return str
    .split('\n')
    .map((line) => line.replace(new RegExp(`^ {${outdentLength}}`), ''))
    .join('\n');
};

module.exports = {
  safeParseJson,
  indentString,
  outdentString
};
