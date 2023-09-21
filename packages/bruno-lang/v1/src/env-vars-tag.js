const { between, regex } = require('arcsecond');
const { each } = require('lodash');
const keyValLines = require('./key-val-lines');

const begin = regex(/^vars\s*\r?\n/);
const end = regex(/^[\r?\n]*\/vars\s*[\r?\n]*/);

const envVarsTag = between(begin)(end)(keyValLines).map(([variables]) => {
  each(variables, (variable) => {
    variable.type = 'text';
  });

  return {
    variables
  };
});

module.exports = envVarsTag;
