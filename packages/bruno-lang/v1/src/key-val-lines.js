const { sequenceOf, whitespace, optionalWhitespace, choice, digit, many, regex, sepBy } = require('arcsecond');

const newline = regex(/^\r?\n/);
const wordWithoutWhitespace = regex(/^[^\s\r?\t\n]+/g);
const wordWithWhitespace = regex(/^[^\r?\n]+/g);

// matching lines like: 1 key value
const line = sequenceOf([
  optionalWhitespace,
  digit,
  whitespace,
  wordWithoutWhitespace,
  whitespace,
  wordWithWhitespace
]).map(([_, enabled, __, key, ___, value]) => {
  return {
    enabled: Number(enabled) ? true : false,
    name: key ? key.trim() : '',
    value: value ? value.trim() : ''
  };
});

// matching lines like: 1 key follows by [whitespaces] and a newline
const line2 = sequenceOf([optionalWhitespace, digit, whitespace, wordWithoutWhitespace, regex(/^\s*\r?\n/)]).map(
  ([_, enabled, __, key]) => {
    return {
      enabled: Number(enabled) ? true : false,
      name: key,
      value: ''
    };
  }
);

// matching lines like: 1 followed by [whitespaces] and a newline
const line3 = sequenceOf([optionalWhitespace, digit, regex(/^\s*\r?\n/)]).map(([_, enabled]) => {
  return {
    enabled: Number(enabled) ? true : false,
    name: '',
    value: ''
  };
});

const lines = many(choice([line3, line2, line]));

const keyValLines = sepBy(newline)(lines);

module.exports = keyValLines;
