const decomment = require('decomment');
const { get } = require('lodash');
const { safeParseJSON } = require('../../utils/common');
const { GrpcScriptRuntime, formatErrorWithContextV2 } = require('@usebruno/js');
const { SCRIPT_TYPES } = require('@usebruno/common');
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

// partial results for message hooks
const buildPartialCallResult = (session) => ({
  messages: session.messages,
  metadata: session.metadata,
  trailers: session.trailers,
  statusCode: session.statusCode,
  statusText: session.statusText,
  duration: undefined,
  url: session.request.url,
  method: session.request.method,
  methodType: session.request.methodType
});

const buildCallResult = (session) => ({
  ...buildPartialCallResult(session),
  statusCode: session.statusCode ?? UNKNOWN_STATUS_CODE,
  duration: Date.now() - session.startedAt
});

/**
 * Everything an `afterMessageReceive` run needs, frozen at the instant its message arrived.
 * Must be called synchronously from the interceptor, while the session still matches `message`.
 */
const snapshotForMessageHook = (session) => {
  const messageIndex = session.messages.length - 1;

  return {
    messageIndex,
    message: session.messages[messageIndex],
    // Copies the received messages, so a slow script cannot be handed messages that arrive while it runs.
    response: { ...buildPartialCallResult(session), messages: session.messages.slice() },
    sentMessages: buildSentMessages(session).slice()
  };
};

// hooks that need session information. BeforeCallStart is excluded since session is not armed at that point
const SESSION_HOOK_KEYS = ['afterCallEnd', 'beforeMessageSend', 'afterMessageReceive'];

const hasSessionHook = (request) =>
  SESSION_HOOK_KEYS.some((key) => get(request, `script.${key}`)?.trim().length);

// Runs the hooks in a queue for a session/request so messages and timeline are in received order.
const enqueueHook = (session, run) => {
  // Both handlers are `run` so a rejection cannot poison the chain for later messages.
  session.hookQueue = session.hookQueue.then(run, run);

  return session.hookQueue;
};

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

  const emitScriptError = ({
    requestId,
    collectionUid,
    scriptType,
    error,
    scriptMetadata,
    collectionPath,
    messageIndex
  }) => {
    const errorMessage = error.message || `An error occurred in ${scriptType.replaceAll('-', ' ')} script`;

    sendEvent('grpc:script-error', requestId, collectionUid, {
      scriptType,
      errorMessage: messageIndex === undefined ? errorMessage : `Message ${messageIndex + 1}: ${errorMessage}`,
      errorContext: formatErrorWithContextV2(error, scriptType, scriptMetadata, collectionPath),
      messageIndex
    });
  };

  const applyScriptResult = ({ scriptResult, request, collection, collectionUid, scriptType, messageIndex }) => {
    sendVariableUpdates(scriptResult, { collectionUid, requestUid: request.uid, collection });
    resetOauth2Credentials({
      oauth2CredentialsToReset: scriptResult.oauth2CredentialsToReset,
      request,
      collectionUid
    });

    if (scriptResult.results) {
      sendEvent('grpc:test-results', request.uid, collectionUid, {
        scriptType,
        results: scriptResult.results,
        messageIndex
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
      scriptResult = await scriptRuntime.runGrpcRequestScript({
        script: decomment(hookScript, { space: true }),
        request,
        envVariables: envVars,
        runtimeVariables,
        collectionPath: collection.pathname,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        collectionName: collection.name
      });
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

    if (!request.script?.afterCallEnd?.trim().length) return;

    const scriptRuntime = new GrpcScriptRuntime({ runtime: session.scriptingConfig?.runtime });

    let scriptResult = null;
    let scriptError = null;

    try {
      scriptResult = await scriptRuntime.runGrpcResponseScript({
        script: decomment(request.script.afterCallEnd, { space: true }),
        request,
        response: buildCallResult(session),
        envVariables: session.envVars,
        runtimeVariables: session.runtimeVariables,
        collectionPath: collection.pathname,
        onConsoleLog,
        processEnvVars: session.processEnvVars,
        scriptingConfig: session.scriptingConfig,
        collectionName: collection.name,
        sentMessages: buildSentMessages(session)
      });
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
  };

  /**
   * @param {object} params
   * @param {string} params.requestId
   * @param {*} params.data - The message payload about to be transmitted
   */
  const runBeforeMessageSend = ({ requestId, data }) => {
    const session = callSessions.get(requestId);
    const hookScript = get(session, 'request.script.beforeMessageSend');
    if (!hookScript?.trim().length) return Promise.resolve();

    return enqueueHook(session, async () => {
      const { request, collection, collectionUid } = session;
      const messageIndex = session.sentCount++;
      const scriptRuntime = new GrpcScriptRuntime({ runtime: session.scriptingConfig?.runtime });

      let scriptResult = null;
      let scriptError = null;

      try {
        scriptResult = await scriptRuntime.runGrpcBeforeMessageSendScript({
          script: decomment(hookScript, { space: true }),
          request,
          message: { data, timestamp: Date.now() },
          envVariables: session.envVars,
          runtimeVariables: session.runtimeVariables,
          collectionPath: collection.pathname,
          onConsoleLog,
          processEnvVars: session.processEnvVars,
          scriptingConfig: session.scriptingConfig,
          collectionName: collection.name,
          sentMessages: session.sentMessages
        });
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
          scriptType: SCRIPT_TYPES.BEFORE_MESSAGE_SEND,
          messageIndex
        });
      }

      if (scriptError) {
        emitScriptError({
          requestId: session.requestId,
          collectionUid,
          scriptType: SCRIPT_TYPES.BEFORE_MESSAGE_SEND,
          error: scriptError,
          scriptMetadata: request.script?.beforeMessageSendMetadata,
          collectionPath: collection.pathname,
          messageIndex
        });
        // Marked so the IPC handlers can answer `{ success: false }`
        scriptError.isGrpcScriptError = true;
        throw scriptError;
      }
    });
  };

  // Unlike `beforeMessageSend`, this one does not rethrow: the message has already been delivered
  // and forwarded to the renderer, so there is nothing left to abort. Errors are surfaced through
  // `grpc:script-error` and the call carries on with the remaining messages.
  const runAfterMessageReceive = (session, { messageIndex, message, response, sentMessages }) => {
    const { request, collection, collectionUid } = session;
    const scriptRuntime = new GrpcScriptRuntime({ runtime: session.scriptingConfig?.runtime });

    return (async () => {
      let scriptResult = null;
      let scriptError = null;

      try {
        scriptResult = await scriptRuntime.runGrpcAfterMessageReceiveScript({
          script: decomment(request.script.afterMessageReceive, { space: true }),
          request,
          response,
          message,
          envVariables: session.envVars,
          runtimeVariables: session.runtimeVariables,
          collectionPath: collection.pathname,
          onConsoleLog,
          processEnvVars: session.processEnvVars,
          scriptingConfig: session.scriptingConfig,
          collectionName: collection.name,
          sentMessages
        });
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
          scriptType: SCRIPT_TYPES.AFTER_MESSAGE_RECEIVE,
          messageIndex
        });
      }

      if (scriptError) {
        emitScriptError({
          requestId: session.requestId,
          collectionUid,
          scriptType: SCRIPT_TYPES.AFTER_MESSAGE_RECEIVE,
          error: scriptError,
          scriptMetadata: request.script?.afterMessageReceiveMetadata,
          collectionPath: collection.pathname,
          messageIndex
        });
      }
    })();
  };

  // Arms the aggregator for a call. Must run before the connection opens.
  const openCallSession = ({ request, collection, envVars, runtimeVariables, processEnvVars, scriptingConfig }) => {
    // A request with none of the hooks that read from the session gets no session
    if (!hasSessionHook(request)) return;

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
      terminated: false,
      hookQueue: Promise.resolve(),
      sentCount: 0
    });
  };

  // Wraps the GrpcClient event callback. Forwards to the renderer first
  const interceptGrpcEvent = (eventName, ...args) => {
    // If AfterMessageReceive transforms the received message then the ordering has to change,
    // since a message is already transferred to response pane before transformation
    sendEvent(eventName, ...args);

    if (!CALL_EVENTS.has(eventName)) return;

    const [requestId, , payload] = args;
    const session = callSessions.get(requestId);
    if (!session) return;

    applyEventToSession(session, eventName, payload);

    if (
      eventName === 'grpc:response'
      && payload?.res !== undefined
      && !payload?.error
      && session.request.script?.afterMessageReceive?.trim().length
    ) {
      // Built now, since the enqueued hook may run after messages are sent/received during the wait period.
      const snapshot = snapshotForMessageHook(session);

      enqueueHook(session, () => runAfterMessageReceive(session, snapshot))
        .catch((error) => {
          console.error('Error running gRPC afterMessageReceive hook:', error);
        });
    }

    if (!TERMINAL_EVENTS.includes(eventName) || session.terminated) return;

    session.terminated = true;
    // A server stream emits both `end` and `status`. Hence running 'afterCallEnd' after a tick to get trailers and status code.
    setImmediate(() => {
      enqueueHook(session, () => runAfterCallEnd(session))
        .catch((error) => {
          console.error('Error running gRPC afterCallEnd hook:', error);
        })
        .finally(() => closeSessionIfCurrent(session));
    });
  };

  const closeAllCallSessions = () => callSessions.clear();

  return {
    runBeforeCallStart,
    runBeforeMessageSend,
    openCallSession,
    closeCallSession,
    interceptGrpcEvent,
    closeAllCallSessions
  };
};

module.exports = { createGrpcScriptOrchestration };
