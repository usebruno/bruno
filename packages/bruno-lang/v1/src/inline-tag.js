const { sequenceOf, str, regex, choice, endOfInput, everyCharUntil } = require('arcsecond');

const whitespace = regex(/^[ \t]*/);
const newline = regex(/^\r?\n/);
const newLineOrEndOfInput = choice([endOfInput, newline]);

const inlineTag = sequenceOf([
  choice([str('type'), str('name'), str('method'), str('url'), str('seq'), str('body-mode')]),
  whitespace,
  choice([newline, everyCharUntil(newLineOrEndOfInput)])
]).map(([key, _, val]) => {
  if (val === '\n' || val === '\r\n') {
    val = '';
  }

  if (key === 'body-mode') {
    return {
      body: {
        mode: val
      }
    };
  }

  return { [key]: val };
});

module.exports = inlineTag;
