const {
  many,
  choice,
  anyChar
} = require("arcsecond");

const inlineTag  = require('./inline-tag');
const paramsTag  = require('./params-tag');
const headersTag = require('./headers-tag');

const bruToJson = (fileContents) => {
  const parser = many(choice([
    inlineTag,
    paramsTag,
    headersTag,
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
    params: parsed.params,
    headers: parsed.headers
  }
};

module.exports = {
  bruToJson
};