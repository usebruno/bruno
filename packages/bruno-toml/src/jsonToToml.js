const stringify = require('../lib/stringify');

const jsonToToml = (json) => {
  return stringify(json);
};

module.exports = jsonToToml;
