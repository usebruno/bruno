const { between, regex } = require('arcsecond');
const keyValLines = require('./key-val-lines');

const begin = regex(/^headers\s*\r?\n/);
const end = regex(/^[\r?\n]*\/headers\s*[\r?\n]*/);

const headersTag = between(begin)(end)(keyValLines).map(([headers]) => {
  return {
    headers
  };
});

module.exports = headersTag;
