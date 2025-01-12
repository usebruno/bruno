const https = require('https');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const { isUndefined, isNull, each, get, cloneDeep, filter } = require('lodash');
const decomment = require('decomment');
const crypto = require('node:crypto');
const { getIntrospectionQuery } = require('graphql');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const iconv = require('iconv-lite');
const { interpolate } = require('@usebruno/common');
const { getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, getFormattedCollectionOauth2Credentials } = require('./collection');
const { buildFormUrlEncodedPayload } = require('./form-data');
const { shouldUseProxy, PatchedHttpsProxyAgent } = require('./proxy-util');
const { makeAxiosInstance } = require('./axios-instance');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials } = require('./oauth2');
const { resolveAwsV4Credentials, addAwsV4Interceptor, addDigestInterceptor } = require('./auth');
const { getCookieStringForUrl } = require('./cookies');
const { preferencesUtil } = require('../store/preferences');
const { getBrunoConfig } = require('../store/bruno-config');
const { interpolateString } = require('../ipc/network/interpolate-string');
const interpolateVars = require('../ipc/network/interpolate-vars');

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
      case 'oauth2':
        const grantType = get(collectionAuth, 'oauth2.grantType');
        switch (grantType) {
          case 'password':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
              username: get(collectionAuth, 'oauth2.username'),
              password: get(collectionAuth, 'oauth2.password'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
              scope: get(collectionAuth, 'oauth2.scope'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenPrefix: get(collectionAuth, 'oauth2.tokenPrefix'),
              tokenQueryParamKey: get(collectionAuth, 'oauth2.tokenQueryParamKey'),
              reuseToken: get(collectionAuth, 'oauth2.reuseToken')
            };
            break;
          case 'authorization_code':
            axiosRequest.oauth2 = {
              grantType: grantType,
              callbackUrl: get(collectionAuth, 'oauth2.callbackUrl'),
              authorizationUrl: get(collectionAuth, 'oauth2.authorizationUrl'),
              accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
              scope: get(collectionAuth, 'oauth2.scope'),
              state: get(collectionAuth, 'oauth2.state'),
              pkce: get(collectionAuth, 'oauth2.pkce'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenPrefix: get(collectionAuth, 'oauth2.tokenPrefix'),
              tokenQueryParamKey: get(collectionAuth, 'oauth2.tokenQueryParamKey'),
              reuseToken: get(collectionAuth, 'oauth2.reuseToken')
            };
            break;
          case 'client_credentials':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
              clientId: get(collectionAuth, 'oauth2.clientId'),
              clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
              scope: get(collectionAuth, 'oauth2.scope'),
              credentialsId: get(collectionAuth, 'oauth2.credentialsId'),
              tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
              tokenPrefix: get(collectionAuth, 'oauth2.tokenPrefix'),
              tokenQueryParamKey: get(collectionAuth, 'oauth2.tokenQueryParamKey'),
              reuseToken: get(collectionAuth, 'oauth2.reuseToken')
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
              scope: get(request, 'auth.oauth2.scope'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenPrefix: get(request, 'auth.oauth2.tokenPrefix'),
              tokenQueryParamKey: get(request, 'auth.oauth2.tokenQueryParamKey'),
              reuseToken: get(request, 'auth.oauth2.reuseToken')
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
              pkce: get(request, 'auth.oauth2.pkce'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenPrefix: get(request, 'auth.oauth2.tokenPrefix'),
              tokenQueryParamKey: get(request, 'auth.oauth2.tokenQueryParamKey'),
              reuseToken: get(request, 'auth.oauth2.reuseToken')
            };
            break;
          case 'client_credentials':
            axiosRequest.oauth2 = {
              grantType: grantType,
              accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
              clientId: get(request, 'auth.oauth2.clientId'),
              clientSecret: get(request, 'auth.oauth2.clientSecret'),
              scope: get(request, 'auth.oauth2.scope'),
              credentialsId: get(request, 'auth.oauth2.credentialsId'),
              tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
              tokenPrefix: get(request, 'auth.oauth2.tokenPrefix'),
              tokenQueryParamKey: get(request, 'auth.oauth2.tokenQueryParamKey'),
              reuseToken: get(request, 'auth.oauth2.reuseToken')
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
  const collectionRoot = collection?.draft ? get(collection, 'draft', {}) : get(collection, 'root', {});
  const collectionPath = collection.pathname;
  const headers = {};
  let contentTypeDefined = false;
  let url = request.url;
  
  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      contentTypeDefined = true;
      return false;
    }
  });
  
  const scriptFlow = collection.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
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

  return axiosRequest;
};

const prepareGqlIntrospectionRequest = (endpoint, envVars, request, collectionRoot) => {
  if (endpoint && endpoint.length) {
    endpoint = interpolate(endpoint, envVars);
  }

  const queryParams = {
    query: getIntrospectionQuery()
  };

  let axiosRequest = {
    method: 'POST',
    url: endpoint,
    headers: {
      ...mapHeaders(request.headers, get(collectionRoot, 'request.headers', [])),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(queryParams)
  };

  return setAuthHeaders(axiosRequest, request, collectionRoot);
};

const mapHeaders = (requestHeaders, collectionHeaders) => {
  const headers = {};

  each(requestHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  // collection headers
  each(collectionHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  return headers;
};

const configureRequest = async (
  collectionUid,
  request,
  envVars,
  runtimeVariables,
  processEnvVars,
  collectionPath
) => {
  const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
  if (!protocolRegex.test(request.url)) {
    request.url = `http://${request.url}`;
  }

  /**
   * @see https://github.com/usebruno/bruno/issues/211 set keepAlive to true, this should fix socket hang up errors
   * @see https://github.com/nodejs/node/pull/43522 keepAlive was changed to true globally on Node v19+
   */
  const httpsAgentRequestFields = { keepAlive: true };
  if (!preferencesUtil.shouldVerifyTls()) {
    httpsAgentRequestFields['rejectUnauthorized'] = false;
  }

  if (preferencesUtil.shouldUseCustomCaCertificate()) {
    const caCertFilePath = preferencesUtil.getCustomCaCertificateFilePath();
    if (caCertFilePath) {
      let caCertBuffer = fs.readFileSync(caCertFilePath);
      if (preferencesUtil.shouldKeepDefaultCaCertificates()) {
        caCertBuffer += '\n' + tls.rootCertificates.join('\n'); // Augment default truststore with custom CA certificates
      }
      httpsAgentRequestFields['ca'] = caCertBuffer;
    }
  }

  const brunoConfig = getBrunoConfig(collectionUid);
  const interpolationOptions = {
    envVars,
    runtimeVariables,
    processEnvVars
  };

  // client certificate config
  const clientCertConfig = get(brunoConfig, 'clientCertificates.certs', []);

  for (let clientCert of clientCertConfig) {
    const domain = interpolateString(clientCert?.domain, interpolationOptions);
    const type = clientCert?.type || 'cert';
    if (domain) {
      const hostRegex = '^https:\\/\\/' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
      if (request.url.match(hostRegex)) {
        if (type === 'cert') {
          try {
            let certFilePath = interpolateString(clientCert?.certFilePath, interpolationOptions);
            certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collectionPath, certFilePath);
            let keyFilePath = interpolateString(clientCert?.keyFilePath, interpolationOptions);
            keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collectionPath, keyFilePath);

            httpsAgentRequestFields['cert'] = fs.readFileSync(certFilePath);
            httpsAgentRequestFields['key'] = fs.readFileSync(keyFilePath);
          } catch (err) {
            console.error('Error reading cert/key file', err);
            throw new Error('Error reading cert/key file' + err);
          }
        } else if (type === 'pfx') {
          try {
            let pfxFilePath = interpolateString(clientCert?.pfxFilePath, interpolationOptions);
            pfxFilePath = path.isAbsolute(pfxFilePath) ? pfxFilePath : path.join(collectionPath, pfxFilePath);
            httpsAgentRequestFields['pfx'] = fs.readFileSync(pfxFilePath);
          } catch (err) {
            console.error('Error reading pfx file', err);
            throw new Error('Error reading pfx file' + err);
          }
        }
        httpsAgentRequestFields['passphrase'] = interpolateString(clientCert.passphrase, interpolationOptions);
        break;
      }
    }
  }

  /**
   * Proxy configuration
   * 
   * Preferences proxyMode has three possible values: on, off, system
   * Collection proxyMode has three possible values: true, false, global
   * 
   * When collection proxyMode is true, it overrides the app-level proxy settings
   * When collection proxyMode is false, it ignores the app-level proxy settings
   * When collection proxyMode is global, it uses the app-level proxy settings
   * 
   * Below logic calculates the proxyMode and proxyConfig to be used for the request
   */
  let proxyMode = 'off';
  let proxyConfig = {};

  const collectionProxyConfig = get(brunoConfig, 'proxy', {});
  const collectionProxyEnabled = get(collectionProxyConfig, 'enabled', 'global');
  if (collectionProxyEnabled === true) {
    proxyConfig = collectionProxyConfig;
    proxyMode = 'on';
  } else if (collectionProxyEnabled === 'global') {
    proxyConfig = preferencesUtil.getGlobalProxyConfig();
    proxyMode = get(proxyConfig, 'mode', 'off');
  }

  if (proxyMode === 'on') {
    const shouldProxy = shouldUseProxy(request.url, get(proxyConfig, 'bypassProxy', ''));
    if (shouldProxy) {
      const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
      const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
      const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
      const proxyAuthEnabled = get(proxyConfig, 'auth.enabled', false);
      const socksEnabled = proxyProtocol.includes('socks');
      let uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
      let proxyUri;
      if (proxyAuthEnabled) {
        const proxyAuthUsername = interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions);
        const proxyAuthPassword = interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions);

        proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}${uriPort}`;
      } else {
        proxyUri = `${proxyProtocol}://${proxyHostname}${uriPort}`;
      }
      if (socksEnabled) {
        request.httpsAgent = new SocksProxyAgent(
          proxyUri,
          Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
        );
        request.httpAgent = new SocksProxyAgent(proxyUri);
      } else {
        request.httpsAgent = new PatchedHttpsProxyAgent(
          proxyUri,
          Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
        );
        request.httpAgent = new HttpProxyAgent(proxyUri);
      }
    } else {
      request.httpsAgent = new https.Agent({
        ...httpsAgentRequestFields
      });
    }
  } else if (proxyMode === 'system') {
    const { http_proxy, https_proxy, no_proxy } = preferencesUtil.getSystemProxyEnvVariables();
    const shouldUseSystemProxy = shouldUseProxy(request.url, no_proxy || '');
    if (shouldUseSystemProxy) {
      try {
        if (http_proxy?.length) {
          new URL(http_proxy);
          request.httpAgent = new HttpProxyAgent(http_proxy);
        }
      } catch (error) {
        throw new Error('Invalid system http_proxy');
      }
      try {
        if (https_proxy?.length) {
          new URL(https_proxy);
          request.httpsAgent = new PatchedHttpsProxyAgent(
            https_proxy,
            Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
          );
        }
      } catch (error) {
        throw new Error('Invalid system https_proxy');
      }
    } else {
      request.httpsAgent = new https.Agent({
        ...httpsAgentRequestFields
      });
    }
  } else if (Object.keys(httpsAgentRequestFields).length > 0) {
    request.httpsAgent = new https.Agent({
      ...httpsAgentRequestFields
    });
  }
  const axiosInstance = makeAxiosInstance();

  if (request.oauth2) {
    let requestCopy = cloneDeep(request);
    const { oauth2: { grantType, tokenPlacement, tokenPrefix, tokenQueryParamKey } = {} } = requestCopy || {};
    let credentials, credentialsId;
    switch (grantType) {
      case 'authorization_code':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId } = await getOAuth2TokenUsingAuthorizationCode(requestCopy, collectionUid));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId };
        if (tokenPlacement == 'header') {
          request.headers['Authorization'] = `${tokenPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryParamKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'client_credentials':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId } = await getOAuth2TokenUsingClientCredentials(requestCopy, collectionUid));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId };
        if (tokenPlacement == 'header') {
          request.headers['Authorization'] = `${tokenPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryParamKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'password':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId } = await getOAuth2TokenUsingPasswordCredentials(requestCopy, collectionUid));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId };
        if (tokenPlacement == 'header') {
          request.headers['Authorization'] = `${tokenPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryParamKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
    }
  }

  if (request.awsv4config) {
    request.awsv4config = await resolveAwsV4Credentials(request);
    addAwsV4Interceptor(axiosInstance, request);
    delete request.awsv4config;
  }

  if (request.digestConfig) {
    addDigestInterceptor(axiosInstance, request);
  }

  request.timeout = preferencesUtil.getRequestTimeout();

  // add cookies to request
  if (preferencesUtil.shouldSendCookies()) {
    const cookieString = getCookieStringForUrl(request.url);
    if (cookieString && typeof cookieString === 'string' && cookieString.length) {
      request.headers['cookie'] = cookieString;
    }
  }

  // Add API key to the URL
  if (request.apiKeyAuthValueForQueryParams && request.apiKeyAuthValueForQueryParams.placement === 'queryparams') {
    const urlObj = new URL(request.url);

    // Interpolate key and value as they can be variables before adding to the URL.
    const key = interpolateString(request.apiKeyAuthValueForQueryParams.key, interpolationOptions);
    const value = interpolateString(request.apiKeyAuthValueForQueryParams.value, interpolationOptions);

    urlObj.searchParams.set(key, value);
    request.url = urlObj.toString();
  }

  // Remove pathParams, already in URL (Issue #2439)
  delete request.pathParams;

  // Remove apiKeyAuthValueForQueryParams, already interpolated and added to URL
  delete request.apiKeyAuthValueForQueryParams;

  return axiosInstance;
};

const getJsSandboxRuntime = (collection) => {
  const securityConfig = get(collection, 'securityConfig', {});
  return securityConfig.jsSandboxMode === 'safe' ? 'quickjs' : 'vm2';
};


const parseDataFromResponse = (response, disableParsingResponseJson = false) => {
  // Parse the charset from content type: https://stackoverflow.com/a/33192813
  const charsetMatch = /charset=([^()<>@,;:"/[\]?.=\s]*)/i.exec(response.headers['content-type'] || '');
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#using_exec_with_regexp_literals
  const charsetValue = charsetMatch?.[1];
  const dataBuffer = Buffer.from(response.data);
  // Overwrite the original data for backwards compatibility
  let data;
  if (iconv.encodingExists(charsetValue)) {
    data = iconv.decode(dataBuffer, charsetValue);
  } else {
    data = iconv.decode(dataBuffer, 'utf-8');
  }
  // Try to parse response to JSON, this can quietly fail
  try {
    // Filter out ZWNBSP character
    // https://gist.github.com/antic183/619f42b559b78028d1fe9e7ae8a1352d
    data = data.replace(/^\uFEFF/, '');

    // If the response is a string and starts and ends with double quotes, it's a stringified JSON and should not be parsed
    if ( !disableParsingResponseJson && ! (typeof data === 'string' && data.startsWith("\"") && data.endsWith("\""))) {
      data = Buffer?.isBuffer(data)? JSON.parse(data?.toString()) : JSON.parse(data);
    }
  } catch(error) {
    console.error(error);
    console.log('Failed to parse response data as JSON');
   }

  return { data, dataBuffer };
};


module.exports = {
  prepareRequest,
  prepareGqlIntrospectionRequest,
  setAuthHeaders,
  getJsSandboxRuntime,
  configureRequest,
  parseDataFromResponse
}
