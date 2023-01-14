const {
  sequenceOf,
  whitespace,
  optionalWhitespace,
  choice,
  endOfInput,
  everyCharUntil,
  between,
  digit,
  many,
  regex,
  sepBy
} = require("arcsecond");

const newline = regex(/^\r?\n/);
const newLineOrEndOfInput = choice([newline, endOfInput]);

const begin = regex(/^params\s*\r?\n/);
const end = regex(/^[\r?\n]*\/params\s*[\r?\n]*/);
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
    "enabled": enabled,
    "key": key,
    "value": value
  };
});

const lines = many(line);
const paramsLines = sepBy(newline)(lines);
const paramsTag = between(begin)(end)(paramsLines).map(([params]) => {
  return {
    params
  };
});

module.exports = paramsTag;
