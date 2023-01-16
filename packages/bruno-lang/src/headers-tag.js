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

const begin = regex(/^headers\s*\r?\n/);
const end = regex(/^[\r?\n]*\/headers\s*[\r?\n]*/);
const word = regex(/^[^\s\t\n]+/g);

const line = sequenceOf([
  optionalWhitespace,
  digit,
  whitespace,
  word,
  whitespace,
  word,
  newLineOrEndOfInput
]).map(([_, enabled, __, key, ___, value]) => {
  return {
    "enabled": Number(enabled) ? true : false,
    "name": key,
    "value": value
  };
});

const lines = many(line);
const headersLines = sepBy(newline)(lines);
const headersTag = between(begin)(end)(headersLines).map(([headers]) => {
  return {
    headers
  };
});

module.exports = headersTag;
