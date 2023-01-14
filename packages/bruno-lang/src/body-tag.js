const {
  between,
  regex,
  everyCharUntil,
} = require("arcsecond");
const { safeParseJson } = require('./utils');


// body(type=json)
const bodyJsonBegin = regex(/^body\s*\(\s*type\s*=\s*json\s*\)\s*\r?\n/);

// body(type=graphql)
const bodyGraphqlBegin = regex(/^body\s*\(\s*type\s*=\s*graphql\s*\)\s*\r?\n/);

const bodyEnd = regex(/^\/body\s*[\r?\n]*/);

const bodyJsonTag = between(bodyJsonBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((bodyJson) => {
  if(bodyJson && bodyJson.length) {
    bodyJson = bodyJson.trim();
    const safelyParsed = safeParseJson(bodyJson);

    if(!safelyParsed) {
      return {
        body: {
          json: bodyJson
        }
      }
    }

    return {
      body: {
        json: JSON.stringify(safelyParsed)
      }
    };
  }

  return {
    body: {
      json: bodyJson
    }
  };
});

const bodyGraphqlTag = between(bodyGraphqlBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((bodyGraphql) => {
  return {
    body: {
      graphql: {
        query: bodyGraphql
      }
    }
  }
});

module.exports = {
  bodyJsonTag,
  bodyGraphqlTag
};
