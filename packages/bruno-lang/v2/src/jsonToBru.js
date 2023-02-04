const _ = require('lodash');

const {
  indentString,
} = require('../../v1/src/utils');

const enabled = (items = []) => items.filter(item => item.enabled);
const disabled = (items = []) => items.filter(item => !item.enabled);

// remove the last line if two new lines are found
const stripLastLine = (text) => {
  if(!text || !text.length) return text;

  return text.replace(/(\r?\n)$/, '');
};

const jsonToBru = (json) => {
  const {
    meta,
    http,
    query,
    headers,
    body,
    script,
    tests,
    vars,
    assert,
    docs
  } = json;

  let bru = '';

  if(meta) {
    bru += 'meta {\n';
    for (const key in meta) {
      bru += `  ${key}: ${meta[key]}\n`;
    }
    bru += '}\n\n';
  }

  if(http && http.method) {
    bru += `${http.method} {
  url: ${http.url}`;

    if(http.body && http.body.length) {
      bru += `
  body: ${http.body}`;
    }

    bru += `
}

`;
  }

  if(query && query.length && enabled(query).length) {
    bru += `query {
${indentString(enabled(query).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(query && query.length && disabled(query).length) {
    bru += `query:disabled {
${indentString(disabled(query).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(headers && headers.length && enabled(headers).length) {
  bru += `headers {
${indentString(enabled(headers).map(header => `${header.name}: ${header.value}`).join('\n'))}
}

`;
  }

  if(headers && headers.length && disabled(headers).length) {
  bru += `headers:disabled {
${indentString(disabled(headers).map(header => `${header.name}: ${header.value}`).join('\n'))}
}

`;
  }

  if(body && body.json && body.json.length) {
  bru += `body:json {
${indentString(body.json)}
}

`;
  }

  if(body && body.text && body.text.length) {
  bru += `body:text {
${indentString(body.text)}
}

`;
  }

  if(body && body.xml && body.xml.length) {
  bru += `body:xml {
${indentString(body.xml)}
}

`;
  }

  if(body && body.formUrlEncoded && enabled(body.formUrlEncoded).length) {
  bru += `body:form-urlencoded {
${indentString(enabled(body.formUrlEncoded).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(body && body.formUrlEncoded && disabled(body.formUrlEncoded).length) {
  bru += `body:form-urlencoded:disabled {
${indentString(disabled(body.formUrlEncoded).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(body && body.multipartForm && enabled(body.multipartForm).length) {
  bru += `body:multipart-form {
${indentString(enabled(body.multipartForm).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(body && body.multipartForm && disabled(body.multipartForm).length) {
  bru += `body:multipart-form:disabled {
${indentString(disabled(body.multipartForm).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(body && body.graphql && body.graphql.query) {
  bru += `body:graphql {
${indentString(body.graphql.query)}
}

`;
  }

  if(body && body.graphql && body.graphql.variables) {
  bru += `body:graphql:vars {
${indentString(body.graphql.variables)}
}

`;
  }

  if(vars && vars.length) {
    const varsEnabled = _.filter(vars, (v) => v.enabled && !v.local);
    const varsDisabled = _.filter(vars, (v) => !v.enabled && !v.local);
    const varsLocalEnabled = _.filter(vars, (v) => v.enabled && v.local);
    const varsLocalDisabled = _.filter(vars, (v) => !v.enabled && v.local);

    if(varsEnabled.length) {
      bru += `vars {
${indentString(varsEnabled.map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
    }

    if(varsDisabled.length) {
      bru += `vars:disabled {
${indentString(varsDisabled.map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
    }

    if(varsLocalEnabled.length) {
      bru += `vars:local {
${indentString(varsLocalEnabled.map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
    }

    if(varsLocalDisabled.length) {
      bru += `vars:local:disabled {
${indentString(varsLocalDisabled.map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
    }
  }

  if(assert && enabled(assert).length) {
  bru += `assert {
${indentString(enabled(assert).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(assert && disabled(assert).length) {
  bru += `assert:disabled {
${indentString(disabled(assert).map(item => `${item.name}: ${item.value}`).join('\n'))}
}

`;
  }

  if(script && script.length) {
  bru += `script {
${indentString(script)}
}

`;
  }

  if(tests && tests.length) {
  bru += `tests {
${indentString(tests)}
}

`;
  }

  if(docs && docs.length) {
  bru += `docs {
${indentString(docs)}
}

`;
  }
  

  return stripLastLine(bru);
};

module.exports = jsonToBru;
