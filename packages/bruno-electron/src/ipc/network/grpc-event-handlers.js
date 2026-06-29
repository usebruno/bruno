// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require('@usebruno/requests');
const { ScriptRuntime, TestRuntime, formatErrorWithContextV2 } = require('@usebruno/js');
const decomment = require('decomment');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep, get } = require('lodash');
const { preferencesUtil } = require('../../store/preferences');
const { getBrunoConfig } = require('../../store/bruno-config');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { interpolateString } = require('./interpolate-string');
const path = require('node:path');
const prepareGrpcRequest = require('./prepare-grpc-request');
const { normalizeAndResolvePath } = require('../../utils/filesystem');
const { configureRequest } = require('./prepare-grpc-request');
const { shouldUseProxy } = require('../../utils/proxy-util');
const { getPacResolver } = require('@usebruno/requests');

// Creating grpcClient at module level so it can be accessed from window-all-closed event
let grpcClient;

const getJsSandboxRuntime = (collection) => {
  const securityConfig = get(collection, 'securityConfig', {});
  return securityConfig.jsSandboxMode === 'developer' ? 'nodevm' : 'quickjs';
};

/**
 * Resolve proxy configuration for gRPC requests.
 * @grpc/grpc-js only supports HTTP protocol proxies (HTTP CONNECT tunneling).
 * SOCKS and HTTPS proxy protocols are not supported.
 *
 * Always returns an object so that @grpc/grpc-js's built-in env var proxy
 * (http_proxy/https_proxy) is disabled — Bruno controls all proxy behavior.
 *
 * @param {string} proxyMode - 'on', 'system', or 'off'
 * @param {Object} proxyConfig - Raw proxy config from getCertsAndProxyConfig
 * @param {string} requestUrl - The gRPC request URL
 * @param {Object} interpolationOptions - Variable interpolation options
 * @returns {{ proxyUrl: string | null }}
 */
const resolveGrpcProxyConfig = async (proxyMode, proxyConfig, requestUrl, interpolationOptions) => {
  if (proxyMode === 'pac') {
    const pacSource = get(proxyConfig, 'pac.source');
    if (!pacSource || !requestUrl) return { proxyUrl: null };

    try {
      const resolver = await getPacResolver({ pacSource });
      const directives = await resolver.resolve(requestUrl);
      if (!directives || !directives.length) return { proxyUrl: null };

      for (const directive of directives) {
        if (/^DIRECT$/i.test(directive)) return { proxyUrl: null };
        if (/^(PROXY|HTTP)\s+/i.test(directive)) {
          const hostPort = directive.split(/\s+/)[1];
          return { proxyUrl: `http://${hostPort}` };
        }
        if (/^HTTPS\s+/i.test(directive)) {
          console.warn('gRPC proxy: PAC returned an HTTPS proxy directive which is not supported for gRPC connections. Skipping.');
          continue;
        }
        if (/^SOCKS/i.test(directive)) {
          console.warn('gRPC proxy: PAC returned a SOCKS proxy directive which is not supported for gRPC connections. Skipping.');
          continue;
        }
      }
    } catch (e) {
      console.warn('gRPC proxy: PAC resolution failed:', e.message);
    }
    return { proxyUrl: null };
  }

  if (proxyMode === 'on') {
    const shouldProxy = shouldUseProxy(requestUrl, get(proxyConfig, 'bypassProxy', ''));
    if (!shouldProxy) return { proxyUrl: null };

    const protocol = interpolateString(get(proxyConfig, 'protocol', ''), interpolationOptions) || '';
    if (protocol.includes('socks') || protocol === 'https') {
      console.warn(`gRPC proxy: "${protocol}" protocol not supported. Only HTTP proxies are supported for gRPC connections.`);
      return { proxyUrl: null };
    }

    const hostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
    const port = interpolateString(String(get(proxyConfig, 'port', '')), interpolationOptions);
    const authEnabled = !get(proxyConfig, 'auth.disabled', false);
    const portStr = port ? `:${port}` : '';

    if (authEnabled) {
      const username = encodeURIComponent(
        interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions)
      );
      const password = encodeURIComponent(
        interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions)
      );
      return { proxyUrl: `http://${username}:${password}@${hostname}${portStr}` };
    }
    return { proxyUrl: `http://${hostname}${portStr}` };
  }

  if (proxyMode === 'system') {
    const { http_proxy, https_proxy, no_proxy } = proxyConfig || {};
    const shouldProxy = shouldUseProxy(requestUrl, no_proxy || '');
    if (!shouldProxy) return { proxyUrl: null };

    const systemProxy = https_proxy || http_proxy;
    if (!systemProxy) return { proxyUrl: null };

    try {
      const parsed = new URL(systemProxy);
      if (parsed.protocol !== 'http:') {
        console.warn(
          `gRPC proxy: "${parsed.protocol}" system proxy protocol not supported. Only HTTP proxies are supported for gRPC connections.`
        );
        return { proxyUrl: null };
      }
      return { proxyUrl: systemProxy };
    } catch (e) {
      console.warn('Invalid system proxy URL for gRPC:', systemProxy);
      return { proxyUrl: null };
    }
  }

  // proxyMode is 'off' — no proxy, but still disable env var proxy
  return { proxyUrl: null };
};

/**
 * Extract protobuf include directories from collection config
 * @param {Object} collection - The collection object
 * @returns {string[]} Array of resolved include directory paths
 */
const getProtobufIncludeDirs = (collection) => {
  if (!collection) {
    return [];
  }

  const brunoConfig = collection.draft?.brunoConfig || collection.brunoConfig;
  const importPaths = brunoConfig?.protobuf?.importPaths ?? [];

  return importPaths
    .filter(({ enabled }) => Boolean(enabled))
    .map(({ path: relativePath }) => normalizeAndResolvePath(path.resolve(collection.pathname, relativePath)));
};

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = (window) => {
  const sendEvent = (eventName, ...args) => {
    if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  grpcClient = new GrpcClient(sendEvent);

  const onConsoleLog = (type, args) => {
    console[type]?.(...args);
    sendEvent('main:console-log', { type, args });
  };

  /**
   * Propagate env / runtime / global variable changes from a script result to the renderer.
   * Shared between the before-message and on-message script runners.
   */
  const propagateScriptEnvUpdates = (scriptResult, request, collection) => {
    if (!scriptResult) return;
    sendEvent('main:script-environment-update', {
      envVariables: scriptResult.envVariables,
      runtimeVariables: scriptResult.runtimeVariables,
      persistentEnvVariables: scriptResult.persistentEnvVariables,
      requestUid: request.uid,
      collectionUid: collection.uid
    });
    sendEvent('main:persistent-env-variables-update', {
      persistentEnvVariables: scriptResult.persistentEnvVariables,
      collectionUid: collection.uid
    });
    sendEvent('main:global-environment-variables-update', {
      globalEnvironmentVariables: scriptResult.globalEnvironmentVariables
    });
    collection.globalEnvironmentVariables = scriptResult.globalEnvironmentVariables;
  };

  /**
   * Run the gRPC "before message" script (script.req) before a request/message is sent.
   * Mirrors runPreRequest in the HTTP path: executes the user script, surfaces any
   * script error to the UI via `pre-request-script-execution`, and propagates env /
   * runtime / global variable changes back to the renderer.
   *
   * @returns {{ scriptResult: object | null, scriptError: Error | null }}
   */
  const runBeforeMessageScript = async ({
    request,
    collection,
    envVars,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    requestUid,
    itemUid
  }) => {
    const beforeMessageScript = get(request, 'script.req');
    if (!beforeMessageScript?.length) {
      return { scriptResult: null, scriptError: null };
    }

    const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
    let scriptError = null;
    let scriptResult = null;
    try {
      scriptResult = await scriptRuntime.runRequestScript(
        decomment(beforeMessageScript, { space: true }),
        request,
        envVars,
        runtimeVariables,
        collection.pathname,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        null,
        collection.name
      );
    } catch (error) {
      scriptError = error;
    }

    sendEvent('main:run-request-event', {
      type: 'pre-request-script-execution',
      requestUid,
      itemUid,
      collectionUid: collection.uid,
      errorMessage: scriptError ? (scriptError.message || 'An error occurred in pre request script') : null,
      errorContext: scriptError
        ? formatErrorWithContextV2(scriptError, 'pre-request', request?.script?.reqMetadata, collection.pathname)
        : null
    });

    propagateScriptEnvUpdates(scriptResult, request, collection);

    return { scriptResult, scriptError };
  };

  /**
   * Run the gRPC "on message" script (script.stream) for each received message.
   * Mirrors runResponseScript: takes the message as the `response` argument so the
   * user script can read it via `res` in their sandbox. Surfaces script errors to
   * the UI through the same `post-response-script-execution` event the HTTP path
   * uses, so the existing ScriptError card renders for gRPC too.
   *
   * @returns {{ scriptResult: object | null, scriptError: Error | null }}
   */
  const runOnMessageScript = async ({
    request,
    collection,
    envVars,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    requestUid,
    itemUid,
    message
  }) => {
    const onMessageScript = get(request, 'script.stream');
    if (!onMessageScript?.length) {
      return { scriptResult: null, scriptError: null };
    }

    const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
    let scriptError = null;
    let scriptResult = null;
    try {
      scriptResult = await scriptRuntime.runOnMessageScript(
        decomment(onMessageScript, { space: true }),
        request,
        message,
        envVars,
        runtimeVariables,
        collection.pathname,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        null,
        collection.name
      );
    } catch (error) {
      scriptError = error;
    }

    sendEvent('main:run-request-event', {
      type: 'on-message-script-execution',
      requestUid,
      itemUid,
      collectionUid: collection.uid,
      errorMessage: scriptError ? (scriptError.message || 'An error occurred in on-message script') : null,
      errorContext: scriptError
        ? formatErrorWithContextV2(scriptError, 'on-message', request?.script?.streamMetadata, collection.pathname)
        : null
    });

    propagateScriptEnvUpdates(scriptResult, request, collection);

    return { scriptResult, scriptError };
  };

  /**
   * Run the gRPC "after response" script (script.res) once the call terminates
   * (status / server-end / cancel / error). Mirrors HTTP's post-response: fires
   * exactly once per invocation, surfaces script errors as a `post-response-script-execution`
   * event so the existing ScriptError card renders unchanged.
   *
   * @returns {{ scriptResult: object | null, scriptError: Error | null }}
   */
  const runAfterResponseScript = async ({
    request,
    collection,
    envVars,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    requestUid,
    itemUid,
    responses
  }) => {
    const afterResponseScript = get(request, 'script.res');
    if (!afterResponseScript?.length) {
      return { scriptResult: null, scriptError: null };
    }

    const scriptRuntime = new ScriptRuntime({ runtime: scriptingConfig?.runtime });
    let scriptError = null;
    let scriptResult = null;
    try {
      scriptResult = await scriptRuntime.runResponseScript(
        decomment(afterResponseScript, { space: true }),
        request,
        { responses: responses || [] },
        envVars,
        runtimeVariables,
        collection.pathname,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        null,
        collection.name
      );
    } catch (error) {
      scriptError = error;
    }

    sendEvent('main:run-request-event', {
      type: 'post-response-script-execution',
      requestUid,
      itemUid,
      collectionUid: collection.uid,
      errorMessage: scriptError ? (scriptError.message || 'An error occurred in after-response script') : null,
      errorContext: scriptError
        ? formatErrorWithContextV2(scriptError, 'post-response', request?.script?.resMetadata, collection.pathname)
        : null
    });

    propagateScriptEnvUpdates(scriptResult, request, collection);

    return { scriptResult, scriptError };
  };

  /**
   * Run the gRPC request tests (the `tests` block) once the call terminates.
   * Mirrors the HTTP post-response test execution: runs the test source stored in
   * the .bru file against the collected responses, emits the `test-results` event,
   * and surfaces any test script error via a `test-script-execution` event so the
   * existing ScriptError card renders for gRPC too.
   *
   * @returns {{ testResults: object | null, testError: Error | null }}
   */
  const runResponseTests = async ({
    request,
    collection,
    envVars,
    runtimeVariables,
    processEnvVars,
    scriptingConfig,
    requestUid,
    itemUid,
    responses
  }) => {
    const testFile = get(request, 'tests');
    if (typeof testFile !== 'string' || !testFile.length) {
      return { testResults: null, testError: null };
    }

    const testRuntime = new TestRuntime({ runtime: scriptingConfig?.runtime });
    let testResults = null;
    let testError = null;
    try {
      testResults = await testRuntime.runTests(
        decomment(testFile, { space: true }),
        request,
        { responses: responses || [] },
        envVars,
        runtimeVariables,
        collection.pathname,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        null,
        collection.name
      );
    } catch (error) {
      testError = error;
      // Preserve any test() calls that passed before the script errored
      testResults = error.partialResults || {
        request,
        envVariables: envVars,
        runtimeVariables,
        globalEnvironmentVariables: request?.globalEnvironmentVariables || {},
        results: [],
        nextRequestName: null
      };
    }

    sendEvent('main:run-request-event', {
      type: 'test-results',
      results: testResults.results,
      requestUid,
      itemUid,
      collectionUid: collection.uid
    });

    sendEvent('main:run-request-event', {
      type: 'test-script-execution',
      requestUid,
      itemUid,
      collectionUid: collection.uid,
      errorMessage: testError ? (testError.message || 'An error occurred while executing the test script') : null,
      errorContext: testError
        ? formatErrorWithContextV2(testError, 'test', request?.testsMetadata, collection.pathname)
        : null
    });

    propagateScriptEnvUpdates(testResults, request, collection);

    return { testResults, testError };
  };

  ipcMain.handle('connections-changed', (event) => {
    sendEvent('grpc:connections-changed', event);
  });

  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables, requestUid }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables, {});

      const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
      if (!protocolRegex.test(preparedRequest.url)) {
        preparedRequest.url = `http://${preparedRequest.url}`;
      }

      const brunoConfig = getBrunoConfig(collection.uid, collection);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      scriptingConfig.runtime = getJsSandboxRuntime(collection);

      const scriptContext = {
        request: preparedRequest,
        collection,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        scriptingConfig,
        requestUid,
        itemUid: request.uid
      };

      // 1. Before Invoke — script.req
      const { scriptError: preRequestError } = await runBeforeMessageScript(scriptContext);
      if (preRequestError) {
        return { success: false, error: preRequestError.message };
      }

      let onMessageErrored = false;

      // 2. On Message — script.stream (one call per received server message)
      const onMessage = preparedRequest?.script?.stream?.length
        ? (message) => {
            runOnMessageScript({ ...scriptContext, message })
              .then(({ scriptError }) => {
                if (scriptError) onMessageErrored = true;
              })
              .catch((err) => {
                console.error('Error running gRPC on-message script:', err);
              });
          }
        : undefined;

      // 3. After Response — script.res then tests (fire once on terminal event).
      // `responses` is the full list of received messages, collected by the gRPC client.
      const hasAfterResponseScript = !!preparedRequest?.script?.res?.length;
      const afterResponseTests = get(preparedRequest, 'tests');
      const hasTests = typeof afterResponseTests === 'string' && afterResponseTests.length > 0;
      const onAfterResponse = (hasAfterResponseScript || hasTests)
        ? (responses) => {
            if (onMessageErrored) return;
            (async () => {
              if (hasAfterResponseScript) {
                await runAfterResponseScript({ ...scriptContext, responses });
              }
              if (hasTests) {
                await runResponseTests({ ...scriptContext, responses });
              }
            })().catch((err) => {
              console.error('Error running gRPC after-response script/tests:', err);
            });
          }
        : undefined;

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        collection,
        request: preparedRequest,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      });

      await configureRequest(
        preparedRequest,
        requestCopy,
        collection,
        preparedRequest.envVars,
        runtimeVariables,
        preparedRequest.processEnvVars,
        preparedRequest.promptVariables,
        certsAndProxyConfig
      );

      // Extract certificate and proxy information from the config
      const { httpsAgentRequestFields, proxyMode, proxyConfig, interpolationOptions } = certsAndProxyConfig;

      // Configure verify options
      const verifyOptions = {
        rejectUnauthorized: preferencesUtil.shouldVerifyTls()
      };

      // Extract certificate information
      const rootCertificate = httpsAgentRequestFields.ca;
      const privateKey = httpsAgentRequestFields.key;
      const certificateChain = httpsAgentRequestFields.cert;
      const passphrase = httpsAgentRequestFields.passphrase;
      const pfx = httpsAgentRequestFields.pfx;

      // Resolve proxy configuration for gRPC
      const grpcProxyConfig = await resolveGrpcProxyConfig(proxyMode, proxyConfig, preparedRequest.url, interpolationOptions);

      const requestSent = {
        type: 'request',
        url: preparedRequest.url,
        method: preparedRequest.method,
        methodType: preparedRequest.methodType,
        headers: preparedRequest.headers,
        body: preparedRequest.body,
        timestamp: Date.now(),
        proxy: {
          mode: proxyMode,
          url: grpcProxyConfig.proxyUrl || null
        }
      };

      const includeDirs = getProtobufIncludeDirs(collection);

      // Start gRPC connection with the processed request, certificates, and proxy
      await grpcClient.startConnection({
        request: preparedRequest,
        collection,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        pfx,
        verifyOptions,
        includeDirs,
        proxyConfig: grpcProxyConfig,
        onMessage,
        onAfterResponse
      });

      sendEvent('grpc:request', preparedRequest.uid, collection.uid, requestSent);

      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      if (error instanceof Error) {
        throw error;
      }
      sendEvent('grpc:error', request.uid, collection.uid, { error: error.message });
      return { success: false, error: error.message };
    }
  });

  // Get all active connection IDs
  ipcMain.handle('grpc:get-active-connections', (event) => {
    try {
      const activeConnectionIds = grpcClient.getActiveConnectionIds();
      return { success: true, activeConnectionIds };
    } catch (error) {
      console.error('Error getting active connections:', error);
      return { success: false, error: error.message, activeConnectionIds: [] };
    }
  });

  // Send a message to an existing stream
  ipcMain.handle('grpc:send-message', (event, requestId, collectionUid, message) => {
    try {
      grpcClient.sendMessage(requestId, collectionUid, message);
      sendEvent('grpc:message', requestId, collectionUid, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending gRPC message:', error);
      return { success: false, error: error.message };
    }
  });

  // End a streaming request
  ipcMain.handle('grpc:end-request', (event, params) => {
    try {
      const { requestId } = params || {};
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      grpcClient.end(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error ending gRPC stream:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel a request
  ipcMain.handle('grpc:cancel-request', (event, params) => {
    try {
      const { requestId } = params || {};
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      grpcClient.cancel(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error cancelling gRPC request:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from server reflection
  ipcMain.handle('grpc:load-methods-reflection', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables);

      const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
      if (!protocolRegex.test(preparedRequest.url)) {
        preparedRequest.url = `http://${preparedRequest.url}`;
      }

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        collection,
        request: preparedRequest,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      });

      await configureRequest(
        preparedRequest,
        requestCopy,
        collection,
        preparedRequest.envVars,
        runtimeVariables,
        preparedRequest.processEnvVars,
        preparedRequest.promptVariables,
        certsAndProxyConfig
      );

      // Extract certificate and proxy information from the config
      const { httpsAgentRequestFields, proxyMode, proxyConfig, interpolationOptions } = certsAndProxyConfig;

      // Configure verify options
      const verifyOptions = {
        rejectUnauthorized: preferencesUtil.shouldVerifyTls()
      };

      // Extract certificate information
      const rootCertificate = httpsAgentRequestFields.ca;
      const privateKey = httpsAgentRequestFields.key;
      const certificateChain = httpsAgentRequestFields.cert;
      const passphrase = httpsAgentRequestFields.passphrase;
      const pfx = httpsAgentRequestFields.pfx;

      // Resolve proxy configuration for gRPC
      const grpcProxyConfig = await resolveGrpcProxyConfig(proxyMode, proxyConfig, preparedRequest.url, interpolationOptions);

      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo
        });
      }

      const methods = await grpcClient.loadMethodsFromReflection({
        request: preparedRequest,
        collectionUid: collection.uid,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        pfx,
        verifyOptions,
        sendEvent,
        proxyConfig: grpcProxyConfig
      });

      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods)) };
    } catch (error) {
      console.error('Error loading gRPC methods from reflection:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from proto file
  ipcMain.handle('grpc:load-methods-proto', async (event, { filePath, collection }) => {
    try {
      const includeDirs = getProtobufIncludeDirs(collection);

      const methods = await grpcClient.loadMethodsFromProtoFile(filePath, includeDirs);
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods)) };
    } catch (error) {
      console.error('Error loading gRPC methods from proto file:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate a sample gRPC message based on method path
  ipcMain.handle('grpc:generate-sample-message', async (event, { methodPath, existingMessage, options = {} }) => {
    try {
      // Generate the sample message
      const result = grpcClient.generateSampleMessage(methodPath, {
        ...options,
        // Parse existing message if provided
        existingMessage: existingMessage ? safeParseJSON(existingMessage) : null
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to generate sample message'
        };
      }

      // Convert the message to a JSON string for safe transfer through IPC
      return {
        success: true,
        message: JSON.stringify(result.message, null, 2)
      };
    } catch (error) {
      console.error('Error generating gRPC sample message:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate sample message'
      };
    }
  });

  // Generate grpcurl command for a request
  ipcMain.handle('grpc:generate-grpcurl', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables, {});

      const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
      if (!protocolRegex.test(preparedRequest.url)) {
        preparedRequest.url = `http://${preparedRequest.url}`;
      }

      const interpolationOptions = {
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars
      };
      let caCertFilePath, certFilePath, keyFilePath;

      if (preferencesUtil.shouldUseCustomCaCertificate()) {
        caCertFilePath = preferencesUtil.getCustomCaCertificateFilePath();
      }

      const clientCertConfig = collection.draft?.brunoConfig ? get(collection, 'draft.brunoConfig.clientCertificates.certs', []) : get(collection, 'brunoConfig.clientCertificates.certs', []);

      for (let clientCert of clientCertConfig) {
        const domain = interpolateString(clientCert?.domain, interpolationOptions);
        const type = clientCert?.type || 'cert';
        if (domain) {
          const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/)' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
          const requestUrl = interpolateString(preparedRequest.url, interpolationOptions);
          if (requestUrl.match(hostRegex)) {
            if (type === 'cert') {
              certFilePath = interpolateString(clientCert?.certFilePath, interpolationOptions);
              certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collection.pathname, certFilePath);
              keyFilePath = interpolateString(clientCert?.keyFilePath, interpolationOptions);
              keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collection.pathname, keyFilePath);
            }
          }
        }
      }
      // Generate the grpcurl command
      const command = grpcClient.generateGrpcurlCommand({
        request: preparedRequest,
        collectionPath: collection.pathname,
        certificates: {
          ca: caCertFilePath,
          cert: certFilePath,
          key: keyFilePath
        }
      });

      return { success: true, command };
    } catch (error) {
      console.error('Error generating grpcurl command:', error);
      return { success: false, error: error.message };
    }
  });
};

// Clean up gRPC connections when all windows are closed
if (app && typeof app.on === 'function') {
  app.on('window-all-closed', () => {
    if (grpcClient && typeof grpcClient.clearAllConnections === 'function') {
      try {
        grpcClient.clearAllConnections();
      } catch (error) {
        console.error('Error clearing gRPC connections:', error);
      }
    }
  });
}

module.exports = registerGrpcEventHandlers;
module.exports.resolveGrpcProxyConfig = resolveGrpcProxyConfig;
