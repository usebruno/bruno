const {
  many,
  choice,
  anyChar
} = require("arcsecond");
const _ = require('lodash');
const {
  safeParseJson,
  indentString
} = require('./utils');

const inlineTag  = require('./inline-tag');
const paramsTag  = require('./params-tag');
const headersTag = require('./headers-tag');
const {
  bodyJsonTag,
  bodyGraphqlTag,
  bodyTextTag,
  bodyXmlTag,
  bodyFormUrlEncodedTag,
  bodyMultipartFormTag
} = require('./body-tag');

const bruToJson = (fileContents) => {
  const parser = many(choice([
    inlineTag,
    paramsTag,
    headersTag,
    bodyJsonTag,
    bodyGraphqlTag,
    bodyTextTag,
    bodyXmlTag,
    bodyFormUrlEncodedTag,
    bodyMultipartFormTag,
    anyChar
  ]));

  const parsed = parser
    .run(fileContents)
    .result
    .reduce((acc, item) => _.merge(acc, item), {});

  return {
    ver: parsed.ver,
    type: parsed.type || '',
    name: parsed.name || '',
    method: parsed.method || '',
    url: parsed.url || '',
    params: parsed.params || [],
    headers: parsed.headers || [],
    body: parsed.body || {mode: 'none'}
  }
};

const jsonToBru = (json) => {
  const {
    ver,
    type,
    name,
    method,
    url,
    params,
    headers,
    body
  } = json;

  let bru = `ver ${ver}
type ${type}
name ${name}
method ${method}
url ${url}
body-mode ${body.mode}
`;

  if(params && params.length) {
    bru += `
params
${params.map(param => `  ${param.enabled} ${param.key} ${param.value}`).join('\n')}
/params
`;
  }

  if(headers && headers.length) {
    bru += `
headers
${headers.map(header => `  ${header.enabled} ${header.key} ${header.value}`).join('\n')}
/headers
`;
  }

  if(body.json && body.json.length) {
    let jsonText = '';
    let bodyJson = body.json;
    if(bodyJson && bodyJson.length) {
      bodyJson = bodyJson.trim();
      const safelyParsed = safeParseJson(bodyJson);

      if(safelyParsed) {
        jsonText = JSON.stringify(safelyParsed, null, 2);
      } else {
        jsonText = bodyJson;
      }
    }
    bru += `
body(type=json)
${indentString(jsonText)}
/body
`;
  }

  if(body.graphql && body.graphql.query) {
    bru += `
body(type=graphql)
${indentString(body.graphql.query)}
/body
`;
  }

  if(body.text && body.text.length) {
    bru += `
body(type=text)
${indentString(body.text)}
/body
`;
  }

  if(body.xml && body.xml.length) {
    bru += `
body(type=xml)
${indentString(body.xml)}
/body
`;
  }

  if(body.formUrlEncoded && body.formUrlEncoded.length) {
    bru += `
body(type=form-url-encoded)
${body.formUrlEncoded.map(item => `  ${item.enabled} ${item.key} ${item.value}`).join('\n')}
/body
`;
  }

  if(body.multipartForm && body.multipartForm.length) {
    bru += `
body(type=multipart-form)
${body.multipartForm.map(item => `  ${item.enabled} ${item.key} ${item.value}`).join('\n')}
/body
`;
  }

  return bru;
};

module.exports = {
  bruToJson,
  jsonToBru
};