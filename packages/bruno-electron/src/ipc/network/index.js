const qs = require('qs');
const https = require('https');
const axios = require('axios');
const path = require('path');
const decomment = require('decomment');
const fs = require('fs');
const tls = require('tls');
const contentDispositionParser = require('content-disposition');
const mime = require('mime-types');
const FormData = require('form-data');
const { ipcMain } = require('electron');
const { each, get, extend, cloneDeep, merge } = require('lodash');
const { NtlmClient } = require('axios-ntlm');
const { VarsRuntime, AssertRuntime, ScriptRuntime, TestRuntime } = require('@usebruno/js');
const { encodeUrl } = require('@usebruno/requests').utils;
const { interpolateString } = require('./interpolate-string');
const { resolveAwsV4Credentials, addAwsV4Interceptor } = require('./awsv4auth-helper');
const { addDigestInterceptor } = require('@usebruno/requests');
const prepareGqlIntrospectionRequest = require('./prepare-gql-introspection-request');
const { prepareRequest } = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { makeAxiosInstance } = require('./axios-instance');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid, safeStringifyJSON, safeParseJSON, parseDataFromResponse, parseDataFromRequest } = require('../../utils/common');
const { chooseFileToSave, writeBinaryFile, writeFile } = require('../../utils/filesystem');
const { addCookieToJar, getDomainsWithCookies, getCookieStringForUrl } = require('../../utils/cookies');
const { createFormData } = require('../../utils/form-data');
const { findItemInCollectionByPathname, sortFolder, getAllRequestsInFolderRecursively, getEnvVars, getTreePathFromCollectionToItem, mergeVars, sortByNameThenSequence } = require('../../utils/collection');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingImplicitGrant } = require('../../utils/oauth2');
const { preferencesUtil } = require('../../store/preferences');
const { getProcessEnvVars } = require('../../store/process-env');
const { getBrunoConfig } = require('../../store/bruno-config');
const Oauth2Store = require('../../store/oauth2');

const saveCookies = (url, headers) => {
  if (preferencesUtil.shouldStoreCookies()) {
    let setCookieHeaders = [];
    if (headers['set-cookie']) {
      setCookieHeaders = Array.isArray(headers['set-cookie'])
        ? headers['set-cookie']
        : [headers['set-cookie']];
      for (let setCookieHeader of setCookieHeaders) {
        if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
          addCookieToJar(setCookieHeader, url);
        }
      }
    }
  }
}

const getJsSandboxRuntime = (collection) => {
  const securityConfig = get(collection, 'securityConfig', {});
  return securityConfig.jsSandboxMode === 'safe' ? 'quickjs' : 'vm2';
};

const getCertsAndProxyConfig = async ({
  collectionUid,
  request,
  envVars,
  runtimeVariables,
  processEnvVars,
  collectionPath
}) => {
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
  
  return { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions };
}

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

  const certsAndProxyConfig = await getCertsAndProxyConfig({
    collectionUid,
    request,
    envVars,
    runtimeVariables,
    processEnvVars,
    collectionPath
  });

  let requestMaxRedirects = request.maxRedirects
  request.maxRedirects = 0
  
  // Set default value for requestMaxRedirects if not explicitly set
  if (requestMaxRedirects === undefined) {
    requestMaxRedirects = 5; // Default to 5 redirects
  }

  let { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
  let axiosInstance = makeAxiosInstance({
    proxyMode,
    proxyConfig,
    requestMaxRedirects,
    httpsAgentRequestFields,
    interpolationOptions
  });

  if (request.ntlmConfig) {
    axiosInstance=NtlmClient(request.ntlmConfig,axiosInstance.defaults)
    delete request.ntlmConfig;
  }

  if (request.oauth2) {
    let requestCopy = cloneDeep(request);
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey } = {} } = requestCopy || {};
    let credentials, credentialsId;
    switch (grantType) {
      case 'authorization_code':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingAuthorizationCode({ request: requestCopy, collectionUid, certsAndProxyConfig }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header' && credentials?.access_token) {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials.access_token}`.trim();
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'implicit':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingImplicitGrant({ request: requestCopy, collectionUid }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'client_credentials':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingClientCredentials({ request: requestCopy, collectionUid, certsAndProxyConfig }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header' && credentials?.access_token) {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials.access_token}`.trim();
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'password':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingPasswordCredentials({ request: requestCopy, collectionUid, certsAndProxyConfig }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header' && credentials?.access_token) {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials.access_token}`.trim();
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
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
      const existingCookieHeaderName = Object.keys(request.headers).find(
          name => name.toLowerCase() === 'cookie'
      );
      const existingCookieString = existingCookieHeaderName ? request.headers[existingCookieHeaderName] : '';
  
      // Helper function to parse cookies into an object
      const parseCookies = (str) => str.split(';').reduce((cookies, cookie) => {
          const [name, ...rest] = cookie.split('=');
          if (name && name.trim()) {
              cookies[name.trim()] = rest.join('=').trim();
          }
          return cookies;
      }, {});
  
      const mergedCookies = {
          ...parseCookies(existingCookieString),
          ...parseCookies(cookieString),
      };
  
      const combinedCookieString = Object.entries(mergedCookies)
          .map(([name, value]) => `${name}=${value}`)
          .join('; ');
  
      request.headers[existingCookieHeaderName || 'Cookie'] = combinedCookieString;
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

const fetchGqlSchemaHandler = async (event, endpoint, environment, _request, collection) => {
  try {
    const requestTreePath = getTreePathFromCollectionToItem(collection, _request);
    // Create a clone of the request to avoid mutating the original
    const resolvedRequest = cloneDeep(_request);
    // mergeVars modifies the request in place, but we'll assign it to ensure consistency
    mergeVars(collection, resolvedRequest, requestTreePath);
    const envVars = getEnvVars(environment);

    const globalEnvironmentVars = collection.globalEnvironmentVariables;
    const folderVars = resolvedRequest.folderVariables;
    const requestVariables = resolvedRequest.requestVariables;
    const collectionVariables = resolvedRequest.collectionVariables;
    const runtimeVars = collection.runtimeVariables;

    // Precedence: runtimeVars > requestVariables > folderVars > envVars > collectionVariables > globalEnvironmentVars
    const resolvedVars = merge(
      {},
      globalEnvironmentVars,
      collectionVariables,
      envVars,
      folderVars,
      requestVariables,
      runtimeVars
    );

    const collectionRoot = get(collection, 'root', {});
    const request = prepareGqlIntrospectionRequest(endpoint, resolvedVars, _request, collectionRoot);

    request.timeout = preferencesUtil.getRequestTimeout();

    if (!preferencesUtil.shouldVerifyTls()) {
      request.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    const collectionPath = collection.pathname;
    const processEnvVars = getProcessEnvVars(collection.uid);

    const axiosInstance = await configureRequest(
      collection.uid,
      request,
      envVars,
      collection.runtimeVariables,
      processEnvVars,
      collectionPath
    );

    const response = await axiosInstance(request);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      };
    }

    return Promise.reject(error);
  }
};

const registerNetworkIpc = (mainWindow) => {
  const onConsoleLog = (type, args) => {
    console[type](...args);

    mainWindow.webContents.send('main:console-log', {
      type,
      args
    });
  };

  const notifyScriptExecution = ({
    channel,           // 'main:run-request-event' | 'main:run-folder-event'
    basePayload,       // request-level or runner-level identifiers
    scriptType,        // 'pre-request' | 'post-response' | 'test'
    error              // optional Error
  }) => {
    mainWindow.webContents.send(channel, {
      type: `${scriptType}-script-execution`,
      ...basePayload,
      errorMessage: error ? (error.message || `An error occurred in ${scriptType.replace('-', ' ')} script`) : null
    });
  };

  const runPreRequest = async (
    request,
    requestUid,
    envVars,
    collectionPath,
    collection,
    collectionUid,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname
  ) => {
    // run pre-request script
    let scriptResult;
    const collectionName = collection?.name
    const requestScript = get(request, 'script.req');
    if (requestScript?.length) {
      const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
      scriptResult = await scriptRuntime.runRequestScript(
        decomment(requestScript),
        request,
        envVars,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname,
        collectionName
      );

      mainWindow.webContents.send('main:script-environment-update', {
        envVariables: scriptResult.envVariables,
        runtimeVariables: scriptResult.runtimeVariables,
        requestUid,
        collectionUid
      });

      mainWindow.webContents.send('main:global-environment-variables-update', {
        globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
      });

      collection.globalEnvironmentVariables = scriptResult.globalEnvironmentVariables;
    }

    // interpolate variables inside request
    interpolateVars(request, envVars, runtimeVariables, processEnvVars);

    if (request.settings?.encodeUrl) {
      request.url = encodeUrl(request.url);
    }

    // if this is a graphql request, parse the variables, only after interpolation
    // https://github.com/usebruno/bruno/issues/884
    if (request.mode === 'graphql') {
      request.data.variables = JSON.parse(request.data.variables);
    }

    // stringify the request url encoded params
    if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
      request.data = qs.stringify(request.data, { arrayFormat: 'repeat' });
    }

    if (request.headers['content-type'] === 'multipart/form-data') {
      if (!(request.data instanceof FormData)) {
        let form = createFormData(request.data, collectionPath);
        request.data = form;
        extend(request.headers, form.getHeaders());
      }
    }

    return scriptResult;
  };

  const runPostResponse = async (
    request,
    response,
    requestUid,
    envVars,
    collectionPath,
    collection,
    collectionUid,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    runRequestByItemPathname
  ) => {
    // run post-response vars
    const postResponseVars = get(request, 'vars.res', []);
    if (postResponseVars?.length) {
      const varsRuntime = new VarsRuntime({ runtime: scriptingConfig?.runtime });
      const result = varsRuntime.runPostResponseVars(
        postResponseVars,
        request,
        response,
        envVars,
        runtimeVariables,
        collectionPath,
        processEnvVars
      );

      if (result) {
        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: result.envVariables,
          runtimeVariables: result.runtimeVariables,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:global-environment-variables-update', {
          globalEnvironmentVariables: result.globalEnvironmentVariables
        });

        collection.globalEnvironmentVariables = result.globalEnvironmentVariables;
      }

      if (result?.error) {
        mainWindow.webContents.send('main:display-error', result.error);
      }

      collection.globalEnvironmentVariables = result.globalEnvironmentVariables;
    }

    // run post-response script
    const responseScript = get(request, 'script.res');
    let scriptResult;
    const collectionName = collection?.name
    if (responseScript?.length) {
      const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
      scriptResult = await scriptRuntime.runResponseScript(
        decomment(responseScript),
        request,
        response,
        envVars,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        runRequestByItemPathname,
        collectionName
      );

      mainWindow.webContents.send('main:script-environment-update', {
        envVariables: scriptResult.envVariables,
        runtimeVariables: scriptResult.runtimeVariables,
        requestUid,
        collectionUid
      });

      mainWindow.webContents.send('main:global-environment-variables-update', {
        globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
      });

      collection.globalEnvironmentVariables = scriptResult.globalEnvironmentVariables;
    }
    return scriptResult;
  };

  const runRequest = async ({ item, collection, envVars, processEnvVars, runtimeVariables, runInBackground = false }) => {
    const collectionUid = collection.uid;
    const collectionPath = collection.pathname;
    const cancelTokenUid = uuid();
    // requestUid is passed when a request is triggered; defaults to uuid() if not provided (e.g., bru.runRequest())
    const requestUid = item.requestUid || uuid();

    const runRequestByItemPathname = async (relativeItemPathname) => {
      return new Promise(async (resolve, reject) => {
        let itemPathname = path.join(collection?.pathname, relativeItemPathname);
        if (itemPathname && !itemPathname?.endsWith('.bru')) {
          itemPathname = `${itemPathname}.bru`;
        }
        const _item = cloneDeep(findItemInCollectionByPathname(collection, itemPathname));
        if(_item) {
          const res = await runRequest({ item: _item, collection, envVars, processEnvVars, runtimeVariables, runInBackground: true });
          resolve(res);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    }

    !runInBackground && mainWindow.webContents.send('main:run-request-event', {
      type: 'request-queued',
      requestUid,
      collectionUid,
      itemUid: item.uid,
      cancelTokenUid
    });

    const abortController = new AbortController();
    const request = await prepareRequest(item, collection, abortController);
    request.__bruno__executionMode = 'standalone';
    const brunoConfig = getBrunoConfig(collectionUid);
    const scriptingConfig = get(brunoConfig, 'scripts', {});
    scriptingConfig.runtime = getJsSandboxRuntime(collection);

    try {
      request.signal = abortController.signal;
      saveCancelToken(cancelTokenUid, abortController);

      let preRequestScriptResult = null;
      let preRequestError = null;
      try {
        preRequestScriptResult = await runPreRequest(
          request,
          requestUid,
          envVars,
          collectionPath,
          collection,
          collectionUid,
          runtimeVariables,
          processEnvVars,
          scriptingConfig,
          runRequestByItemPathname
        );
      } catch (error) {
        preRequestError = error;
      }

      if (preRequestScriptResult?.results) {
        mainWindow.webContents.send('main:run-request-event', {
          type: 'test-results-pre-request',
          results: preRequestScriptResult.results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });
      }

      !runInBackground && notifyScriptExecution({
        channel: 'main:run-request-event',
        basePayload: { requestUid, collectionUid, itemUid: item.uid },
        scriptType: 'pre-request',
        error: preRequestError
      });

      if (preRequestError) {
        return Promise.reject(preRequestError);
      }
      const axiosInstance = await configureRequest(
        collectionUid,
        request,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath
      );

      const { data: requestData, dataBuffer: requestDataBuffer } = parseDataFromRequest(request);
      let requestSent = {
        url: request.url,
        method: request.method,
        headers: request.headers,
        data: requestData,
        dataBuffer: requestDataBuffer
      }

      !runInBackground && mainWindow.webContents.send('main:run-request-event', {
        type: 'request-sent',
        requestSent,
        collectionUid,
        itemUid: item.uid,
        requestUid,
        cancelTokenUid
      });

      if (request?.oauth2Credentials) {
        mainWindow.webContents.send('main:credentials-update', {
          credentials: request?.oauth2Credentials?.credentials,
          url: request?.oauth2Credentials?.url,
          collectionUid,
          credentialsId: request?.oauth2Credentials?.credentialsId,
          ...(request?.oauth2Credentials?.folderUid ? { folderUid: request.oauth2Credentials.folderUid } : { itemUid: item.uid }),
          debugInfo: request?.oauth2Credentials?.debugInfo,
        });
      }

      let response, responseTime;
      try {
        /** @type {import('axios').AxiosResponse} */
        response = await axiosInstance(request);

        // Prevents the duration on leaking to the actual result
        responseTime = response.headers.get('request-duration');
        response.headers.delete('request-duration');
      } catch (error) {
        deleteCancelToken(cancelTokenUid);

        // if it's a cancel request, don't continue
        if (axios.isCancel(error)) {
          // we are not rejecting the promise here and instead returning a response object with `error` which is handled in the `send-http-request` invocation
          // timeline prop won't be accessible in the usual way in the renderer process if we reject the promise
          return {
            statusText: 'REQUEST_CANCELLED',
            isCancel: true,
            error: 'REQUEST_CANCELLED',
            timeline: error.timeline
          };
        }
        if (error?.response) {
          response = error.response;

          // Prevents the duration on leaking to the actual result
          responseTime = response.headers.get('request-duration');
          response.headers.delete('request-duration');
        } else {
          await executeRequestOnFailHandler(request, error);

          // if it's not a network error, don't continue
          // we are not rejecting the promise here and instead returning a response object with `error` which is handled in the `send-http-request` invocation
          // timeline prop won't be accessible in the usual way in the renderer process if we reject the promise
          return {
            statusText: error.statusText,
            error: error.message || 'Error occured while executing the request!',
            timeline: error.timeline
          }
        }
      }

      // Continue with the rest of the request lifecycle - post response vars, script, assertions, tests

      const { data, dataBuffer } = parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
      response.data = data;
      response.dataBuffer = dataBuffer;

      response.responseTime = responseTime;

      // save cookies
      if (preferencesUtil.shouldStoreCookies()) {
        saveCookies(request.url, response.headers);
      }

      // send domain cookies to renderer
      const domainsWithCookies = await getDomainsWithCookies();

      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));

      let postResponseScriptResult = null;
      let postResponseError = null;
      try {
        postResponseScriptResult = await runPostResponse(
          request,
          response,
          requestUid,
          envVars,
          collectionPath,
          collection,
          collectionUid,
          runtimeVariables,
          processEnvVars,
          scriptingConfig,
          runRequestByItemPathname
        );
      } catch (error) {
        console.error('Post-response script error:', error);
        postResponseError = error;
      }
      
      if (postResponseScriptResult?.results) {
        mainWindow.webContents.send('main:run-request-event', {
          type: 'test-results-post-response',
          results: postResponseScriptResult.results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });
      }

      !runInBackground && notifyScriptExecution({
        channel: 'main:run-request-event',
        basePayload: { requestUid, collectionUid, itemUid: item.uid },
        scriptType: 'post-response',
        error: postResponseError
      });

      // run assertions
      const assertions = get(request, 'assertions');
      if (assertions) {
        const assertRuntime = new AssertRuntime({ runtime: scriptingConfig?.runtime });
        const results = assertRuntime.runAssertions(
          assertions,
          request,
          response,
          envVars,
          runtimeVariables,
          processEnvVars
        );

        !runInBackground && mainWindow.webContents.send('main:run-request-event', {
          type: 'assertion-results',
          results: results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });
      }

      const testFile = get(request, 'tests');
      const collectionName = collection?.name
      if (typeof testFile === 'string') {
        const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
        let testResults = null;
        let testError = null;

        try {
          testResults = await testRuntime.runTests(
            decomment(testFile),
            request,
            response,
            envVars,
            runtimeVariables,
            collectionPath,
            onConsoleLog,
            processEnvVars,
            scriptingConfig,
            runRequestByItemPathname,
            collectionName
          );
        } catch (error) {
          testError = error;
          
          if (error.partialResults) {
            testResults = error.partialResults;
          } else {
            testResults = {
              request,
              envVariables: envVars,
              runtimeVariables,
              globalEnvironmentVariables: request?.globalEnvironmentVariables || {},
              results: [],
              nextRequestName: null
            };
          }
        }

        !runInBackground && mainWindow.webContents.send('main:run-request-event', {
          type: 'test-results',
          results: testResults.results,
          itemUid: item.uid,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:script-environment-update', {
          envVariables: testResults.envVariables,
          runtimeVariables: testResults.runtimeVariables,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:global-environment-variables-update', {
          globalEnvironmentVariables: testResults.globalEnvironmentVariables
        });

        collection.globalEnvironmentVariables = testResults.globalEnvironmentVariables;

        !runInBackground && notifyScriptExecution({
          channel: 'main:run-request-event',
          basePayload: { requestUid, collectionUid, itemUid: item.uid },
          scriptType: 'test',
          error: testError
        });
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        dataBuffer: response.dataBuffer.toString('base64'),
        size: Buffer.byteLength(response.dataBuffer),
        duration: responseTime ?? 0,
        timeline: response.timeline
      };
    } catch (error) {
      deleteCancelToken(cancelTokenUid);

      // we are not rejecting the promise here and instead returning a response object with `error` which is handled in the `send-http-request` invocation
      // timeline prop won't be accessible in the usual way in the renderer process if we reject the promise
      return {
        status: error?.status,
        error: error?.message || 'Error occured while executing the request!',
        timeline: error?.timeline
      };
    }
  }

  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collection, environment, runtimeVariables) => {
    const collectionUid = collection.uid;
    const envVars = getEnvVars(environment);
    const processEnvVars = getProcessEnvVars(collectionUid);
    return await runRequest({ item, collection, envVars, processEnvVars, runtimeVariables, runInBackground: false });
  });

  ipcMain.handle('clear-oauth2-cache', async (event, uid, url, credentialsId) => {
    return new Promise((resolve, reject) => {
      try {
        const oauth2Store = new Oauth2Store();
        oauth2Store.clearSessionIdOfCollection({ collectionUid: uid, url, credentialsId });
        resolve();
      } catch (err) {
        reject(new Error('Could not clear oauth2 cache'));
      }
    });
  });

  ipcMain.handle('cancel-http-request', async (event, cancelTokenUid) => {
    return new Promise((resolve, reject) => {
      if (cancelTokenUid && cancelTokens[cancelTokenUid]) {
        cancelTokens[cancelTokenUid].abort();
        deleteCancelToken(cancelTokenUid);
        resolve();
      } else {
        reject(new Error('cancel token not found'));
      }
    });
  });

  // handler for fetch-gql-schema
  ipcMain.handle('fetch-gql-schema', fetchGqlSchemaHandler)

  ipcMain.handle(
    'renderer:run-collection-folder',
    async (event, folder, collection, environment, runtimeVariables, recursive, delay) => {
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const folderUid = folder ? folder.uid : null;
      const cancelTokenUid = uuid();
      const brunoConfig = getBrunoConfig(collectionUid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      scriptingConfig.runtime = getJsSandboxRuntime(collection);
      const envVars = getEnvVars(environment);
      const processEnvVars = getProcessEnvVars(collectionUid);
      let stopRunnerExecution = false;

      const abortController = new AbortController();
      saveCancelToken(cancelTokenUid, abortController);

      const runRequestByItemPathname = async (relativeItemPathname) => {
        return new Promise(async (resolve, reject) => {
          let itemPathname = path.join(collection?.pathname, relativeItemPathname);
          if (itemPathname && !itemPathname?.endsWith('.bru')) {
            itemPathname = `${itemPathname}.bru`;
          }
          const _item = cloneDeep(findItemInCollectionByPathname(collection, itemPathname));
          if(_item) {
            const res = await runRequest({ item: _item, collection, envVars, processEnvVars, runtimeVariables, runInBackground: true });                  
            resolve(res);
          }
          reject(`bru.runRequest: invalid request path - ${itemPathname}`);
        });
      }

      if (!folder) {
        folder = collection;
      }

      mainWindow.webContents.send('main:run-folder-event', {
        type: 'testrun-started',
        isRecursive: recursive,
        collectionUid,
        folderUid,
        cancelTokenUid
      });

      try {
        let folderRequests = [];

        if (recursive) {
          let sortedFolder = sortFolder(folder);
          folderRequests = getAllRequestsInFolderRecursively(sortedFolder);
        } else {
          each(folder.items, (item) => {
            if (item.request) {
              folderRequests.push(item);
            }
          });

          
          // sort requests by seq property
          folderRequests = sortByNameThenSequence(folderRequests)
        }

        let currentRequestIndex = 0;
        let nJumps = 0; // count the number of jumps to avoid infinite loops
        while (currentRequestIndex < folderRequests.length) {
          // user requested to cancel runner
          if (abortController.signal.aborted) {
            let error = new Error('Runner execution cancelled');
            error.isCancel = true;
            throw error;
          }

          stopRunnerExecution = false;

          const item = cloneDeep(folderRequests[currentRequestIndex]);
          let nextRequestName;
          const itemUid = item.uid;
          const eventData = {
            collectionUid,
            folderUid,
            itemUid
          };

          let timeStart;
          let timeEnd;

          mainWindow.webContents.send('main:run-folder-event', {
            type: 'request-queued',
            ...eventData
          });

          const request = await prepareRequest(item, collection, abortController);
          request.__bruno__executionMode = 'runner';
          
          const requestUid = uuid();

          try {
            let preRequestScriptResult;
            let preRequestError = null;
            try {
              preRequestScriptResult = await runPreRequest(
                request,
                requestUid,
                envVars,
                collectionPath,
                collection,
                collectionUid,
                runtimeVariables,
                processEnvVars,
                scriptingConfig,
                runRequestByItemPathname
              );
            } catch (error) {
              console.error('Pre-request script error:', error);
              preRequestError = error;
            }

            if (preRequestScriptResult?.results) {
              mainWindow.webContents.send('main:run-folder-event', {
                type: 'test-results-pre-request',
                preRequestTestResults: preRequestScriptResult.results,
                ...eventData
              });
            }

            notifyScriptExecution({
              channel: 'main:run-folder-event',
              basePayload: eventData,
              scriptType: 'pre-request',
              error: preRequestError
            });

            if (preRequestError) {
              throw preRequestError;
            }

            if (preRequestScriptResult?.nextRequestName !== undefined) {
              nextRequestName = preRequestScriptResult.nextRequestName;
            }

            if (preRequestScriptResult?.stopExecution) {
              stopRunnerExecution = true;
            }

            if (preRequestScriptResult?.skipRequest) {
              mainWindow.webContents.send('main:run-folder-event', {
                type: 'runner-request-skipped',
                error: 'Request has been skipped from pre-request script',
                responseReceived: {
                  status: 'skipped',
                  statusText: 'request skipped via pre-request script',
                  data: null,
                  responseTime: 0,
                  headers: null
                },
                ...eventData
              });
              currentRequestIndex++;
              continue;
            }

            const { data: requestData, dataBuffer: requestDataBuffer } = parseDataFromRequest(request);
            let requestSent = {
              url: request.url,
              method: request.method,
              headers: request.headers,
              data: requestData,
              dataBuffer: requestDataBuffer
            }

            // todo:
            // i have no clue why electron can't send the request object
            // without safeParseJSON(safeStringifyJSON(request.data))
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'request-sent',
              requestSent,
              ...eventData
            });

            request.signal = abortController.signal;
            const axiosInstance = await configureRequest(
              collectionUid,
              request,
              envVars,
              runtimeVariables,
              processEnvVars,
              collectionPath
            );

            if (request?.oauth2Credentials) {
              mainWindow.webContents.send('main:credentials-update', {
                credentials: request?.oauth2Credentials?.credentials,
                url: request?.oauth2Credentials?.url,
                collectionUid,
                credentialsId: request?.oauth2Credentials?.credentialsId,
                ...(request?.oauth2Credentials?.folderUid ? { folderUid: request.oauth2Credentials.folderUid } : { itemUid: item.uid }),
                debugInfo: request?.oauth2Credentials?.debugInfo,
              });
            }

            timeStart = Date.now();
            let response, responseTime;
            try {
              if (delay && !Number.isNaN(delay) && delay > 0) {
                const delayPromise = new Promise((resolve) => setTimeout(resolve, delay));

                const cancellationPromise = new Promise((_, reject) => {
                  abortController.signal.addEventListener('abort', () => {
                    reject(new Error('Cancelled'));
                  });
                });

                await Promise.race([delayPromise, cancellationPromise]);
              }

              /** @type {import('axios').AxiosResponse} */
              response = await axiosInstance(request);
              timeEnd = Date.now();

              const { data, dataBuffer } = parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
              response.data = data;
              response.dataBuffer = dataBuffer;
              response.responseTime = response.headers.get('request-duration');
              response.headers.delete('request-duration');

              // save cookies
              if (preferencesUtil.shouldStoreCookies()) {
                saveCookies(request.url, response.headers);
              }

              // send domain cookies to renderer
              const domainsWithCookies = await getDomainsWithCookies();

              mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'response-received',
                responseReceived: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                  duration: timeEnd - timeStart,
                  dataBuffer: dataBuffer.toString('base64'),
                  size: Buffer.byteLength(dataBuffer),
                  data: response.data,
                  responseTime: response.responseTime,
                  timeline: response.timeline,
                },
                ...eventData
              });
            } catch (error) {
              // Skip further processing if request was cancelled
              if (axios.isCancel(error)) {
                throw Promise.reject(error);
              }

              if (error?.response) {
                const { data, dataBuffer } = parseDataFromResponse(error.response);
                error.response.responseTime = error.response.headers.get('request-duration');
                error.response.headers.delete('request-duration');
                error.response.data = data;
                error.response.dataBuffer = dataBuffer;

                timeEnd = Date.now();
                response = {
                  status: error.response.status,
                  statusText: error.response.statusText,
                  headers: error.response.headers,
                  duration: timeEnd - timeStart,
                  dataBuffer: dataBuffer.toString('base64'),
                  size: Buffer.byteLength(dataBuffer),
                  data: error.response.data,
                  responseTime: error.response.responseTime,
                  timeline: error.response.timeline,
                };

                // if we get a response from the server, we consider it as a success
                mainWindow.webContents.send('main:run-folder-event', {
                  type: 'response-received',
                  error: error ? error.message : 'An error occurred while running the request',
                  responseReceived: response,
                  ...eventData
                });
              } else {
                await executeRequestOnFailHandler(request, error);

                // if it's not a network error, don't continue
                throw Promise.reject(error);
              }
            }

            let postResponseScriptResult;
            let postResponseError = null;
            try {
              postResponseScriptResult = await runPostResponse(
                request,
                response,
                requestUid,
                envVars,
                collectionPath,
                collection,
                collectionUid,
                runtimeVariables,
                processEnvVars,
                scriptingConfig,
                runRequestByItemPathname
              );
            } catch (error) {
              console.error('Post-response script error:', error);
              postResponseError = error;
            }

            notifyScriptExecution({
              channel: 'main:run-folder-event',
              basePayload: eventData,
              scriptType: 'post-response',
              error: postResponseError
            });

            if (postResponseScriptResult?.nextRequestName !== undefined) {
              nextRequestName = postResponseScriptResult.nextRequestName;
            }

            if (postResponseScriptResult?.stopExecution) {
              stopRunnerExecution = true;
            }

            // Send post-response test results if available
            if (postResponseScriptResult?.results) {
              mainWindow.webContents.send('main:run-folder-event', {
                type: 'test-results-post-response',
                postResponseTestResults: postResponseScriptResult.results,
                ...eventData
              });
            }

            // run assertions
            const assertions = get(item, 'request.assertions');
            if (assertions) {
              const assertRuntime = new AssertRuntime({ runtime: scriptingConfig?.runtime });
              const results = assertRuntime.runAssertions(
                assertions,
                request,
                response,
                envVars,
                runtimeVariables,
                processEnvVars
              );

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'assertion-results',
                assertionResults: results,
                itemUid: item.uid,
                collectionUid
              });
            }

            const testFile = get(request, 'tests');
            const collectionName = collection?.name
            if (typeof testFile === 'string') {
              let testResults = null;
              let testError = null;

              try {
                const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
                testResults = await testRuntime.runTests(
                  decomment(testFile),
                  request,
                  response,
                  envVars,
                  runtimeVariables,
                  collectionPath,
                  onConsoleLog,
                  processEnvVars,
                  scriptingConfig,
                  runRequestByItemPathname,
                  collectionName
                );
              } catch (error) {
                testError = error;
                
                if (error.partialResults) {
                  testResults = error.partialResults;
                } else {
                  testResults = {
                    request,
                    envVariables: envVars,
                    runtimeVariables,
                    globalEnvironmentVariables: request?.globalEnvironmentVariables || {},
                    results: [],
                    nextRequestName: null
                  };
                }
              }

              if (testResults?.nextRequestName !== undefined) {
                nextRequestName = testResults.nextRequestName;
              }

              mainWindow.webContents.send('main:run-folder-event', {
                type: 'test-results',
                testResults: testResults.results,
                ...eventData
              });

              mainWindow.webContents.send('main:script-environment-update', {
                envVariables: testResults.envVariables,
                runtimeVariables: testResults.runtimeVariables,
                collectionUid
              });

              mainWindow.webContents.send('main:global-environment-variables-update', {
                globalEnvironmentVariables: testResults.globalEnvironmentVariables
              });
              
              collection.globalEnvironmentVariables = testResults.globalEnvironmentVariables;

              notifyScriptExecution({
                channel: 'main:run-folder-event',
                basePayload: eventData,
                scriptType: 'test',
                error: testError
              });
            }
          } catch (error) {
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'error',
              error: error ? error.message : 'An error occurred while running the request',
              responseReceived: {},
              ...eventData
            });
          }

          if (stopRunnerExecution) {
            deleteCancelToken(cancelTokenUid);
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'testrun-ended',
              collectionUid,
              folderUid,
              statusText: 'collection run was terminated!'
            });
            break;
          }

          if (nextRequestName !== undefined) {
            nJumps++;
            if (nJumps > 10000) {
              throw new Error('Too many jumps, possible infinite loop');
            }
            if (nextRequestName === null) {
              break;
            }
            const nextRequestIdx = folderRequests.findIndex((request) => request.name === nextRequestName);
            if (nextRequestIdx >= 0) {
              currentRequestIndex = nextRequestIdx;
            } else {
              console.error("Could not find request with name '" + nextRequestName + "'");
              currentRequestIndex++;
            }
          } else {
            currentRequestIndex++;
          }
        }

        deleteCancelToken(cancelTokenUid);
        mainWindow.webContents.send('main:run-folder-event', {
          type: 'testrun-ended',
          collectionUid,
          folderUid
        });
      } catch (error) {
        console.log("error", error);
        deleteCancelToken(cancelTokenUid);
        mainWindow.webContents.send('main:run-folder-event', {
          type: 'testrun-ended',
          collectionUid,
          folderUid,
          error: error && !error.isCancel ? error : null
        });
      }
    }
  );

  // save response to file
  ipcMain.handle('renderer:save-response-to-file', async (event, response, url) => {
    try {
      const getHeaderValue = (headerName) => {
        const headersArray = typeof response.headers === 'object' ? Object.entries(response.headers) : [];

        if (headersArray.length > 0) {
          const header = headersArray.find((header) => header[0] === headerName);
          if (header && header.length > 1) {
            return header[1];
          }
        }
      };

      const getFileNameFromContentDispositionHeader = () => {
        const contentDisposition = getHeaderValue('content-disposition');
        try {
          const disposition = contentDispositionParser.parse(contentDisposition);
          return disposition && disposition.parameters['filename'];
        } catch (error) { }
      };

      const getFileNameFromUrlPath = () => {
        const lastPathLevel = new URL(url).pathname.split('/').pop();
        if (lastPathLevel && /\..+/.exec(lastPathLevel)) {
          return lastPathLevel;
        }
      };

      const getFileNameBasedOnContentTypeHeader = () => {
        const contentType = getHeaderValue('content-type');
        const extension = (contentType && mime.extension(contentType)) || 'txt';
        return `response.${extension}`;
      };

      const getEncodingFormat = () => {
        const contentType = getHeaderValue('content-type');
        const extension = mime.extension(contentType) || 'txt';
        return ['json', 'xml', 'html', 'yml', 'yaml', 'txt'].includes(extension) ? 'utf-8' : 'base64';
      };

      const determineFileName = () => {
        return (
          getFileNameFromContentDispositionHeader() || getFileNameFromUrlPath() || getFileNameBasedOnContentTypeHeader()
        );
      };

      const fileName = determineFileName();
      const filePath = await chooseFileToSave(mainWindow, fileName);
      if (filePath) {
        const encoding = getEncodingFormat();
        const data = Buffer.from(response.dataBuffer, 'base64')
        if (encoding === 'utf-8') {
          await writeFile(filePath, data);
        } else {
          await writeFile(filePath, data, true);
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

/**
 * Executes the custom error handler if it exists on the request
 * @param {Object} request - The request object that may contain an onFailHandler
 * @param {Error} error - The error that occurred
 */
const executeRequestOnFailHandler = async (request, error) => {
  if (!request || typeof request.onFailHandler !== 'function') {
    return;
  }

  try {
    await request.onFailHandler(error);
  } catch (handlerError) {
    console.error('Error executing onFail handler', handlerError);
    // @TODO: This is a temporary solution to display the error message in the response pane. Revisit and handle properly.
    error.message = `1. Request failed: ${error.message || 'Error occured while executing the request!'}\n2. Error executing onFail handler: ${handlerError.message || 'Unknown error'}`;
  }
};

module.exports = registerNetworkIpc;
module.exports.configureRequest = configureRequest;
module.exports.getCertsAndProxyConfig = getCertsAndProxyConfig;
module.exports.fetchGqlSchemaHandler = fetchGqlSchemaHandler;
module.exports.executeRequestOnFailHandler = executeRequestOnFailHandler;
