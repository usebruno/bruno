const {
  sepBy,
  regex,
  many,
  choice,
  anyChar
} = require("arcsecond");

const inlineTag  = require('./inline-tag');
const paramsTag  = require('./params-tag');

const bruToJson = (fileContents) => {
  const newline = regex(/^\r?\n/);
  const line = inlineTag;
  const lines = many(line);
  // const parser = sepBy(newline)(lines);

  let parser = choice([
    sepBy(newline)(lines),
    paramsTag
  ]);

  parser = many(choice([
    inlineTag,
    paramsTag,
    anyChar
  ]));

  const parsed = parser
    .run(fileContents)
    .result
    .reduce((acc, item) => {
      return {
        ...acc,
        ...item
      };
    }, {});

  return {
    ver: parsed.ver,
    type: parsed.type,
    name: parsed.name,
    method: parsed.method,
    url: parsed.url,
    params: parsed.params
  }
};

module.exports = {
  bruToJson
};