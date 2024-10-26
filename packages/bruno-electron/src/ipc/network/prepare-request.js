const os = require('os');
const { get, each, filter, compact, forOwn } = require('lodash');
const decomment = require('decomment');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const { getTreePathFromCollectionToItem } = require('../../utils/collection');
const { buildFormUrlEncodedPayload } = require('../../utils/common');

const mergeFolderLevelHeaders = (request, requestTreePath) => {
  let folderHeaders = new Map();

  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let headers = get(i, 'root.request.headers', []);
      headers.forEach((header) => {
        if (header.enabled) {
          folderHeaders.set(header.name, header.value);
        }
      });
    } else if (i.uid === request.uid) {
      const headers = i?.draft ? get(i, 'draft.request.headers', []) : get(i, 'request.headers', []);
      headers.forEach((header) => {
        if (header.enabled) {
          folderHeaders.set(header.name, header.value);
        }
      });
    }
  }

  let mergedFolderHeaders = Array.from(folderHeaders, ([name, value]) => ({ name, value, enabled: true }));
  let requestHeaders = request.headers || [];
  let requestHeadersMap = new Map();

  for (let header of requestHeaders) {
    if (header.enabled) {
      requestHeadersMap.set(header.name, header.value);
    }
  }

  mergedFolderHeaders.forEach((header) => {
    requestHeadersMap.set(header.name, header.value);
  });

  request.headers = Array.from(requestHeadersMap, ([name, value]) => ({ name, value, enabled: true }));
};

const mergeVars = (collection, request, requestTreePath) => {
  let reqVars = new Map();
  let collectionRequestVars = get(collection, 'root.request.vars.req', []);
  let collectionVariables = {};
  collectionRequestVars.forEach((_var) => {
    if (_var.enabled) {
      reqVars.set(_var.name, _var.value);
      collectionVariables[_var.name] = _var.value;
    }
  });
  let folderVariables = {};
  let requestVariables = {};
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let vars = get(i, 'root.request.vars.req', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          reqVars.set(_var.name, _var.value);
          folderVariables[_var.name] = _var.value;
        }
      });
    } else {
      const vars = i?.draft ? get(i, 'draft.request.vars.req', []) : get(i, 'request.vars.req', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          reqVars.set(_var.name, _var.value);
          requestVariables[_var.name] = _var.value;
        }
      });
    }
  }

  request.collectionVariables = collectionVariables;
  request.folderVariables = folderVariables;
  request.requestVariables = requestVariables;

  request.vars.req = Array.from(reqVars, ([name, value]) => ({
    name,
    value,
    enabled: true,
    type: 'request'
  }));

  let resVars = new Map();
  let collectionResponseVars = get(collection, 'root.request.vars.res', []);
  collectionResponseVars.forEach((_var) => {
    if (_var.enabled) {
      resVars.set(_var.name, _var.value);
    }
  });
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let vars = get(i, 'root.request.vars.res', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          resVars.set(_var.name, _var.value);
        }
      });
    } else {
      const vars = i?.draft ? get(i, 'draft.request.vars.res', []) : get(i, 'request.vars.res', []);
      vars.forEach((_var) => {
        if (_var.enabled) {
          resVars.set(_var.name, _var.value);
        }
      });
    }
  }

  request.vars.res = Array.from(resVars, ([name, value]) => ({
    name,
    value,
    enabled: true,
    type: 'response'
  }));
};

const mergeFolderLevelScripts = (request, requestTreePath, scriptFlow) => {
  let folderCombinedPreReqScript = [];
  let folderCombinedPostResScript = [];
  let folderCombinedTests = [];
  for (let i of requestTreePath) {
    if (i.type === 'folder') {
      let preReqScript = get(i, 'root.request.script.req', '');
      if (preReqScript && preReqScript.trim() !== '') {
        folderCombinedPreReqScript.push(preReqScript);
      }

      let postResScript = get(i, 'root.request.script.res', '');
      if (postResScript && postResScript.trim() !== '') {
        folderCombinedPostResScript.push(postResScript);
      }

      let tests = get(i, 'root.request.tests', '');
      if (tests && tests?.trim?.() !== '') {
        folderCombinedTests.push(tests);
      }
    }
  }

  if (folderCombinedPreReqScript.length) {
    request.script.req = compact([...folderCombinedPreReqScript, request?.script?.req || '']).join(os.EOL);
  }

  if (folderCombinedPostResScript.length) {
    if (scriptFlow === 'sequential') {
      request.script.res = compact([...folderCombinedPostResScript, request?.script?.res || '']).join(os.EOL);
    } else {
      request.script.res = compact([request?.script?.res || '', ...folderCombinedPostResScript.reverse()]).join(os.EOL);
    }
  }

  if (folderCombinedTests.length) {
    if (scriptFlow === 'sequential') {
      request.tests = compact([...folderCombinedTests, request?.tests || '']).join(os.EOL);
    } else {
      request.tests = compact([request?.tests || '', ...folderCombinedTests.reverse()]).join(os.EOL);
    }
  }
};

const createFormData = (datas, collectionPath) => {
  // make axios work in node using form data
  // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
  const form = new FormData();
  forOwn(datas, (value, key) => {
    if (typeof value == 'string') {
      form.append(key, value);
      return;
    }

    const filePaths = value || [];
    filePaths?.forEach?.((filePath) => {
      let trimmedFilePath = filePath.trim();

      if (!path.isAbsolute(trimmedFilePath)) {
        trimmedFilePath = path.join(collectionPath, trimmedFilePath);
      }

      form.append(key, fs.createReadStream(trimmedFilePath), path.basename(trimmedFilePath));
    });
  });
  return form;
};

const setAuthHeaders = (axiosRequest, request, collectionRoot) => {
  const collectionAuth = get(collectionRoot, 'request.auth');
  if (collectionAuth && request.auth.mode === 'inherit') {
    switch (collectionAuth.mode) {
      case 'awsv4':
        axiosRequest.awsv4config = {
          accessKeyId: get(collectionAuth, 'awsv4.accessKeyId'),
          secretAccessKey: get(collectionAuth, 'awsv4.secretAccessKey'),
          sessionToken: get(collectionAuth, 'awsv4.sessionToken'),
          service: get(collectionAuth, 'awsv4.service'),
          region: get(collectionAuth, 'awsv4.region'),
          profileName: get(collectionAuth, 'awsv4.profileName')
        };
        break;
      case 'basic':
        axiosRequest.auth = {
          username: get(collectionAuth, 'basic.username'),
          password: get(collectionAuth, 'basic.password')
        };
        break;
      case 'bearer':
        axiosRequest.headers['Authorization'] = `Bearer ${get(collectionAuth, 'bearer.token')}`;
        break;
      case 'digest':
        axiosRequest.digestConfig = {
          username: get(collectionAuth, 'digest.username'),
          password: get(collectionAuth, 'digest.password')
        };
        break;
      case 'wsse':
        const username = get(request, 'auth.wsse.username', '');
        const password = get(request, 'auth.wsse.password', '');

        const ts = new Date().toISOString();
        const nonce = crypto.randomBytes(16).toString('hex');

        // Create the password digest using SHA-1 as required for WSSE
        const hash = crypto.createHash('sha1');
        hash.update(nonce + ts + password);
        const digest = Buffer.from(hash.digest('hex').toString('utf8')).toString('base64');

        // Construct the WSSE header
        axiosRequest.headers[
          'X-WSSE'
        ] = `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonce}", Created="${ts}"`;
        break;
      case 'apikey':
        const apiKeyAuth = get(collectionAuth, 'apikey');
        if (apiKeyAuth.placement === 'header') {
          axiosRequest.headers[apiKeyAuth.key] = apiKeyAuth.value;
        } else if (apiKeyAuth.placement === 'queryparams') {
          // If the API key authentication is set and its placement is 'queryparams', add it to the axios request object. This will be used in the configureRequest function to append the API key to the query parameters of the request URL.
          axiosRequest.apiKeyAuthValueForQueryParams = apiKeyAuth;
        }
        break;
    }
  }

  if (request.auth) {
    switch (request.auth.mode) {
      case 'awsv4':
        axiosRequest.awsv4config = {
          accessKeyId: get(request, 'auth.awsv4.accessKeyId'),
          secretAccessKey: get(request, 'auth.awsv4.secretAccessKey'),
          sessionToken: get(request, 'auth.awsv4.sessionToken'),
          service: get(request, 'auth.awsv4.service'),
          region: get(request, 'auth.awsv4.region'),
          profileName: get(request, 'auth.awsv4.profileName')
        };
        break;
      case 'basic':
        axiosRequest.auth = {
          username: get(request, 'auth.basic.username'),
          password: get(request, 'auth.basic.password')
        };
        break;
      case 'bearer':
        axiosRequest.headers['Authorization'] = `Bearer ${get(request, 'auth.bearer.token')}`;
        break;
      case 'digest':
        axiosRequest.digestConfig = {
          username: get(request, 'auth.digest.username'),
          password: get(request, 'auth.digest.password')
        };
        break;
      case 'oauth2':
        const grantType = get(request, 'auth.oauth2.grantType');
        switch (grantType) {
          case 'password':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              username: get(request, 'auth.oauth2.username'),
              password: get(request, 'auth.oauth2.password'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope')
            };
            break;
          case 'authorization_code':
            axiosRequest.oauth2 = {
              grantType: grantType,
              callbackUrl: get(request, 'auth.oauth2.callbackUrl'),
              authorizationUrl: get(request, 'auth.oauth2.authorizationUrl'),
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope'),
              state: get(request, 'auth.oauth2.state'),
              pkce: get(request, 'auth.oauth2.pkce')
            };
            break;
          case 'client_credentials':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope')
            };
            break;
        }
        break;
      case 'wsse':
        const username = get(request, 'auth.wsse.username', '');
        const password = get(request, 'auth.wsse.password', '');

        const ts = new Date().toISOString();
        const nonce = crypto.randomBytes(16).toString('hex');

        // Create the password digest using SHA-1 as required for WSSE
        const hash = crypto.createHash('sha1');
        hash.update(nonce + ts + password);
        const digest = Buffer.from(hash.digest('hex').toString('utf8')).toString('base64');

        // Construct the WSSE header
        axiosRequest.headers[
          'X-WSSE'
        ] = `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonce}", Created="${ts}"`;
        break;
      case 'apikey':
        const apiKeyAuth = get(request, 'auth.apikey');
        if (apiKeyAuth.placement === 'header') {
          axiosRequest.headers[apiKeyAuth.key] = apiKeyAuth.value;
        } else if (apiKeyAuth.placement === 'queryparams') {
          // If the API key authentication is set and its placement is 'queryparams', add it to the axios request object. This will be used in the configureRequest function to append the API key to the query parameters of the request URL.
          axiosRequest.apiKeyAuthValueForQueryParams = apiKeyAuth;
        }
        break;
    }
  }

  return axiosRequest;
};

const prepareRequest = (item, collection) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = get(collection, 'root', {});
  const collectionPath = collection.pathname;
  const headers = {};
  let contentTypeDefined = false;
  let url = request.url;

  // Collection level headers
  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name.length > 0) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  // scriptFlow is either "sandwich" or "sequential"
  const scriptFlow = collection.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeFolderLevelHeaders(request, requestTreePath);
    mergeFolderLevelScripts(request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
  }

  // Request level headers
  each(request.headers, (h) => {
    if (h.enabled && h.name.length > 0) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  let axiosRequest = {
    mode: request.body.mode,
    method: request.method,
    url,
    headers,
    pathParams: request?.params?.filter((param) => param.type === 'path'),
    responseType: 'arraybuffer'
  };

  axiosRequest = setAuthHeaders(axiosRequest, request, collectionRoot);

  if (request.body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    try {
      axiosRequest.data = decomment(request?.body?.json);
    } catch (error) {
      axiosRequest.data = request?.body?.json;
    }
  }

  if (request.body.mode === 'text') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'text/plain';
    }
    axiosRequest.data = request.body.text;
  }

  if (request.body.mode === 'xml') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'text/xml';
    }
    axiosRequest.data = request.body.xml;
  }

  if (request.body.mode === 'sparql') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/sparql-query';
    }
    axiosRequest.data = request.body.sparql;
  }

  if (request.body.mode === 'formUrlEncoded') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
    axiosRequest.data = buildFormUrlEncodedPayload(enabledParams);
  }

  if (request.body.mode === 'multipartForm') {
    axiosRequest.headers['content-type'] = 'multipart/form-data';
    const params = {};
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    each(enabledParams, (p) => (params[p.name] = p.value));
    axiosRequest.data = params;
  }

  if(request.body.mode === 'rawFile') {
    if (request.body.rawFile) {
      axiosRequest.data = fs.readFileSync(request.body.rawFile);
      fileLength = axiosRequest.data.length;
      axiosRequest.headers['content-length'] = fileLength;
    } else {
      axiosRequest.data = null;
    }
  }

  if (request.body.mode === 'graphql') {
    const graphqlQuery = {
      query: get(request, 'body.graphql.query'),
      // https://github.com/usebruno/bruno/issues/884 - we must only parse the variables after the variable interpolation
      variables: decomment(get(request, 'body.graphql.variables') || '{}')
    };
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    axiosRequest.data = graphqlQuery;
  }

  if (request.script) {
    axiosRequest.script = request.script;
  }

  axiosRequest.vars = request.vars;
  axiosRequest.collectionVariables = request.collectionVariables;
  axiosRequest.folderVariables = request.folderVariables;
  axiosRequest.requestVariables = request.requestVariables;
  axiosRequest.globalEnvironmentVariables = request.globalEnvironmentVariables;
  axiosRequest.assertions = request.assertions;

  return axiosRequest;
};

module.exports = prepareRequest;
module.exports.setAuthHeaders = setAuthHeaders;
module.exports.createFormData = createFormData;
