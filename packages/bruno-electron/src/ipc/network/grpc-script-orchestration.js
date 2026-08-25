const decomment = require('decomment');
const { get } = require('lodash');
const { safeParseJSON } = require('../../utils/common');
const { GrpcScriptRuntime, formatErrorWithContextV2, SCRIPT_TYPES } = require('@usebruno/js');
const { clearOauth2CredentialsByCredentialsId } = require('../../utils/oauth2');
const { applyCollectionVarsToCollectionRoot } = require('./apply-collection-vars');

const UNKNOWN_STATUS_CODE = 2;

const TERMINAL_EVENTS = ['grpc:status', 'grpc:error', 'grpc:server-end-stream', 'grpc:server-cancel-stream'];

const CALL_EVENTS = new Set([...TERMINAL_EVENTS, 'grpc:response', 'grpc:metadata', 'grpc:message']);

const applyErrorToSession = (session, error) => {
  session.statusCode = error?.code ?? UNKNOWN_STATUS_CODE;
  session.statusText = error?.details || error?.message;
  if (error?.metadata) {
    session.trailers = error.metadata;
  }
};

const applyEventToSession = (session, eventName, payload) => {
  switch (eventName) {
    case 'grpc:metadata':
      session.metadata = payload?.metadata;
      break;
    case 'grpc:message':
      session.sentMessages.push({ data: safeParseJSON(payload), timestamp: Date.now() });
      break;
    case 'grpc:response':
      if (payload?.error) {
        applyErrorToSession(session, payload.error);
      } else if (payload?.res !== undefined) {
        session.messages.push({ data: payload.res, timestamp: Date.now() });
      }
      break;
    case 'grpc:status':
      session.statusCode = payload?.status?.code;
      session.statusText = payload?.status?.details;
      if (payload?.status?.metadata) {
        session.trailers = payload.status.metadata;
      }
      break;
    case 'grpc:error':
      applyErrorToSession(session, payload?.error);
      break;
    default:
      break;
  }
};

// For Unary and server-streaming, the messages are not sent through 'grpc:message' hence the sentMessages is not populated
const buildSentMessages = (session) => {
  const { methodType } = session.request;

  if (methodType === 'client-streaming' || methodType === 'bidi-streaming') {
    return session.sentMessages;
  }

  const [firstAuthored] = get(session.request, 'body.grpc', []);

  // sent timestamp is defaulted to session's start timestamp.
  return firstAuthored ? [{ data: safeParseJSON(firstAuthored.content), timestamp: session.startedAt }] : [];
};

const buildCallResult = (session) => ({
  messages: session.messages,
  metadata: session.metadata,
  trailers: session.trailers,
  statusCode: session.statusCode ?? UNKNOWN_STATUS_CODE,
  statusText: session.statusText,
  duration: Date.now() - session.startedAt,
  url: session.request.url,
  method: session.request.method,
  methodType: session.request.methodType
});

const createGrpcScriptOrchestration = ({ sendEvent }) => {
  const callSessions = new Map();

  // Duplicated from `onConsoleLog` in ipc/network/index.js.
  const onConsoleLog = (type, args) => {
    console[type](...args);

    sendEvent('main:console-log', { type, args });
  };

  // Duplicated from `sendVariableUpdates` in ipc/network/index.js.
  const sendVariableUpdates = (result, { collectionUid, requestUid, collection }) => {
    if (result.runtimeVariables) {
      sendEvent('main:runtime-variables-update', {
        runtimeVariables: result.runtimeVariables,
        requestUid,
        collectionUid
      });
    }

    if (result.envVariables) {
      sendEvent('main:script-environment-update', {
        envVariables: result.envVariables,
        requestUid,
        collectionUid
      });
    }

    if (result.globalEnvironmentVariables) {
      sendEvent('main:global-environment-variables-update', {
        globalEnvironmentVariables: result.globalEnvironmentVariables,
        requestUid,
        collectionUid
      });
      collection.globalEnvironmentVariables = result.globalEnvironmentVariables;
    }

    if (result.collectionVariables) {
      sendEvent('main:collection-variables-update', {
        collectionVariables: result.collectionVariables,
        requestUid,
        collectionUid
      });
      applyCollectionVarsToCollectionRoot(collection, result.collectionVariables);
    }
  };

  // Duplicated from `resetOauth2Credentials` in ipc/network/index.js.
  const resetOauth2Credentials = ({ oauth2CredentialsToReset, request, collectionUid }) => {
    if (!oauth2CredentialsToReset?.length) return;
    for (const credentialId of oauth2CredentialsToReset) {
      clearOauth2CredentialsByCredentialsId({ collectionUid, credentialsId: credentialId });
      if (request?.oauth2Credentials?.credentialsId === credentialId) {
        request.oauth2Credentials = null;
      }
      const prefix = `$oauth2.${credentialId}.`;
      if (request.oauth2CredentialVariables) {
        for (const key of Object.keys(request.oauth2CredentialVariables)) {
          if (key.startsWith(prefix)) {
            delete request.oauth2CredentialVariables[key];
          }
        }
      }
      sendEvent('main:credentials-clear', { collectionUid, credentialsId: credentialId });
    }
  };

  const emitScriptError = ({ requestId, collectionUid, scriptType, error, scriptMetadata, collectionPath }) => {
    sendEvent('grpc:script-error', requestId, collectionUid, {
      scriptType,
      errorMessage: error.message || `An error occurred in ${scriptType.replace('-', ' ')} script`,
      errorContext: formatErrorWithContextV2(error, scriptType, scriptMetadata, collectionPath)
    });
  };

  const applyScriptResult = ({ scriptResult, request, collection, collectionUid, scriptType }) => {
    sendVariableUpdates(scriptResult, { collectionUid, requestUid: request.uid, collection });
    resetOauth2Credentials({
      oauth2CredentialsToReset: scriptResult.oauth2CredentialsToReset,
      request,
      collectionUid
    });

    if (scriptResult.results) {
      sendEvent('grpc:test-results', request.uid, collectionUid, {
        scriptType,
        results: scriptResult.results
      });
    }
  };

  const runBeforeCallStart = async ({ request, collection, envVars, runtimeVariables, processEnvVars, scriptingConfig }) => {
    const hookScript = get(request, 'script.beforeCallStart');
    if (!hookScript?.trim().length) return;

    const collectionUid = collection.uid;
    const scriptRuntime = new GrpcScriptRuntime({ runtime: scriptingConfig?.runtime });

    let scriptResult = null;
    let scriptError = null;

    try {
      scriptResult = await scriptRuntime.runGrpcRequestScript(
        decomment(hookScript, { space: true }),
        request,
        envVars,
        runtimeVariables,
        collection.pathname,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        collection.name
      );
    } catch (error) {
      scriptError = error;
      // Variables the hook set before throwing still have to reach the app.
      scriptResult = error.partialResults ?? null;
    }

    if (scriptResult) {
      applyScriptResult({
        scriptResult,
        request,
        collection,
        collectionUid,
        scriptType: SCRIPT_TYPES.BEFORE_CALL_START
      });
    }

    if (scriptError) {
      emitScriptError({
        requestId: request.uid,
        collectionUid,
        scriptType: SCRIPT_TYPES.BEFORE_CALL_START,
        error: scriptError,
        scriptMetadata: request.script?.beforeCallStartMetadata,
        collectionPath: collection.pathname
      });
      throw scriptError;
    }
  };

  // A call that never opens emits no terminal event, so its armed session has to be dropped by hand.
  const closeCallSession = (requestId) => callSessions.delete(requestId);

  // Only the session that still owns the key may clear it — `afterCallEnd` runs async, and a
  // re-run of the same request may have armed a fresh session under that key meanwhile.
  const closeSessionIfCurrent = (session) => {
    if (callSessions.get(session.requestId) === session) {
      closeCallSession(session.requestId);
    }
  };

  const runAfterCallEnd = async (session) => {
    const { request, collection, collectionUid } = session;
    const scriptRuntime = new GrpcScriptRuntime({ runtime: session.scriptingConfig?.runtime });

    let scriptResult = null;
    let scriptError = null;

    try {
      scriptResult = await scriptRuntime.runGrpcResponseScript(
        decomment(request.script.afterCallEnd, { space: true }),
        request,
        buildCallResult(session),
        session.envVars,
        session.runtimeVariables,
        collection.pathname,
        onConsoleLog,
        session.processEnvVars,
        session.scriptingConfig,
        collection.name,
        { sentMessages: buildSentMessages(session) }
      );
    } catch (error) {
      scriptError = error;
      scriptResult = error.partialResults ?? null;
    }

    if (scriptResult) {
      applyScriptResult({
        scriptResult,
        request,
        collection,
        collectionUid,
        scriptType: SCRIPT_TYPES.AFTER_CALL_END
      });
    }

    if (scriptError) {
      emitScriptError({
        requestId: session.requestId,
        collectionUid,
        scriptType: SCRIPT_TYPES.AFTER_CALL_END,
        error: scriptError,
        scriptMetadata: request.script?.afterCallEndMetadata,
        collectionPath: collection.pathname
      });
    }

    closeSessionIfCurrent(session);
  };

  // Arms the aggregator for a call. Must run before the connection opens.
  const openCallSession = ({ request, collection, envVars, runtimeVariables, processEnvVars, scriptingConfig }) => {
    // A request with no `afterCallEnd` gets no session
    if (!get(request, 'script.afterCallEnd')?.trim().length) return;

    callSessions.set(request.uid, {
      requestId: request.uid,
      collectionUid: collection.uid,
      collection,
      request,
      envVars,
      runtimeVariables,
      processEnvVars,
      scriptingConfig,
      startedAt: Date.now(),
      messages: [],
      sentMessages: [],
      metadata: undefined,
      trailers: undefined,
      statusCode: undefined,
      statusText: undefined,
      terminated: false
    });
  };

  // Wraps the GrpcClient event callback. Forwards to the renderer first
  const interceptGrpcEvent = (eventName, ...args) => {
    sendEvent(eventName, ...args);

    if (!CALL_EVENTS.has(eventName)) return;

    const [requestId, , payload] = args;
    const session = callSessions.get(requestId);
    if (!session) return;

    applyEventToSession(session, eventName, payload);

    if (!TERMINAL_EVENTS.includes(eventName) || session.terminated) return;

    session.terminated = true;
    // A server stream emits both `end` and `status`. Hence running 'afterCallEnd' after a tick to get trailers and status code.
    setImmediate(() => {
      runAfterCallEnd(session).catch((error) => {
        console.error('Error running gRPC afterCallEnd hook:', error);
        closeSessionIfCurrent(session);
      });
    });
  };

  const closeAllCallSessions = () => callSessions.clear();

  return { runBeforeCallStart, openCallSession, closeCallSession, interceptGrpcEvent, closeAllCallSessions };
};

module.exports = { createGrpcScriptOrchestration };
