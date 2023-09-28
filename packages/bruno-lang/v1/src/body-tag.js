const { between, regex, everyCharUntil } = require('arcsecond');
const keyvalLines = require('./key-val-lines');

// body(type=json)
const bodyJsonBegin = regex(/^body\s*\(\s*type\s*=\s*json\s*\)\s*\r?\n/);

// body(type=graphql)
const bodyGraphqlBegin = regex(/^body\s*\(\s*type\s*=\s*graphql\s*\)\s*\r?\n/);

// body(type=graphql-vars)
const bodyGraphqlVarsBegin = regex(/^body\s*\(\s*type\s*=\s*graphql-vars\s*\)\s*\r?\n/);

// body(type=text)
const bodyTextBegin = regex(/^body\s*\(\s*type\s*=\s*text\s*\)\s*\r?\n/);

// body(type=xml)
const bodyXmlBegin = regex(/^body\s*\(\s*type\s*=\s*xml\s*\)\s*\r?\n/);

const bodyEnd = regex(/^[\r?\n]+\/body\s*[\r?\n]*/);

const bodyJsonTag = between(bodyJsonBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((bodyJson) => {
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
  };
});

const bodyGraphqlVarsTag = between(bodyGraphqlVarsBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((varsGraphql) => {
  return {
    body: {
      graphql: {
        variables: varsGraphql
      }
    }
  };
});

const bodyTextTag = between(bodyTextBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((bodyText) => {
  return {
    body: {
      text: bodyText
    }
  };
});

const bodyXmlTag = between(bodyXmlBegin)(bodyEnd)(everyCharUntil(bodyEnd)).map((bodyXml) => {
  return {
    body: {
      xml: bodyXml
    }
  };
});

/**
 * We have deprecated form-url-encoded type in body tag, it was a misspelling on my part
 * The new type is form-urlencoded
 *
 * Very few people would have used this. I launched this to the public on 22 Jan 2023
 * And I am making the change on 23 Jan 2023
 *
 * This deprecated tag can be removed on 1 April 2023
 */

// body(type=form-url-encoded)
const bodyFormUrlEncodedDeprecated = regex(/^body\s*\(\s*type\s*=\s*form-url-encoded\s*\)\s*\r?\n/);

// body(type=form-urlencoded)
const bodyFormUrlEncoded = regex(/^body\s*\(\s*type\s*=\s*form-urlencoded\s*\)\s*\r?\n/);

// body(type=multipart-form)
const bodyMultipartForm = regex(/^body\s*\(\s*type\s*=\s*multipart-form\s*\)\s*\r?\n/);

// this regex allows the body end tag to start without a newline
// currently the line parser consumes the last newline
// todo: fix this
const bodyEndRelaxed = regex(/^[\r?\n]*\/body\s*[\r?\n]*/);

const bodyFormUrlEncodedTagDeprecated = between(bodyFormUrlEncodedDeprecated)(bodyEndRelaxed)(keyvalLines).map(
  ([result]) => {
    return {
      body: {
        formUrlEncoded: result
      }
    };
  }
);

const bodyFormUrlEncodedTag = between(bodyFormUrlEncoded)(bodyEndRelaxed)(keyvalLines).map(([result]) => {
  return {
    body: {
      formUrlEncoded: result
    }
  };
});

const bodyMultipartFormTag = between(bodyMultipartForm)(bodyEndRelaxed)(keyvalLines).map(([result]) => {
  return {
    body: {
      multipartForm: result
    }
  };
});

module.exports = {
  bodyJsonTag,
  bodyGraphqlTag,
  bodyGraphqlVarsTag,
  bodyTextTag,
  bodyXmlTag,
  bodyFormUrlEncodedTagDeprecated,
  bodyFormUrlEncodedTag,
  bodyMultipartFormTag
};
