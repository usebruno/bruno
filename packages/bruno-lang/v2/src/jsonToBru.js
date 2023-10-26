const _ = require('lodash');

const { indentString } = require('../../v1/src/utils');

const END_OF_GROUP = '\n}\n\n';

const enabled = (items = []) => items.filter((item) => item.enabled);
const disabled = (items = []) => items.filter((item) => !item.enabled);

// remove the last line if two new lines are found
const stripLastLine = (text) => {
  if (!text || !text.length) return text;

  return text.replace(/(\r?\n)$/, '');
};

/**
 * Encodes the given key value items so they do not break the bruno file grammar
 * @param {{ name: string, value: string }[]} items The items to encode
 * @param disabled If true, a tilde is put in front of the encoded strings
 * @param prefix A custom string to put in front of the item name
 * @returns The encoded lines joined by a newline and indent so it can be put in the bruno file
 */
function encodeKeyValueItems(items, disabled = false, prefix = '') {
  const _prefix = (disabled ? '~' : '') + prefix;
  return (
    '\n' + indentString(items.map((item) => `${_prefix}${encodeURIComponent(item.name)}: ${item.value}`).join('\n'))
  );
}

const jsonToBru = (json) => {
  const { meta, http, query, headers, auth, body, script, tests, vars, assertions, docs } = json;

  let bru = '';

  if (meta) {
    bru += 'meta {\n';
    for (const key in meta) {
      bru += `  ${key}: ${meta[key]}\n`;
    }
    bru += '}\n\n';
  }

  if (http && http.method) {
    bru += `${http.method} {
  url: ${http.url}`;

    if (http.body && http.body.length) {
      bru += `
  body: ${http.body}`;
    }

    if (http.auth && http.auth.length) {
      bru += `
  auth: ${http.auth}`;
    }

    bru += `
}

`;
  }

  if (query && query.length) {
    bru += 'query {';
    if (enabled(query).length) {
      bru += encodeKeyValueItems(enabled(query));
    }

    if (disabled(query).length) {
      bru += encodeKeyValueItems(disabled(query), true);
    }

    bru += END_OF_GROUP;
  }

  if (headers && headers.length) {
    bru += 'headers {';
    if (enabled(headers).length) {
      bru += encodeKeyValueItems(enabled(headers));
    }

    if (disabled(headers).length) {
      bru += encodeKeyValueItems(disabled(headers), true);
    }

    bru += END_OF_GROUP;
  }

  if (auth && auth.awsv4) {
    bru += `auth:awsv4 {
${indentString(`accessKeyId: ${auth.awsv4.accessKeyId}`)}
${indentString(`secretAccessKey: ${auth.awsv4.secretAccessKey}`)}
${indentString(`sessionToken: ${auth.awsv4.sessionToken}`)}
${indentString(`service: ${auth.awsv4.service}`)}
${indentString(`region: ${auth.awsv4.region}`)}
${indentString(`profileName: ${auth.awsv4.profileName}`)}
}

`;
  }

  if (auth && auth.basic) {
    bru += `auth:basic {
${indentString(`username: ${auth.basic.username}`)}
${indentString(`password: ${auth.basic.password}`)}
}

`;
  }

  if (auth && auth.bearer) {
    bru += `auth:bearer {
${indentString(`token: ${auth.bearer.token}`)}
}

`;
  }

  if (body && body.json && body.json.length) {
    bru += `body:json {
${indentString(body.json)}
}

`;
  }

  if (body && body.text && body.text.length) {
    bru += `body:text {
${indentString(body.text)}
}

`;
  }

  if (body && body.xml && body.xml.length) {
    bru += `body:xml {
${indentString(body.xml)}
}

`;
  }

  if (body && body.sparql && body.sparql.length) {
    bru += `body:sparql {
${indentString(body.sparql)}
}

`;
  }

  if (body && body.formUrlEncoded && body.formUrlEncoded.length) {
    bru += `body:form-urlencoded {`;
    if (enabled(body.formUrlEncoded).length) {
      bru += encodeKeyValueItems(enabled(body.formUrlEncoded));
    }

    if (disabled(body.formUrlEncoded).length) {
      bru += encodeKeyValueItems(disabled(body.formUrlEncoded), true);
    }

    bru += END_OF_GROUP;
  }

  if (body && body.multipartForm && body.multipartForm.length) {
    bru += `body:multipart-form {`;
    if (enabled(body.multipartForm).length) {
      bru += encodeKeyValueItems(enabled(body.multipartForm));
    }

    if (disabled(body.multipartForm).length) {
      bru += encodeKeyValueItems(disabled(body.multipartForm), true);
    }

    bru += END_OF_GROUP;
  }

  if (body && body.graphql && body.graphql.query) {
    bru += `body:graphql {\n`;
    bru += `${indentString(body.graphql.query)}`;
    bru += END_OF_GROUP;
  }

  if (body && body.graphql && body.graphql.variables) {
    bru += `body:graphql:vars {\n`;
    bru += `${indentString(body.graphql.variables)}`;
    bru += END_OF_GROUP;
  }

  let reqvars = _.get(vars, 'req');
  let resvars = _.get(vars, 'res');
  if (reqvars && reqvars.length) {
    const varsEnabled = _.filter(reqvars, (v) => v.enabled && !v.local);
    const varsDisabled = _.filter(reqvars, (v) => !v.enabled && !v.local);
    const varsLocalEnabled = _.filter(reqvars, (v) => v.enabled && v.local);
    const varsLocalDisabled = _.filter(reqvars, (v) => !v.enabled && v.local);

    bru += `vars:pre-request {`;

    if (varsEnabled.length) {
      bru += encodeKeyValueItems(varsEnabled);
    }

    if (varsLocalEnabled.length) {
      bru += encodeKeyValueItems(varsLocalEnabled, false, '@');
    }

    if (varsDisabled.length) {
      bru += encodeKeyValueItems(varsDisabled, true);
    }

    if (varsLocalDisabled.length) {
      bru += encodeKeyValueItems(varsLocalDisabled, true, '@');
    }

    bru += END_OF_GROUP;
  }
  if (resvars && resvars.length) {
    const varsEnabled = _.filter(resvars, (v) => v.enabled && !v.local);
    const varsDisabled = _.filter(resvars, (v) => !v.enabled && !v.local);
    const varsLocalEnabled = _.filter(resvars, (v) => v.enabled && v.local);
    const varsLocalDisabled = _.filter(resvars, (v) => !v.enabled && v.local);

    bru += `vars:post-response {`;

    if (varsEnabled.length) {
      bru += encodeKeyValueItems(varsEnabled);
    }

    if (varsLocalEnabled.length) {
      bru += encodeKeyValueItems(varsLocalEnabled, false, '@');
    }

    if (varsDisabled.length) {
      bru += encodeKeyValueItems(varsDisabled, true);
    }

    if (varsLocalDisabled.length) {
      bru += encodeKeyValueItems(varsLocalDisabled, true, '@');
    }

    bru += END_OF_GROUP;
  }

  if (assertions && assertions.length) {
    bru += `assert {`;

    if (enabled(assertions).length) {
      bru += encodeKeyValueItems(enabled(assertions));
    }

    if (disabled(assertions).length) {
      bru += encodeKeyValueItems(disabled(assertions), true);
    }

    bru += END_OF_GROUP;
  }

  if (script && script.req && script.req.length) {
    bru += `script:pre-request {
${indentString(script.req)}
}

`;
  }

  if (script && script.res && script.res.length) {
    bru += `script:post-response {
${indentString(script.res)}
}

`;
  }

  if (tests && tests.length) {
    bru += `tests {
${indentString(tests)}
}

`;
  }

  if (docs && docs.length) {
    bru += `docs {
${indentString(docs)}
}

`;
  }

  return stripLastLine(bru);
};

module.exports = jsonToBru;
