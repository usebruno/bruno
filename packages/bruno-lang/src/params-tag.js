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

const begin = sequenceOf([
  regex(/^params[^\S\r\n]*/),
  newline
]);

const end = sequenceOf([
  regex(/^\/params[^\S\r\n]*/),
  newLineOrEndOfInput
]);
const key = everyCharUntil(whitespace);
const value = everyCharUntil(whitespace);

const line = sequenceOf([
  optionalWhitespace,
  digit,
  whitespace,
  key,
  whitespace,
  value,
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
