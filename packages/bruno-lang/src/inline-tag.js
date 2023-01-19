const {
  sequenceOf,
  whitespace,
  str,
  lookAhead,
  choice,
  endOfInput,
  everyCharUntil
} = require("arcsecond");

const newline = lookAhead(str("\n"));
const newLineOrEndOfInput = choice([endOfInput, newline]);

const inlineTag = sequenceOf([
  choice([
    str('type'),
    str('name'),
    str('method'),
    str('url'),
    str('seq'),
    str('body-mode')
  ]),
  whitespace,
  everyCharUntil(newLineOrEndOfInput)
]).map(([key, _, val]) => {
  if(key === 'body-mode') {
    return {
      body: {
        mode: val
      }
    };
  }

  return { [key]: val };
});

module.exports = inlineTag;
