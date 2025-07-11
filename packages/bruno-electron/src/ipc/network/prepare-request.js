const { get, each, filter, find } = require('lodash');
const decomment = require('decomment');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const { getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, getFormattedCollectionOauth2Credentials, mergeAuth } = require('../../utils/collection');
const { buildFormUrlEncodedPayload } = require('../../utils/form-data');
const path = require('node:path');

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
        axiosRequest.basicAuth = {
          username: get(collectionAuth, 'basic.username'),
          password: get(collectionAuth, 'basic.password')
        };
        break;
      case 'bearer':
        axiosRequest.headers['Authorization'] = `Bearer ${get(collectionAuth, 'bearer.token', '')}`;
        break;
      case 'digest':
        axiosRequest.digestConfig = {
          username: get(collectionAuth, 'digest.username'),
          password: get(collectionAuth, 'digest.password')
        };
        break;
      case 'ntlm':
        axiosRequest.ntlmConfig = {
          username: get(collectionAuth, 'ntlm.username'),
          password: get(collectionAuth, 'ntlm.password'),
          domain: get(collectionAuth, 'ntlm.domain')
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
      case 'oauth2':
        const grantType = get(collectionAuth, 'oauth2.grantType');
        switch (grantType) {
          case 'password':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
              refreshTokenUrl: get(collectionAuth, 'oauth2.refreshTokenUrl'),
              username: get(collectionAuth, 'oauth2.username'),
              password: get(collectionAuth, 'oauth2.password'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
              scope: get(collectionAuth, 'oauth2.scope'),
              credentialsPlacement: get(collectionAuth, 'oauth2.credentialsPlacement'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(collectionAuth, 'oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(collectionAuth, 'oauth2.tokenQueryKey'),
              autoFetchToken: get(collectionAuth, 'oauth2.autoFetchToken'),
              autoRefreshToken: get(collectionAuth, 'oauth2.autoRefreshToken')
            };
            break;
          case 'authorization_code':
            axiosRequest.oauth2 = {
              grantType: grantType,
              callbackUrl: get(collectionAuth, 'oauth2.callbackUrl'),
              authorizationUrl: get(collectionAuth, 'oauth2.authorizationUrl'),
              accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
              refreshTokenUrl: get(collectionAuth, 'oauth2.refreshTokenUrl'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
              scope: get(collectionAuth, 'oauth2.scope'),
              state: get(collectionAuth, 'oauth2.state'),
              pkce: get(collectionAuth, 'oauth2.pkce'),
              credentialsPlacement: get(collectionAuth, 'oauth2.credentialsPlacement'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(collectionAuth, 'oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(collectionAuth, 'oauth2.tokenQueryKey'),
              autoFetchToken: get(collectionAuth, 'oauth2.autoFetchToken'),
              autoRefreshToken: get(collectionAuth, 'oauth2.autoRefreshToken')
            };
            break;
          case 'implicit':
            axiosRequest.oauth2 = {
              grantType: grantType,
              callbackUrl: get(collectionAuth, 'oauth2.callbackUrl'),
              authorizationUrl: get(collectionAuth, 'oauth2.authorizationUrl'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              scope: get(collectionAuth, 'oauth2.scope'),
              state: get(collectionAuth, 'oauth2.state'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(collectionAuth, 'oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(collectionAuth, 'oauth2.tokenQueryKey'),
              autoFetchToken: get(collectionAuth, 'oauth2.autoFetchToken')
            };
            break;
          case 'client_credentials':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
              refreshTokenUrl: get(collectionAuth, 'oauth2.refreshTokenUrl'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
              scope: get(collectionAuth, 'oauth2.scope'),
              credentialsPlacement: get(collectionAuth, 'oauth2.credentialsPlacement'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(collectionAuth, 'oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(collectionAuth, 'oauth2.tokenQueryKey'),
              autoFetchToken: get(collectionAuth, 'oauth2.autoFetchToken'),
              autoRefreshToken: get(collectionAuth, 'oauth2.autoRefreshToken')
            };
            break;
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
        axiosRequest.basicAuth = {
          username: get(request, 'auth.basic.username'),
          password: get(request, 'auth.basic.password')
        };
        break;
      case 'bearer':
        axiosRequest.headers['Authorization'] = `Bearer ${get(request, 'auth.bearer.token', '')}`;
        break;
      case 'digest':
        axiosRequest.digestConfig = {
          username: get(request, 'auth.digest.username'),
          password: get(request, 'auth.digest.password')
        };
        break;
      case 'ntlm':
        axiosRequest.ntlmConfig = {
          username: get(request, 'auth.ntlm.username'),
          password: get(request, 'auth.ntlm.password'),
          domain: get(request, 'auth.ntlm.domain')
        };
      case 'oauth2':
        const grantType = get(request, 'auth.oauth2.grantType');
        switch (grantType) {
          case 'password':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              refreshTokenUrl: get(collectionAuth, 'oauth2.refreshTokenUrl'),
              username: get(request, 'auth.oauth2.username'),
              password: get(request, 'auth.oauth2.password'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope'),
              credentialsPlacement: get(request, 'auth.oauth2.credentialsPlacement'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(request, 'auth.oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(request, 'auth.oauth2.tokenQueryKey'),
              autoFetchToken: get(request, 'auth.oauth2.autoFetchToken'),
              autoRefreshToken: get(request, 'auth.oauth2.autoRefreshToken')
            };
            break;
          case 'authorization_code':
            axiosRequest.oauth2 = {
              grantType: grantType,
              callbackUrl: get(request, 'auth.oauth2.callbackUrl'),
              authorizationUrl: get(request, 'auth.oauth2.authorizationUrl'),
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              refreshTokenUrl: get(collectionAuth, 'oauth2.refreshTokenUrl'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope'),
              state: get(request, 'auth.oauth2.state'),
              pkce: get(request, 'auth.oauth2.pkce'),
              credentialsPlacement: get(request, 'auth.oauth2.credentialsPlacement'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(request, 'auth.oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(request, 'auth.oauth2.tokenQueryKey'),
              autoFetchToken: get(request, 'auth.oauth2.autoFetchToken'),
              autoRefreshToken: get(request, 'auth.oauth2.autoRefreshToken')
            };
            break;
          case 'implicit':
            axiosRequest.oauth2 = {
              grantType: grantType,
              callbackUrl: get(request, 'auth.oauth2.callbackUrl'),
              authorizationUrl: get(request, 'auth.oauth2.authorizationUrl'),
              clientId: get(request, 'auth.oauth2.clientId'),
              scope: get(request, 'auth.oauth2.scope'),
              state: get(request, 'auth.oauth2.state'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(request, 'auth.oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(request, 'auth.oauth2.tokenQueryKey'),
              autoFetchToken: get(request, 'auth.oauth2.autoFetchToken')
            };
            break;
          case 'client_credentials':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              refreshTokenUrl: get(collectionAuth, 'oauth2.refreshTokenUrl'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope'),
              credentialsPlacement: get(request, 'auth.oauth2.credentialsPlacement'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenHeaderPrefix: get(request, 'auth.oauth2.tokenHeaderPrefix'),
              tokenQueryKey: get(request, 'auth.oauth2.tokenQueryKey'),
              autoFetchToken: get(request, 'auth.oauth2.autoFetchToken'),
              autoRefreshToken: get(request, 'auth.oauth2.autoRefreshToken')
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

const prepareRequest = async (item, collection = {}, abortController) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft ? get(collection, 'draft', {}) : get(collection, 'root', {});
  const collectionPath = collection?.pathname;
  const headers = {};
  let contentTypeDefined = false;
  let url = request.url;
  
  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      contentTypeDefined = true;
      return false;
    }
  });
  
  const scriptFlow = collection?.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials });
  }


  each(get(request, 'headers', []), (h) => {
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
    name: item.name,
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
      axiosRequest.headers['content-type'] = 'application/xml';
    }
    axiosRequest.data = request.body.xml;
  }

  if (request.body.mode === 'sparql') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/sparql-query';
    }
    axiosRequest.data = request.body.sparql;
  }

  if (request.body.mode === 'file') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/octet-stream'; // Default headers for binary file uploads
    }
  
    const bodyFile = find(request.body.file, (param) => param.selected);
    if (bodyFile) {
      let { filePath, contentType } = bodyFile;
      
      axiosRequest.headers['content-type'] = contentType;
      if (filePath) {
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(collectionPath, filePath);
        }
  
        try {
          const fileContent = await fs.readFile(filePath);
          axiosRequest.data = fileContent;
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    }
  }

  if (request.body.mode === 'formUrlEncoded') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
    axiosRequest.data = buildFormUrlEncodedPayload(enabledParams);
  }

  if (request.body.mode === 'multipartForm') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'multipart/form-data';
    }
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    axiosRequest.data = enabledParams;
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

  // if the mode is 'none' then set the content-type header to false. #1693
  if (request.body.mode === 'none') {
    if(!contentTypeDefined) {
      axiosRequest.headers['content-type'] = false;
    }
  }

  if (request.script) {
    axiosRequest.script = request.script;
  }

  if (request.tests) {
    axiosRequest.tests = request.tests;
  }

  axiosRequest.vars = request.vars;
  axiosRequest.collectionVariables = request.collectionVariables;
  axiosRequest.folderVariables = request.folderVariables;
  axiosRequest.requestVariables = request.requestVariables;
  axiosRequest.globalEnvironmentVariables = request.globalEnvironmentVariables;
  axiosRequest.oauth2CredentialVariables = request.oauth2CredentialVariables;
  axiosRequest.assertions = request.assertions;
  axiosRequest.oauth2Credentials = request.oauth2Credentials;

  return axiosRequest;
};

module.exports = {
  prepareRequest,
  setAuthHeaders
}