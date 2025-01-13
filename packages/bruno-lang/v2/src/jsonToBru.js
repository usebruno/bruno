const _ = require('lodash');

const { indentString } = require('../../v1/src/utils');

const enabled = (items = []) => items.filter((item) => item.enabled);
const disabled = (items = []) => items.filter((item) => !item.enabled);

// remove the last line if two new lines are found
const stripLastLine = (text) => {
  if (!text || !text.length) return text;

  return text.replace(/(\r?\n)$/, '');
};

const getValueString = (value) => {
  const hasNewLines = value?.includes('\n');

  if (!hasNewLines) {
    return value;
  }

  // Add one level of indentation to the contents of the multistring
  const indentedLines = value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  // Join the lines back together with newline characters and enclose them in triple single quotes
  return `'''\n${indentedLines}\n'''`;
};

const jsonToBru = (json) => {
  const { meta, http, params, headers, auth, body, script, tests, vars, assertions, docs } = json;

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

  if (params && params.length) {
    const queryParams = params.filter((param) => param.type === 'query');
    const pathParams = params.filter((param) => param.type === 'path');

    if (queryParams.length) {
      bru += 'params:query {';
      if (enabled(queryParams).length) {
        bru += `\n${indentString(
          enabled(queryParams)
            .map((item) => `${item.name}: ${item.value}`)
            .join('\n')
        )}`;
      }

      if (disabled(queryParams).length) {
        bru += `\n${indentString(
          disabled(queryParams)
            .map((item) => `~${item.name}: ${item.value}`)
            .join('\n')
        )}`;
      }

      bru += '\n}\n\n';
    }

    if (pathParams.length) {
      bru += 'params:path {';

      bru += `\n${indentString(pathParams.map((item) => `${item.name}: ${item.value}`).join('\n'))}`;

      bru += '\n}\n\n';
    }
  }

  if (headers && headers.length) {
    bru += 'headers {';
    if (enabled(headers).length) {
      bru += `\n${indentString(
        enabled(headers)
          .map((item) => `${item.name}: ${item.value}`)
          .join('\n')
      )}`;
    }

    if (disabled(headers).length) {
      bru += `\n${indentString(
        disabled(headers)
          .map((item) => `~${item.name}: ${item.value}`)
          .join('\n')
      )}`;
    }

    bru += '\n}\n\n';
  }

  if (auth && auth.awsv4) {
    bru += `auth:awsv4 {
${indentString(`accessKeyId: ${auth?.awsv4?.accessKeyId || ''}`)}
${indentString(`secretAccessKey: ${auth?.awsv4?.secretAccessKey || ''}`)}
${indentString(`sessionToken: ${auth?.awsv4?.sessionToken || ''}`)}
${indentString(`service: ${auth?.awsv4?.service || ''}`)}
${indentString(`region: ${auth?.awsv4?.region || ''}`)}
${indentString(`profileName: ${auth?.awsv4?.profileName || ''}`)}
}

`;
  }

  if (auth && auth.basic) {
    bru += `auth:basic {
${indentString(`username: ${auth?.basic?.username || ''}`)}
${indentString(`password: ${auth?.basic?.password || ''}`)}
}

`;
  }

  if (auth && auth.wsse) {
    bru += `auth:wsse {
${indentString(`username: ${auth?.wsse?.username || ''}`)}
${indentString(`password: ${auth?.wsse?.password || ''}`)}
}

`;
  }

  if (auth && auth.bearer) {
    bru += `auth:bearer {
${indentString(`token: ${auth?.bearer?.token || ''}`)}
}

`;
  }

  if (auth && auth.digest) {
    bru += `auth:digest {
${indentString(`username: ${auth?.digest?.username || ''}`)}
${indentString(`password: ${auth?.digest?.password || ''}`)}
}

`;
  }

  if (auth && auth.oauth2) {
    switch (auth?.oauth2?.grantType) {
      case 'password':
        bru += `auth:oauth2 {
${indentString(`grant_type: password`)}
${indentString(`access_token_url: ${auth?.oauth2?.accessTokenUrl || ''}`)}
${indentString(`username: ${auth?.oauth2?.username || ''}`)}
${indentString(`password: ${auth?.oauth2?.password || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`client_secret: ${auth?.oauth2?.clientSecret || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
}

`;
        break;
      case 'authorization_code':
        bru += `auth:oauth2 {
${indentString(`grant_type: authorization_code`)}
${indentString(`callback_url: ${auth?.oauth2?.callbackUrl || ''}`)}
${indentString(`authorization_url: ${auth?.oauth2?.authorizationUrl || ''}`)}
${indentString(`access_token_url: ${auth?.oauth2?.accessTokenUrl || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`client_secret: ${auth?.oauth2?.clientSecret || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
${indentString(`state: ${auth?.oauth2?.state || ''}`)}
${indentString(`pkce: ${(auth?.oauth2?.pkce || false).toString()}`)}
}

`;
        break;
      case 'client_credentials':
        bru += `auth:oauth2 {
${indentString(`grant_type: client_credentials`)}
${indentString(`access_token_url: ${auth?.oauth2?.accessTokenUrl || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`client_secret: ${auth?.oauth2?.clientSecret || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
}

`;
        break;
    }
  }

  if (auth && auth.apikey) {
    bru += `auth:apikey {
${indentString(`key: ${auth?.apikey?.key || ''}`)}
${indentString(`value: ${auth?.apikey?.value || ''}`)}
${indentString(`placement: ${auth?.apikey?.placement || ''}`)}
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

  if (body && body.rawFile && body.rawFile.length) {
    bru += `body:raw-file {
${indentString(body.rawFile)}
}

`;
  }

  if (body && body.formUrlEncoded && body.formUrlEncoded.length) {
    bru += `body:form-urlencoded {\n`;

    if (enabled(body.formUrlEncoded).length) {
      const enabledValues = enabled(body.formUrlEncoded)
        .map((item) => `${item.name}: ${getValueString(item.value)}`)
        .join('\n');
      bru += `${indentString(enabledValues)}\n`;
    }

    if (disabled(body.formUrlEncoded).length) {
      const disabledValues = disabled(body.formUrlEncoded)
        .map((item) => `~${item.name}: ${getValueString(item.value)}`)
        .join('\n');
      bru += `${indentString(disabledValues)}\n`;
    }

    bru += '}\n\n';
  }

  if (body && body.multipartForm && body.multipartForm.length) {
    bru += `body:multipart-form {`;
    const multipartForms = enabled(body.multipartForm).concat(disabled(body.multipartForm));

    if (multipartForms.length) {
      bru += `\n${indentString(
        multipartForms
          .map((item) => {
            const enabled = item.enabled ? '' : '~';
            const contentType =
              item.contentType && item.contentType !== '' ? ' @contentType(' + item.contentType + ')' : '';

            if (item.type === 'text') {
              return `${enabled}${item.name}: ${getValueString(item.value)}${contentType}`;
            }

            if (item.type === 'file') {
              let filepaths = item.value || [];
              let filestr = filepaths.join('|');
              const value = `@file(${filestr})`;
              return `${enabled}${item.name}: ${value}${contentType}`;
            }
          })
          .join('\n')
      )}`;
    }

    bru += '\n}\n\n';
  }

  if (body && body.graphql && body.graphql.query) {
    bru += `body:graphql {\n`;
    bru += `${indentString(body.graphql.query)}`;
    bru += '\n}\n\n';
  }

  if (body && body.graphql && body.graphql.variables) {
    bru += `body:graphql:vars {\n`;
    bru += `${indentString(body.graphql.variables)}`;
    bru += '\n}\n\n';
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
      bru += `\n${indentString(varsEnabled.map((item) => `${item.name}: ${item.value}`).join('\n'))}`;
    }

    if (varsLocalEnabled.length) {
      bru += `\n${indentString(varsLocalEnabled.map((item) => `@${item.name}: ${item.value}`).join('\n'))}`;
    }

    if (varsDisabled.length) {
      bru += `\n${indentString(varsDisabled.map((item) => `~${item.name}: ${item.value}`).join('\n'))}`;
    }

    if (varsLocalDisabled.length) {
      bru += `\n${indentString(varsLocalDisabled.map((item) => `~@${item.name}: ${item.value}`).join('\n'))}`;
    }

    bru += '\n}\n\n';
  }
  if (resvars && resvars.length) {
    const varsEnabled = _.filter(resvars, (v) => v.enabled && !v.local);
    const varsDisabled = _.filter(resvars, (v) => !v.enabled && !v.local);
    const varsLocalEnabled = _.filter(resvars, (v) => v.enabled && v.local);
    const varsLocalDisabled = _.filter(resvars, (v) => !v.enabled && v.local);

    bru += `vars:post-response {`;

    if (varsEnabled.length) {
      bru += `\n${indentString(varsEnabled.map((item) => `${item.name}: ${item.value}`).join('\n'))}`;
    }

    if (varsLocalEnabled.length) {
      bru += `\n${indentString(varsLocalEnabled.map((item) => `@${item.name}: ${item.value}`).join('\n'))}`;
    }

    if (varsDisabled.length) {
      bru += `\n${indentString(varsDisabled.map((item) => `~${item.name}: ${item.value}`).join('\n'))}`;
    }

    if (varsLocalDisabled.length) {
      bru += `\n${indentString(varsLocalDisabled.map((item) => `~@${item.name}: ${item.value}`).join('\n'))}`;
    }

    bru += '\n}\n\n';
  }

  if (assertions && assertions.length) {
    bru += `assert {`;

    if (enabled(assertions).length) {
      bru += `\n${indentString(
        enabled(assertions)
          .map((item) => `${item.name}: ${item.value}`)
          .join('\n')
      )}`;
    }

    if (disabled(assertions).length) {
      bru += `\n${indentString(
        disabled(assertions)
          .map((item) => `~${item.name}: ${item.value}`)
          .join('\n')
      )}`;
    }

    bru += '\n}\n\n';
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

// alternative to writing the below code to avoif undefined
