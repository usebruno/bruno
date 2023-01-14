const {
  str,
  sequenceOf,
  optionalWhitespace,
  choice,
  endOfInput,
  between,
  regex,
  everyCharUntil
} = require("arcsecond");
const { safeParseJson } = require('./utils');

const newline = regex(/^\r?\n/);
const newLineOrEndOfInput = choice([newline, endOfInput]);

// body(type=json)
const bodyJsonBegin = sequenceOf([
  str('body'),
  optionalWhitespace,
  str('('),
  optionalWhitespace,
  str('type'),
  optionalWhitespace,
  str('='),
  optionalWhitespace,
  str('json'),
  optionalWhitespace,
  regex(/^\)\s*\r?\n/),
]);

const bodyEnd = sequenceOf([
  regex(/^\/body\s*/),
  newLineOrEndOfInput
]);

const bodyJsonTag = between(bodyJsonBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((bodyJson) => {
  if(bodyJson && bodyJson.length) {
    bodyJson = bodyJson.trim();
    const safelyParsed = safeParseJson(bodyJson);

    if(!safelyParsed) {
      return {
        bodyJson
      }
    }

    return {
      bodyJson: JSON.stringify(safelyParsed)
    };
  }

  return {
    bodyJson
  };
});

module.exports = {
  bodyJsonTag
};
