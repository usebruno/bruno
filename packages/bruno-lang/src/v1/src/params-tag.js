const { between, regex } = require('arcsecond');
const keyValLines = require('./key-val-lines');

const begin = regex(/^params\s*\r?\n/);
const end = regex(/^[\r?\n]*\/params\s*[\r?\n]*/);

const paramsTag = between(begin)(end)(keyValLines).map(([params]) => {
  return {
    params
  };
});

module.exports = paramsTag;
