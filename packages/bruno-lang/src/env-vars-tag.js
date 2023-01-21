const {
  sequenceOf,
  whitespace,
  optionalWhitespace,
  choice,
  endOfInput,
  between,
  digit,
  many,
  regex,
  sepBy
} = require("arcsecond");

const newline = regex(/^\r?\n/);
const newLineOrEndOfInput = choice([newline, endOfInput]);

const begin = regex(/^vars\s*\r?\n/);
const end = regex(/^[\r?\n]*\/vars\s*[\r?\n]*/);
const wordWithoutWhitespace = regex(/^[^\s\r?\t\n]+/g);
const wordWithWhitespace = regex(/^[^\r?\n]+/g);

const line = sequenceOf([
  optionalWhitespace,
  digit,
  whitespace,
  wordWithoutWhitespace,
  whitespace,
  wordWithWhitespace,
  newLineOrEndOfInput
]).map(([_, enabled, __, key, ___, value]) => {
  return {
    "enabled": Number(enabled) ? true : false,
    "name": key,
    "value": value,
    "type": "text"
  };
});

const lines = many(line);
const envVarsLines = sepBy(newline)(lines);
const envVarsTag = between(begin)(end)(envVarsLines).map(([variables]) => {
  return {
    variables
  };
});

module.exports = envVarsTag;
