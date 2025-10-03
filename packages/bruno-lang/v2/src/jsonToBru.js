const _ = require('lodash');

const { indentString, getValueString } = require('./utils');

const enabled = (items = [], key = "enabled") => items.filter((item) => item[key]);
const disabled = (items = [], key = "enabled") => items.filter((item) => !item[key]);
const quoteKey = (key) => {
  const quotableChars = [':', '"', '{', '}', ' '];
  return quotableChars.some(char => key.includes(char)) ? ('"' + key.replaceAll('"', '\\"') + '"') : key;
}

// remove the last line if two new lines are found
const stripLastLine = (text) => {
  if (!text || !text.length) return text;

  return text.replace(/(\r?\n)$/, '');
};

const jsonToBru = (json) => {
  const { meta, http, grpc, ws, params, headers, metadata, auth, body, script, tests, vars, assertions, settings, docs } = json;


  let bru = '';

  if (meta) {
    bru += 'meta {\n';

    const tags = meta.tags;
    delete meta.tags;

    for (const key in meta) {
      bru += `  ${key}: ${meta[key]}\n`;
    }

    if (tags && tags.length) {
      bru += `  tags: [\n`;
      for (const tag of tags) {
        bru += `    ${tag}\n`;
      }
      bru += `  ]\n`;
    }

    bru += '}\n\n';
  }

  if (http?.method) {
    const { method, url, body, auth } = http;
    const standardMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace', 'connect']);

    const isStandard = standardMethods.has(method);

    bru += isStandard ? `${method} {` : `http {\n  method: ${method}`;
    bru += `\n  url: ${url}`;

    if (body?.length) {
      bru += `\n  body: ${body}`;
    }

    if (auth?.length) {
      bru += `\n  auth: ${auth}`;
    }

    bru += `\n}\n\n`;
  }

  if(grpc && grpc.url) {
      bru += `grpc {
  url: ${grpc.url}`;

    if(grpc.method && grpc.method.length) {
      bru += `
  method: ${grpc.method}`;
    }

    if(grpc.body && grpc.body.length) {
      bru += `
  body: ${grpc.body}`;
    }

    if(grpc.protoPath && grpc.protoPath.length) {
      bru += `
  protoPath: ${grpc.protoPath}`;
    }

    if (grpc.auth && grpc.auth.length) {
      bru += `
  auth: ${grpc.auth}`;
    }

    if (grpc.methodType && grpc.methodType.length) {
      bru += `
  methodType: ${grpc.methodType}`;
    }

    bru += `
}

`;
  }

  if (ws && ws.url) {
    bru += `ws {
  url: ${ws.url}`;

    if (ws.body && ws.body.length) {
      bru += `
  body: ${ws.body}`;
    }

    if (ws.auth && ws.auth.length) {
      bru += `
  auth: ${ws.auth}`;
    }

    if (ws.methodType && ws.methodType.length) {
      bru += `
  methodType: ${ws.methodType}`;
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
            .map((item) => `${quoteKey(item.name)}: ${item.value}`)
            .join('\n')
        )}`;
      }

      if (disabled(queryParams).length) {
        bru += `\n${indentString(
          disabled(queryParams)
            .map((item) => `~${quoteKey(item.name)}: ${item.value}`)
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
          .map((item) => `${quoteKey(item.name)}: ${item.value}`)
          .join('\n')
      )}`;
    }

    if (disabled(headers).length) {
      bru += `\n${indentString(
        disabled(headers)
          .map((item) => `~${quoteKey(item.name)}: ${item.value}`)
          .join('\n')
      )}`;
    }

    bru += '\n}\n\n';
  }

  if (metadata && metadata.length) {
    bru += 'metadata {';
    if (enabled(metadata).length) {
      bru += `\n${indentString(
        enabled(metadata)
          .map((item) => `${item.name}: ${item.value}`)
          .join('\n')
      )}`;
    }

    if (disabled(metadata).length) {
      bru += `\n${indentString(
        disabled(metadata)
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


  if (auth && auth.ntlm) {
    bru += `auth:ntlm {
${indentString(`username: ${auth?.ntlm?.username || ''}`)}
${indentString(`password: ${auth?.ntlm?.password || ''}`)}
${indentString(`domain: ${auth?.ntlm?.domain || ''}`)}

}

`;
  }

  if (auth && auth.oauth2) {
    switch (auth?.oauth2?.grantType) {
      case 'password':
        bru += `auth:oauth2 {
${indentString(`grant_type: password`)}
${indentString(`access_token_url: ${auth?.oauth2?.accessTokenUrl || ''}`)}
${indentString(`refresh_token_url: ${auth?.oauth2?.refreshTokenUrl || ''}`)}
${indentString(`username: ${auth?.oauth2?.username || ''}`)}
${indentString(`password: ${auth?.oauth2?.password || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`client_secret: ${auth?.oauth2?.clientSecret || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
${indentString(`credentials_placement: ${auth?.oauth2?.credentialsPlacement || ''}`)}
${indentString(`credentials_id: ${auth?.oauth2?.credentialsId || ''}`)}
${indentString(`token_placement: ${auth?.oauth2?.tokenPlacement || ''}`)}${
  auth?.oauth2?.tokenPlacement == 'header' ? '\n' + indentString(`token_header_prefix: ${auth?.oauth2?.tokenHeaderPrefix || ''}`) : ''
}${
  auth?.oauth2?.tokenPlacement !== 'header' ? '\n' + indentString(`token_query_key: ${auth?.oauth2?.tokenQueryKey || ''}`) : ''
}
${indentString(`auto_fetch_token: ${(auth?.oauth2?.autoFetchToken ?? true).toString()}`)}
${indentString(`auto_refresh_token: ${(auth?.oauth2?.autoRefreshToken ?? false).toString()}`)}
}

`;
        break;
      case 'authorization_code':
        bru += `auth:oauth2 {
${indentString(`grant_type: authorization_code`)}
${indentString(`callback_url: ${auth?.oauth2?.callbackUrl || ''}`)}
${indentString(`authorization_url: ${auth?.oauth2?.authorizationUrl || ''}`)}
${indentString(`access_token_url: ${auth?.oauth2?.accessTokenUrl || ''}`)}
${indentString(`refresh_token_url: ${auth?.oauth2?.refreshTokenUrl || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`client_secret: ${auth?.oauth2?.clientSecret || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
${indentString(`state: ${auth?.oauth2?.state || ''}`)}
${indentString(`pkce: ${(auth?.oauth2?.pkce || false).toString()}`)}
${indentString(`credentials_placement: ${auth?.oauth2?.credentialsPlacement || ''}`)}
${indentString(`credentials_id: ${auth?.oauth2?.credentialsId || ''}`)}
${indentString(`token_placement: ${auth?.oauth2?.tokenPlacement || ''}`)}${
  auth?.oauth2?.tokenPlacement == 'header' ? '\n' + indentString(`token_header_prefix: ${auth?.oauth2?.tokenHeaderPrefix || ''}`) : ''
}${
  auth?.oauth2?.tokenPlacement !== 'header' ? '\n' + indentString(`token_query_key: ${auth?.oauth2?.tokenQueryKey || ''}`) : ''
}
${indentString(`auto_fetch_token: ${(auth?.oauth2?.autoFetchToken ?? true).toString()}`)}
${indentString(`auto_refresh_token: ${(auth?.oauth2?.autoRefreshToken ?? false).toString()}`)}
}

`;
        break;
      case 'client_credentials':
        bru += `auth:oauth2 {
${indentString(`grant_type: client_credentials`)}
${indentString(`access_token_url: ${auth?.oauth2?.accessTokenUrl || ''}`)}
${indentString(`refresh_token_url: ${auth?.oauth2?.refreshTokenUrl || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`client_secret: ${auth?.oauth2?.clientSecret || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
${indentString(`credentials_placement: ${auth?.oauth2?.credentialsPlacement || ''}`)}
${indentString(`credentials_id: ${auth?.oauth2?.credentialsId || ''}`)}
${indentString(`token_placement: ${auth?.oauth2?.tokenPlacement || ''}`)}${
  auth?.oauth2?.tokenPlacement == 'header' ? '\n' + indentString(`token_header_prefix: ${auth?.oauth2?.tokenHeaderPrefix || ''}`) : ''
}${
  auth?.oauth2?.tokenPlacement !== 'header' ? '\n' + indentString(`token_query_key: ${auth?.oauth2?.tokenQueryKey || ''}`) : ''
}
${indentString(`auto_fetch_token: ${(auth?.oauth2?.autoFetchToken ?? true).toString()}`)}
${indentString(`auto_refresh_token: ${(auth?.oauth2?.autoRefreshToken ?? false).toString()}`)}
}

`;
        break;
      case 'implicit':
        bru += `auth:oauth2 {
${indentString(`grant_type: implicit`)}
${indentString(`callback_url: ${auth?.oauth2?.callbackUrl || ''}`)}
${indentString(`authorization_url: ${auth?.oauth2?.authorizationUrl || ''}`)}
${indentString(`client_id: ${auth?.oauth2?.clientId || ''}`)}
${indentString(`scope: ${auth?.oauth2?.scope || ''}`)}
${indentString(`state: ${auth?.oauth2?.state || ''}`)}
${indentString(`credentials_id: ${auth?.oauth2?.credentialsId || ''}`)}
${indentString(`token_placement: ${auth?.oauth2?.tokenPlacement || ''}`)}${
  auth?.oauth2?.tokenPlacement == 'header' ? '\n' + indentString(`token_header_prefix: ${auth?.oauth2?.tokenHeaderPrefix || ''}`) : ''
}${
  auth?.oauth2?.tokenPlacement !== 'header' ? '\n' + indentString(`token_query_key: ${auth?.oauth2?.tokenQueryKey || ''}`) : ''
}
${indentString(`auto_fetch_token: ${(auth?.oauth2?.autoFetchToken ?? true).toString()}`)}
}

`;
        break;
    }

    if (auth?.oauth2?.additionalParameters) {
      const { authorization: authorizationParams, token: tokenParams, refresh: refreshParams } = auth?.oauth2?.additionalParameters;
      const authorizationHeaders = authorizationParams?.filter(p => p?.sendIn == 'headers');
      if (authorizationHeaders?.length) {
        bru += `auth:oauth2:additional_params:auth_req:headers {
${indentString(
  authorizationHeaders
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const authorizationQueryParams = authorizationParams?.filter(p => p?.sendIn == 'queryparams');
      if (authorizationQueryParams?.length) {
        bru += `auth:oauth2:additional_params:auth_req:queryparams {
${indentString(
  authorizationQueryParams
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const tokenHeaders = tokenParams?.filter(p => p?.sendIn == 'headers');
      if (tokenHeaders?.length) {
        bru += `auth:oauth2:additional_params:access_token_req:headers {
${indentString(
  tokenHeaders
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const tokenQueryParams = tokenParams?.filter(p => p?.sendIn == 'queryparams');
      if (tokenQueryParams?.length) {
        bru += `auth:oauth2:additional_params:access_token_req:queryparams {
${indentString(
  tokenQueryParams
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const tokenBodyValues = tokenParams?.filter(p => p?.sendIn == 'body');
      if (tokenBodyValues?.length) {
        bru += `auth:oauth2:additional_params:access_token_req:body {
${indentString(
  tokenBodyValues
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const refreshHeaders = refreshParams?.filter(p => p?.sendIn == 'headers');
      if (refreshHeaders?.length) {
        bru += `auth:oauth2:additional_params:refresh_token_req:headers {
${indentString(
  refreshHeaders
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const refreshQueryParams = refreshParams?.filter(p => p?.sendIn == 'queryparams');
      if (refreshQueryParams?.length) {
        bru += `auth:oauth2:additional_params:refresh_token_req:queryparams {
${indentString(
  refreshQueryParams
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
      const refreshBodyValues = refreshParams?.filter(p => p?.sendIn == 'body');
      if (refreshBodyValues?.length) {
        bru += `auth:oauth2:additional_params:refresh_token_req:body {
${indentString(
  refreshBodyValues
    .filter(item => item?.name?.length)
    .map((item) => `${item.enabled ? '' : '~'}${item.name}: ${item.value}`)
    .join('\n')
  )}
}

`;
      }
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

  if (body && body.formUrlEncoded && body.formUrlEncoded.length) {
    bru += `body:form-urlencoded {\n`;

    if (enabled(body.formUrlEncoded).length) {
      const enabledValues = enabled(body.formUrlEncoded)
        .map((item) => `${quoteKey(item.name)}: ${getValueString(item.value)}`)
        .join('\n');
      bru += `${indentString(enabledValues)}\n`;
    }

    if (disabled(body.formUrlEncoded).length) {
      const disabledValues = disabled(body.formUrlEncoded)
        .map((item) => `~${quoteKey(item.name)}: ${getValueString(item.value)}`)
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
              return `${enabled}${quoteKey(item.name)}: ${getValueString(item.value)}${contentType}`;
            }

            if (item.type === 'file') {
              const filepaths = Array.isArray(item.value) ? item.value : [];
              const filestr = filepaths.join('|');

              const value = `@file(${filestr})`;
              return `${enabled}${quoteKey(item.name)}: ${value}${contentType}`;
            }
          })
          .join('\n')
      )}`;
    }

    bru += '\n}\n\n';
  }


  if (body && body.file && body.file.length) {
    bru += `body:file {`;
    const files = enabled(body.file, "selected").concat(disabled(body.file, "selected"));

    if (files.length) {
      bru += `\n${indentString(
        files
          .map((item) => {
            const selected = item.selected ? '' : '~';
            const contentType =
              item.contentType && item.contentType !== '' ? ' @contentType(' + item.contentType + ')' : '';
            const filePath = item.filePath || '';
            const value = `@file(${filePath})`;
            const itemName = "file";
            return `${selected}${itemName}: ${value}${contentType}`;
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

  if (body && body.grpc) {
    // Convert each gRPC message to a separate body:grpc block
    if (Array.isArray(body.grpc)) {
      body.grpc.forEach((m) => {
        const {name, content} = m;
        
        bru += `body:grpc {\n`;
        
        bru += `${indentString(`name: ${getValueString(name)}`)}\n`;
        
        // Convert content to JSON string if it's an object
        let jsonValue = typeof content === 'object' ? JSON.stringify(content, null, 2) : content || '{}';
        
        // Wrap content with triple quotes for multiline support, without extra indentation
        bru += `${indentString(`content: '''\n${indentString(jsonValue)}\n'''`)}\n`;
        bru += '}\n\n';
      });
    }
  }

  if (body && body.ws) {
    // Convert each ws message to a separate body:ws block
    if (Array.isArray(body.ws)) {
      body.ws.forEach((message) => {
        const { name, content, type = '' } = message;

        bru += `body:ws {\n`;

        bru += `${indentString(`name: ${getValueString(name)}`)}\n`;
        if (type.length) {
          bru += `${indentString(`type: ${getValueString(type)}`)}\n`;
        }

        // Convert content to JSON string if it's an object
        let contentValue = typeof content === 'object' ? JSON.stringify(content, null, 2) : content || '{}';

        // Wrap content with triple quotes for multiline support, without extra indentation
        bru += `${indentString(`content: '''\n${indentString(contentValue)}\n'''`)}\n`;
        bru += '}\n\n';
      });
    }
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

  if (settings && Object.keys(settings).length) {
    bru += 'settings {\n';
    for (const key in settings) {
      bru += `  ${key}: ${settings[key]}\n`;
    }
    bru += '}\n\n';
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

// alternative to writing the below code to avoid undefined
