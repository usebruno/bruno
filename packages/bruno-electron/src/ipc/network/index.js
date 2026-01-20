const https = require('https');
const axios = require('axios');
const path = require('path');
const qs = require('qs');
const decomment = require('decomment');
const contentDispositionParser = require('content-disposition');
const mime = require('mime-types');
const { ipcMain } = require('electron');
const { each, get, extend, cloneDeep, merge } = require('lodash');
const { NtlmClient } = require('axios-ntlm');
const { VarsRuntime, AssertRuntime, ScriptRuntime, TestRuntime } = require('@usebruno/js');
const { encodeUrl } = require('@usebruno/common').utils;
const { extractPromptVariables } = require('@usebruno/common').utils;
const { interpolateString } = require('./interpolate-string');
const { resolveAwsV4Credentials, addAwsV4Interceptor } = require('./awsv4auth-helper');
const { addDigestInterceptor } = require('@usebruno/requests');
const prepareGqlIntrospectionRequest = require('./prepare-gql-introspection-request');
const { prepareRequest } = require('./prepare-request');
const interpolateVars = require('./interpolate-vars');
const { makeAxiosInstance } = require('./axios-instance');
const { resolveInheritedSettings } = require('../../utils/collection');
const { cancelTokens, saveCancelToken, deleteCancelToken } = require('../../utils/cancel-token');
const { uuid, safeStringifyJSON, safeParseJSON, parseDataFromResponse, parseDataFromRequest } = require('../../utils/common');
const { chooseFileToSave, writeFile, getCollectionFormat, hasRequestExtension } = require('../../utils/filesystem');
const { addCookieToJar, getDomainsWithCookies, getCookieStringForUrl } = require('../../utils/cookies');
const { createFormData } = require('../../utils/form-data');
const { findItemInCollectionByPathname, sortFolder, getAllRequestsInFolderRecursively, getEnvVars, getTreePathFromCollectionToItem, mergeVars, sortByNameThenSequence } = require('../../utils/collection');
const { getOAuth2TokenUsingAuthorizationCode, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingImplicitGrant, updateCollectionOauth2Credentials } = require('../../utils/oauth2');
const { preferencesUtil } = require('../../store/preferences');
const { getProcessEnvVars } = require('../../store/process-env');
const { getBrunoConfig } = require('../../store/bruno-config');
const Oauth2Store = require('../../store/oauth2');
const { isRequestTagsIncluded } = require('@usebruno/common');
const { cookiesStore } = require('../../store/cookies');
const registerGrpcEventHandlers = require('./grpc-event-handlers');
const { registerWsEventHandlers } = require('./ws-event-handlers');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { buildFormUrlEncodedPayload, isFormData } = require('@usebruno/common').utils;

const ERROR_OCCURRED_WHILE_EXECUTING_REQUEST = 'Error occurred while executing the request!';

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
};

const getJsSandboxRuntime = (collection) => {
  const securityConfig = get(collection, 'securityConfig', {});

  if (securityConfig.jsSandboxMode === 'developer') {
    return 'nodevm';
  }

  // default runtime is `quickjs`
  return 'quickjs';
};

const hasStreamHeaders = (headers) => {
  const headerSplit = (headers.get('content-type') ?? '').split(';').map((d) => d.trim());
  return headerSplit.indexOf('text/event-stream') > -1;
};

const promisifyStream = async (stream, abortController, closeOnFirst) => {
  const chunks = [];

  return new Promise((resolve, reject) => {
    const doResolve = () => {
      const fullBuffer = Buffer.concat(chunks);
      resolve(fullBuffer.buffer.slice(fullBuffer.byteOffset, fullBuffer.byteOffset + fullBuffer.byteLength));
    };

    stream.on('data', (chunk) => {
      chunks.push(chunk);

      if (closeOnFirst) {
        doResolve();

        if (abortController) {
          abortController.abort();
        }
      }
    });

    stream.on('close', doResolve);
    stream.on('error', (err) => reject(err));
  });
};

const configureRequest = async (
  collectionUid,
  collection,
  request,
  envVars,
  runtimeVariables,
  processEnvVars,
  collectionPath,
  globalEnvironmentVariables
) => {
  const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
  const hasVariables = request.url.startsWith('{{');
  if (!hasVariables && !protocolRegex.test(request.url)) {
    request.url = `http://${request.url}`;
  }

  const certsAndProxyConfig = await getCertsAndProxyConfig({
    collectionUid,
    collection,
    request,
    envVars,
    runtimeVariables,
    processEnvVars,
    collectionPath,
    globalEnvironmentVariables
  });

  // Get followRedirects setting, default to true for backward compatibility
  const followRedirects = request.settings?.followRedirects ?? true;

  // Get maxRedirects from request settings, fallback to request.maxRedirects, then default to 5
  let requestMaxRedirects = request.settings?.maxRedirects ?? request.maxRedirects ?? 5;

  // Ensure it's a valid number
  if (typeof requestMaxRedirects !== 'number' || requestMaxRedirects < 0) {
    requestMaxRedirects = 5; // Default to 5 redirects
  }

  // If followRedirects is disabled, set maxRedirects to 0 to disable all redirects
  if (!followRedirects) {
    requestMaxRedirects = 0;
  }

  request.maxRedirects = 0;

  const { promptVariables = {} } = collection;
  let { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
  let axiosInstance = makeAxiosInstance({
    proxyMode,
    proxyConfig,
    requestMaxRedirects,
    httpsAgentRequestFields,
    interpolationOptions
  });

  if (request.ntlmConfig) {
    axiosInstance = NtlmClient(request.ntlmConfig, axiosInstance.defaults);
    delete request.ntlmConfig;
  }

  if (request.oauth2) {
    let requestCopy = cloneDeep(request);
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey, accessTokenUrl, refreshTokenUrl } = {}, collectionVariables, folderVariables, requestVariables } = requestCopy || {};

    // Get cert/proxy configs for token and refresh URLs
    let certsAndProxyConfigForTokenUrl = certsAndProxyConfig;
    let certsAndProxyConfigForRefreshUrl = certsAndProxyConfig;

    if (accessTokenUrl && grantType !== 'implicit') {
      const interpolatedTokenUrl = interpolateString(accessTokenUrl, {
        globalEnvironmentVariables,
        collectionVariables,
        envVars,
        folderVariables,
        requestVariables,
        runtimeVariables,
        processEnvVars,
        promptVariables
      });
      const tokenRequestForConfig = { ...requestCopy, url: interpolatedTokenUrl };
      certsAndProxyConfigForTokenUrl = await getCertsAndProxyConfig({
        collectionUid,
        collection,
        request: tokenRequestForConfig,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath,
        globalEnvironmentVariables
      });
    }

    const tokenUrlForRefresh = refreshTokenUrl || accessTokenUrl;
    if (tokenUrlForRefresh && grantType !== 'implicit') {
      const interpolatedRefreshUrl = interpolateString(tokenUrlForRefresh, {
        globalEnvironmentVariables,
        collectionVariables,
        envVars,
        folderVariables,
        requestVariables,
        runtimeVariables,
        processEnvVars,
        promptVariables
      });
      const refreshRequestForConfig = { ...requestCopy, url: interpolatedRefreshUrl };
      certsAndProxyConfigForRefreshUrl = await getCertsAndProxyConfig({
        collectionUid,
        collection,
        request: refreshRequestForConfig,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath,
        globalEnvironmentVariables
      });
    }

    let credentials, credentialsId, oauth2Url, debugInfo;
    switch (grantType) {
      case 'authorization_code':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingAuthorizationCode({ request: requestCopy, collectionUid, certsAndProxyConfigForTokenUrl, certsAndProxyConfigForRefreshUrl }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header' && credentials?.access_token) {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials.access_token}`.trim();
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
        }
        break;
      case 'implicit':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingImplicitGrant({ request: requestCopy, collectionUid }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
        }
        break;
      case 'client_credentials':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingClientCredentials({ request: requestCopy, collectionUid, certsAndProxyConfigForTokenUrl, certsAndProxyConfigForRefreshUrl }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header' && credentials?.access_token) {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials.access_token}`.trim();
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
        }
        break;
      case 'password':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingPasswordCredentials({ request: requestCopy, collectionUid, certsAndProxyConfigForTokenUrl, certsAndProxyConfigForRefreshUrl }));
        request.oauth2Credentials = { credentials, url: oauth2Url, collectionUid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header' && credentials?.access_token) {
          request.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials.access_token}`.trim();
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
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

  // Get timeout from request settings, fallback to global preference
  const resolvedSettings = resolveInheritedSettings(request.settings || {});
  request.timeout = resolvedSettings.timeout;

  // add cookies to request
  if (preferencesUtil.shouldSendCookies()) {
    const cookieString = getCookieStringForUrl(request.url);
    if (cookieString && typeof cookieString === 'string' && cookieString.length) {
      const existingCookieHeaderName = Object.keys(request.headers).find(
        (name) => name.toLowerCase() === 'cookie'
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
        ...parseCookies(cookieString)
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
    const processEnvVars = getProcessEnvVars(collection.uid);
    const resolvedVars = merge(
      {},
      globalEnvironmentVars,
      collectionVariables,
      envVars,
      folderVars,
      requestVariables,
      runtimeVars,
      {
        process: {
          env: {
            ...processEnvVars
          }
        }
      }
    );

    const collectionRoot = collection?.draft?.root || collection?.root || {};
    const request = prepareGqlIntrospectionRequest(endpoint, resolvedVars, _request, collectionRoot);

    // Get timeout from request settings, resolve inheritance if needed
    const resolvedSettings = resolveInheritedSettings(request.settings || {});
    request.timeout = resolvedSettings.timeout;

    if (!preferencesUtil.shouldVerifyTls()) {
      request.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    const collectionPath = collection.pathname;

    const axiosInstance = await configureRequest(
      collection.uid,
      collection,
      request,
      envVars,
      collection.runtimeVariables,
      processEnvVars,
      collectionPath,
      collection.globalEnvironmentVariables
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
    channel, // 'main:run-request-event' | 'main:run-folder-event'
    basePayload, // request-level or runner-level identifiers
    scriptType, // 'pre-request' | 'post-response' | 'test'
    error // optional Error
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
    const { promptVariables = {}, name: collectionName } = collection;

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
        persistentEnvVariables: scriptResult.persistentEnvVariables,
        requestUid,
        collectionUid
      });

      mainWindow.webContents.send('main:persistent-env-variables-update', {
        persistentEnvVariables: scriptResult.persistentEnvVariables,
        collectionUid
      });

      mainWindow.webContents.send('main:global-environment-variables-update', {
        globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
      });

      collection.globalEnvironmentVariables = scriptResult.globalEnvironmentVariables;

      const domainsWithCookies = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));
    }

    // interpolate variables inside request
    interpolateVars(request, envVars, runtimeVariables, processEnvVars, promptVariables);

    if (request.settings?.encodeUrl) {
      request.url = encodeUrl(request.url);
    }

    // if this is a graphql request, parse the variables, only after interpolation
    // https://github.com/usebruno/bruno/issues/884
    if (request.mode === 'graphql') {
      request.data.variables = JSON.parse(request.data.variables);
    }

    // stringify the request url encoded params
    const contentTypeHeader = Object.keys(request.headers).find((name) => name.toLowerCase() === 'content-type');

    if (contentTypeHeader && request.headers[contentTypeHeader] === 'application/x-www-form-urlencoded') {
      if (Array.isArray(request.data)) {
        request.data = buildFormUrlEncodedPayload(request.data);
      } else if (typeof request.data !== 'string') {
        request.data = qs.stringify(request.data, { arrayFormat: 'repeat' });
      }
      // if `data` is of string type - return as-is (assumes already encoded)
    }

    if (contentTypeHeader && request.headers[contentTypeHeader] === 'multipart/form-data') {
      if (!isFormData(request.data)) {
        request._originalMultipartData = request.data;
        request.collectionPath = collectionPath;
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
          persistentEnvVariables: result.persistentEnvVariables,
          requestUid,
          collectionUid
        });

        mainWindow.webContents.send('main:persistent-env-variables-update', {
          persistentEnvVariables: result.persistentEnvVariables,
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
    }

    // run post-response script
    const responseScript = get(request, 'script.res');
    let scriptResult;
    const collectionName = collection?.name;
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
        persistentEnvVariables: scriptResult.persistentEnvVariables,
        requestUid,
        collectionUid
      });

      mainWindow.webContents.send('main:persistent-env-variables-update', {
        persistentEnvVariables: scriptResult.persistentEnvVariables,
        collectionUid
      });

      mainWindow.webContents.send('main:global-environment-variables-update', {
        globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
      });

      collection.globalEnvironmentVariables = scriptResult.globalEnvironmentVariables;

      const domainsWithCookiesPost = await getDomainsWithCookies();
      mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookiesPost)));
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
        const format = getCollectionFormat(collection.pathname);
        let itemPathname = path.join(collection.pathname, relativeItemPathname);
        if (itemPathname && !hasRequestExtension(itemPathname, format)) {
          itemPathname = `${itemPathname}.${format}`;
        }
        const _item = cloneDeep(findItemInCollectionByPathname(collection, itemPathname));
        if (_item) {
          const res = await runRequest({ item: _item, collection, envVars, processEnvVars, runtimeVariables, runInBackground: true });
          resolve(res);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    };

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
    request.responseType = 'stream';
    // flag to see if the stream needs to be handled as an actual stream or
    // is it just a data stream from axios
    let isResponseStream = false;
    const brunoConfig = getBrunoConfig(collectionUid, collection);
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
        collection,
        request,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath,
        collection.globalEnvironmentVariables
      );

      const { data: requestData, dataBuffer: requestDataBuffer } = parseDataFromRequest(request);

      // Remove false Content-Type header (used to stop axios from auto-setting it); no Content-Type was actually set or sent.
      const headersSent = { ...request.headers };
      Object.keys(headersSent).forEach((key) => {
        if (key.toLowerCase() === 'content-type' && headersSent[key] === false) {
          delete headersSent[key];
        }
      });

      let requestSent = {
        url: request.url,
        method: request.method,
        headers: headersSent,
        data: requestData,
        dataBuffer: requestDataBuffer,
        timestamp: Date.now()
      };

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
          debugInfo: request?.oauth2Credentials?.debugInfo
        });
      }

      let response, responseTime, axiosDataStream;
      try {
        /** @type {import('axios').AxiosResponse} */
        response = await axiosInstance(request);
        isResponseStream = hasStreamHeaders(response.headers);

        if (!isResponseStream) {
          response.data = await promisifyStream(response.data);
        }

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
          isResponseStream = hasStreamHeaders(response.headers);
          if (!isResponseStream) {
            response.data = await promisifyStream(response.data);
          }
        } else {
          await executeRequestOnFailHandler(request, error);

          // if it's not a network error, don't continue
          // we are not rejecting the promise here and instead returning a response object with `error` which is handled in the `send-http-request` invocation
          // timeline prop won't be accessible in the usual way in the renderer process if we reject the promise
          return {
            statusText: error.statusText,
            error: error.message || ERROR_OCCURRED_WHILE_EXECUTING_REQUEST,
            timeline: error.timeline
          };
        }
      }

      // Continue with the rest of the request lifecycle - post response vars, script, assertions, tests
      if (isResponseStream) {
        axiosDataStream = response.data;
      }

      const { data, dataBuffer } = isResponseStream
        ? { data: '', dataBuffer: Buffer.alloc(0) }
        : parseDataFromResponse(response, request.__brunoDisableParsingResponseJson);
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
      cookiesStore.saveCookieJar();

      const runPostScripts = async () => {
        let postResponseScriptResult = null;
        let postResponseError = null;
        try {
          postResponseScriptResult = await runPostResponse(request,
            response,
            requestUid,
            envVars,
            collectionPath,
            collection,
            collectionUid,
            runtimeVariables,
            processEnvVars,
            scriptingConfig,
            runRequestByItemPathname);
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
          const results = assertRuntime.runAssertions(assertions,
            request,
            response,
            envVars,
            runtimeVariables,
            processEnvVars);

          !runInBackground && mainWindow.webContents.send('main:run-request-event', {
            type: 'assertion-results',
            results: results,
            itemUid: item.uid,
            requestUid,
            collectionUid
          });
        }

        const testFile = get(request, 'tests');
        const collectionName = collection?.name;
        if (typeof testFile === 'string') {
          const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
          let testResults = null;
          let testError = null;

          try {
            testResults = await testRuntime.runTests(decomment(testFile),
              request,
              response,
              envVars,
              runtimeVariables,
              collectionPath,
              onConsoleLog,
              processEnvVars,
              scriptingConfig,
              runRequestByItemPathname,
              collectionName);
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

          mainWindow.webContents.send('main:persistent-env-variables-update', {
            persistentEnvVariables: testResults.persistentEnvVariables,
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

          const domainsWithCookiesTest = await getDomainsWithCookies();
          mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookiesTest)));
          cookiesStore.saveCookieJar();
        }
      };
      if (isResponseStream) {
        axiosDataStream.on('close', () => runPostScripts().then());
      } else {
        await runPostScripts();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        stream: isResponseStream ? axiosDataStream : null,
        cancelTokenUid: cancelTokenUid,
        dataBuffer: response.dataBuffer.toString('base64'),
        size: Buffer.byteLength(response.dataBuffer),
        duration: responseTime ?? 0,
        url: response.request ? response.request.protocol + '//' + response.request.host + response.request.path : null,
        timeline: response.timeline
      };
    } catch (error) {
      deleteCancelToken(cancelTokenUid);

      // we are not rejecting the promise here and instead returning a response object with `error` which is handled in the `send-http-request` invocation
      // timeline prop won't be accessible in the usual way in the renderer process if we reject the promise
      return {
        status: error?.status,
        error: error?.message || ERROR_OCCURRED_WHILE_EXECUTING_REQUEST,
        timeline: error?.timeline
      };
    }
  };

  /**
   * Extract prompt variables from a request
   * Tries to respect the hierarchy of the variables and avoid unnecessary prompts as much as possible
   * Note: TO BE CALLED ONLY AFTER THE PREPARE REQUEST
   *
   * @param {*} request - request object built by prepareRequest
   * @returns {string[]} An array of extracted prompt variables
   */
  const extractPromptVariablesForRequest = async ({ request, collection, envVars: collectionEnvironmentVars, runtimeVariables, processEnvVars }) => {
    const { globalEnvironmentVariables, collectionVariables, folderVariables, requestVariables, ...requestObj } = request;

    const allVariables = {
      ...globalEnvironmentVariables,
      ...collectionEnvironmentVars,
      ...collectionVariables,
      ...folderVariables,
      ...requestVariables,
      ...runtimeVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    const { interpolationOptions, ...certsAndProxyConfig } = await getCertsAndProxyConfig({
      collectionUid: collection.uid,
      collection,
      request,
      envVars: collectionEnvironmentVars,
      runtimeVariables,
      processEnvVars,
      collectionPath: collection.pathname,
      globalEnvironmentVariables
    });

    const prompts = extractPromptVariables(requestObj);
    prompts.push(...extractPromptVariables(allVariables));
    prompts.push(...extractPromptVariables(certsAndProxyConfig));

    // return unique prompt variables
    return Array.from(new Set(prompts));
  };

  // handler for sending http request
  ipcMain.handle('send-http-request', async (event, item, collection, environment, runtimeVariables) => {
    let seq = 0;
    const collectionUid = collection.uid;
    const envVars = getEnvVars(environment);
    const processEnvVars = getProcessEnvVars(collectionUid);
    const response = await runRequest({ item, collection, envVars, processEnvVars, runtimeVariables, runInBackground: false });
    if (response.stream) {
      const stream = response.stream;
      response.stream = { running: response.status >= 200 && response.status < 300 };

      stream.on('data', (newData) => {
        seq += 1;

        const parsed = parseDataFromResponse({ data: newData, headers: {} });

        mainWindow.webContents.send('main:http-stream-new-data', {
          collectionUid,
          itemUid: item.uid,
          seq,
          timestamp: Date.now(),
          data: parsed
        });
      });

      stream.on('close', () => {
        if (!cancelTokens[response.cancelTokenUid]) return;

        mainWindow.webContents.send('main:http-stream-end', {
          collectionUid,
          itemUid: item.uid,
          seq: seq + 1,
          timestamp: Date.now()
        });

        deleteCancelToken(response.cancelTokenUid);
      });
    }
    return response;
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
        const abortController = cancelTokens[cancelTokenUid];
        deleteCancelToken(cancelTokenUid);
        abortController.abort();
        resolve();
      } else {
        reject(new Error('cancel token not found'));
      }
    });
  });

  // handler for fetch-gql-schema
  ipcMain.handle('fetch-gql-schema', fetchGqlSchemaHandler);

  ipcMain.handle(
    'renderer:run-collection-folder', async (event, folder, collection, environment, runtimeVariables, recursive, delay, tags, selectedRequestUids) => {
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const folderUid = folder ? folder.uid : null;
      const cancelTokenUid = uuid();
      const brunoConfig = getBrunoConfig(collectionUid, collection);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      scriptingConfig.runtime = getJsSandboxRuntime(collection);
      const envVars = getEnvVars(environment);
      const processEnvVars = getProcessEnvVars(collectionUid);
      let stopRunnerExecution = false;
      let currentAbortController;

      const abortController = new AbortController();
      saveCancelToken(cancelTokenUid, abortController);

      abortController.signal.addEventListener('abort', () => {
        if (currentAbortController) {
          currentAbortController.abort();
        }
      });

      const runRequestByItemPathname = async (relativeItemPathname) => {
        return new Promise(async (resolve, reject) => {
          const format = getCollectionFormat(collection.pathname);
          let itemPathname = path.join(collection.pathname, relativeItemPathname);
          if (itemPathname && !hasRequestExtension(itemPathname, format)) {
            itemPathname = `${itemPathname}.${format}`;
          }
          const _item = cloneDeep(findItemInCollectionByPathname(collection, itemPathname));
          if (_item) {
            const res = await runRequest({ item: _item, collection, envVars, processEnvVars, runtimeVariables, runInBackground: true });
            resolve(res);
          }
          reject(`bru.runRequest: invalid request path - ${itemPathname}`);
        });
      };

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
          folderRequests = sortByNameThenSequence(folderRequests);
        }

        // Filter requests based on tags
        if (tags && tags.include && tags.exclude) {
          const includeTags = tags.include ? tags.include : [];
          const excludeTags = tags.exclude ? tags.exclude : [];
          folderRequests = folderRequests.filter(({ tags: requestTags = [], draft }) => {
            requestTags = draft?.tags || requestTags || [];
            return isRequestTagsIncluded(requestTags, includeTags, excludeTags);
          });
        }

        // Filter requests based on selectedRequestUids (for "Configure requests to run")
        if (selectedRequestUids && selectedRequestUids.length > 0) {
          const uidIndexMap = new Map();
          selectedRequestUids.forEach((uid, index) => {
            uidIndexMap.set(uid, index);
          });

          folderRequests = folderRequests
            .filter((request) => uidIndexMap.has(request.uid))
            .sort((a, b) => {
              const indexA = uidIndexMap.get(a.uid);
              const indexB = uidIndexMap.get(b.uid);
              return indexA - indexB;
            });
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

          // Skip gRPC requests
          if (item.type === 'grpc-request') {
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'runner-request-skipped',
              error: 'gRPC requests are skipped in folder/collection runs',
              responseReceived: {
                status: 'skipped',
                statusText: 'gRPC request skipped',
                data: null,
                responseTime: 0,
                headers: null
              },
              ...eventData
            });
            currentRequestIndex++;
            continue;
          }

          const request = await prepareRequest(item, collection, abortController);
          request.__bruno__executionMode = 'runner';

          const requestUid = uuid();

          const promptVars = await extractPromptVariablesForRequest({ request, collection, envVars, runtimeVariables, processEnvVars });

          if (promptVars.length > 0) {
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'runner-request-skipped',
              error: 'Request has been skipped due to containing prompt variables',
              responseReceived: {
                status: 'skipped',
                statusText: `Prompt variables detected in request. Runner execution is not supported for requests with prompt variables. \n Promps: ${promptVars.join(', ')}`,
                data: null,
                responseTime: 0,
                headers: null
              },
              ...eventData
            });

            currentRequestIndex++;

            continue;
          }

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

            const domainsWithCookiesPreRequest = await getDomainsWithCookies();
            mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookiesPreRequest)));

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

            // Remove false Content-Type header (used to stop axios from auto-setting it); no Content-Type was actually set or sent.
            const headersSent = { ...request.headers };
            Object.keys(headersSent).forEach((key) => {
              if (key.toLowerCase() === 'content-type' && headersSent[key] === false) {
                delete headersSent[key];
              }
            });

            let requestSent = {
              url: request.url,
              method: request.method,
              headers: headersSent,
              data: requestData,
              dataBuffer: requestDataBuffer,
              timestamp: Date.now()
            };

            // todo:
            // i have no clue why electron can't send the request object
            // without safeParseJSON(safeStringifyJSON(request.data))
            mainWindow.webContents.send('main:run-folder-event', {
              type: 'request-sent',
              requestSent,
              ...eventData
            });

            currentAbortController = new AbortController();
            request.signal = currentAbortController.signal;
            request.responseType = 'stream';
            const axiosInstance = await configureRequest(
              collectionUid,
              collection,
              request,
              envVars,
              runtimeVariables,
              processEnvVars,
              collectionPath,
              collection.globalEnvironmentVariables
            );

            if (request?.oauth2Credentials) {
              mainWindow.webContents.send('main:credentials-update', {
                credentials: request?.oauth2Credentials?.credentials,
                url: request?.oauth2Credentials?.url,
                collectionUid,
                credentialsId: request?.oauth2Credentials?.credentialsId,
                ...(request?.oauth2Credentials?.folderUid ? { folderUid: request.oauth2Credentials.folderUid } : { itemUid: item.uid }),
                debugInfo: request?.oauth2Credentials?.debugInfo
              });

              collection.oauth2Credentials = updateCollectionOauth2Credentials({
                itemUid: item.uid,
                collectionUid,
                collectionOauth2Credentials: collection.oauth2Credentials,
                requestOauth2Credentials: request.oauth2Credentials
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
              response.data = await promisifyStream(response.data, currentAbortController, false);
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
                  url: response.request ? response.request.protocol + '//' + response.request.host + response.request.path : null
                },
                ...eventData
              });
            } catch (error) {
              // Skip further processing if request was cancelled
              if (axios.isCancel(error)) {
                throw error;
              }

              if (error?.response) {
                error.response.data = await promisifyStream(error.response.data, currentAbortController, true);
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
                  timeline: error.response.timeline
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
                throw error;
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

            const domainsWithCookiesPostResponse = await getDomainsWithCookies();
            mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookiesPostResponse)));

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
            const collectionName = collection?.name;
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

              const domainsWithCookiesTest = await getDomainsWithCookies();
              mainWindow.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookiesTest)));
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
              statusText: 'collection run was terminated!',
              runCompletionTime: new Date().toISOString()
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
              console.error('Could not find request with name \'' + nextRequestName + '\'');
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
          folderUid,
          runCompletionTime: new Date().toISOString()
        });
      } catch (error) {
        console.log('error', error);
        deleteCancelToken(cancelTokenUid);
        mainWindow.webContents.send('main:run-folder-event', {
          type: 'testrun-ended',
          collectionUid,
          folderUid,
          runCompletionTime: new Date().toISOString(),
          error: error && !error.isCancel ? error : null
        });
      }
    }
  );

  // save response to file
  ipcMain.handle('renderer:save-response-to-file', async (event, response, url, pathname) => {
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

      const dirPath = path.dirname(pathname);
      const fileName = determineFileName();
      const filePath = await chooseFileToSave(mainWindow, path.join(dirPath, fileName));
      if (filePath) {
        const encoding = getEncodingFormat();
        const data = Buffer.from(response.dataBuffer, 'base64');
        if (encoding === 'utf-8') {
          await writeFile(filePath, data);
        } else {
          await writeFile(filePath, data, true);
        }
        return { success: true, filePath };
      }
      return { success: false, cancelled: true };
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
    error.message = `1. Request failed: ${error.message || ERROR_OCCURRED_WHILE_EXECUTING_REQUEST}\n2. Error executing onFail handler: ${handlerError.message || 'Unknown error'}`;
  }
};

const registerAllNetworkIpc = (mainWindow) => {
  registerNetworkIpc(mainWindow);
  registerGrpcEventHandlers(mainWindow);
  registerWsEventHandlers(mainWindow);
};

module.exports = registerAllNetworkIpc;
module.exports.configureRequest = configureRequest;
module.exports.getCertsAndProxyConfig = getCertsAndProxyConfig;
module.exports.fetchGqlSchemaHandler = fetchGqlSchemaHandler;
module.exports.executeRequestOnFailHandler = executeRequestOnFailHandler;
