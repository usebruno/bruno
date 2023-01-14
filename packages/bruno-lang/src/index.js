const {
  many,
  choice,
  anyChar
} = require("arcsecond");
const _ = require('lodash');

const inlineTag  = require('./inline-tag');
const paramsTag  = require('./params-tag');
const headersTag = require('./headers-tag');
const {
  bodyJsonTag,
  bodyGraphqlTag,
  bodyTextTag
} = require('./body-tag');

const bruToJson = (fileContents) => {
  const parser = many(choice([
    inlineTag,
    paramsTag,
    headersTag,
    bodyJsonTag,
    bodyGraphqlTag,
    bodyTextTag,
    anyChar
  ]));

  const parsed = parser
    .run(fileContents)
    .result
    .reduce((acc, item) => _.merge(acc, item), {});

  return {
    ver: parsed.ver,
    type: parsed.type,
    name: parsed.name,
    method: parsed.method,
    url: parsed.url,
    params: parsed.params,
    headers: parsed.headers,
    body: parsed.body
  }
};

module.exports = {
  bruToJson
};