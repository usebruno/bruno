// safely parse json
const safeParseJson = (json) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const indentString = (str) => {
  if(!str || !str.length) {
    return str;
  }

  return str.split("\n").map(line => "  " + line).join("\n");
};

const outdentString = (str) => {
  if(!str || !str.length) {
    return str;
  }

  return str.split("\n").map(line => line.replace(/^  /, '')).join("\n");
};

// implement lodash _.get functionality
const get = (obj, path, defaultValue) => {
  const pathParts = path.split('.');
  let current = obj;
  for(let i = 0; i < pathParts.length; i++) {
    if(current[pathParts[i]] === undefined) {
      return defaultValue;
    }
    current = current[pathParts[i]];
  }
  return current;
};

module.exports = {
  get,
  safeParseJson,
  indentString,
  outdentString
};
