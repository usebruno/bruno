import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { sendNetworkRequest } from 'utils/network/index';
import {
  findEnvironmentInCollection,
  getEnvironmentVariables,
  getGlobalEnvironmentVariables
} from 'utils/collections';
import {
  responseReceived,
  appSetRuntimeVariable,
  toggleAppMode,
  initRunRequestEvent
} from 'providers/ReduxStore/slices/collections';
import { uuid } from 'utils/common';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import EmptyAppState from './EmptyAppState';
import {
  SENTINEL,
  wrapHtml,
  toDataUrl,
  serializeTimeline,
  projectResponse,
  useAppWebview
} from './webview-bridge';

// Request-level ctx bootstrap. Injected into the guest so window.ctx exists
// before user scripts run.
const REQUEST_CTX_BOOTSTRAP = `<script>
(function () {
  if (window.__brunoBootstrapped) return;
  window.__brunoBootstrapped = true;

  var SENTINEL = ${JSON.stringify(SENTINEL)};
  var pending = new Map();
  var nextRequestId = 0;

  function sendToHost(payload) {
    try { console.log(SENTINEL + JSON.stringify(payload)); } catch (e) {}
  }

  var ctx = {
    theme: 'light',
    response: null,
    assertionResults: [],
    testResults: [],
    variables: {},

    onThemeChange: null,
    onResponseUpdate: null,
    onResultsUpdate: null,
    onVariablesUpdate: null,

    sendRequest: function (overrides) {
      return new Promise(function (resolve, reject) {
        var requestId = ++nextRequestId;
        pending.set(requestId, { resolve: resolve, reject: reject });
        sendToHost({ type: 'sendRequest', requestId: requestId, overrides: overrides || {} });
      });
    },
    setRuntimeVariable: function (key, value) {
      sendToHost({ type: 'setRuntimeVariable', key: String(key), value: value });
    },
    log: function () {
      var args = Array.prototype.slice.call(arguments);
      sendToHost({ type: 'log', args: args });
    }
  };
  window.ctx = ctx;

  function applyTheme(theme) {
    ctx.theme = theme || 'light';
    if (document.body) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(ctx.theme);
    }
  }

  window.__brunoReceive = function (msg) {
    if (!msg) return;
    switch (msg.type) {
      case 'state':
        applyTheme(msg.theme);
        ctx.response = msg.response || null;
        ctx.assertionResults = msg.assertionResults || [];
        ctx.testResults = msg.testResults || [];
        ctx.variables = msg.variables || {};
        break;
      case 'theme':
        applyTheme(msg.theme);
        if (typeof ctx.onThemeChange === 'function') ctx.onThemeChange(ctx.theme);
        break;
      case 'responseUpdate':
        ctx.response = msg.response || null;
        if (typeof ctx.onResponseUpdate === 'function') ctx.onResponseUpdate(ctx.response);
        break;
      case 'results':
        ctx.assertionResults = msg.assertionResults || [];
        ctx.testResults = msg.testResults || [];
        if (typeof ctx.onResultsUpdate === 'function') {
          ctx.onResultsUpdate({ assertionResults: ctx.assertionResults, testResults: ctx.testResults });
        }
        break;
      case 'variables':
        ctx.variables = msg.variables || {};
        if (typeof ctx.onVariablesUpdate === 'function') ctx.onVariablesUpdate(ctx.variables);
        break;
      case 'response': {
        var entry = pending.get(msg.requestId);
        if (!entry) return;
        pending.delete(msg.requestId);
        if (msg.error) entry.reject(new Error(msg.error));
        else entry.resolve(msg.response);
        break;
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { sendToHost({ type: 'ready' }); });
  } else {
    sendToHost({ type: 'ready' });
  }
})();
</script>`;

const buildVariables = (collection) => {
  const env = getEnvironmentVariables(collection);
  const global = getGlobalEnvironmentVariables({
    globalEnvironments: collection?.globalEnvironments || [],
    activeGlobalEnvironmentUid: collection?.activeGlobalEnvironmentUid
  });
  return {
    ...global,
    ...env,
    ...(collection?.collectionVariables || {}),
    ...(collection?.runtimeVariables || {})
  };
};

const AppView = ({ item, collection, code }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const src = useMemo(() => toDataUrl(wrapHtml(REQUEST_CTX_BOOTSTRAP, code || '')), [code]);

  const environment = useMemo(
    () => findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
    [collection]
  );
  const variables = useMemo(() => buildVariables(collection), [collection]);
  const response = useMemo(() => (item.response ? projectResponse(item.response) : null), [item.response]);
  const assertionResults = useMemo(() => item.assertionResults || [], [item.assertionResults]);
  const testResults = useMemo(() => item.testResults || [], [item.testResults]);

  // pushToGuest is produced by useAppWebview, which itself needs handleGuestMessage —
  // routing through a ref lets the callbacks call the *latest* pushToGuest without
  // creating a circular useCallback dependency. Without this, the request-id reply
  // (and error reply) close over the first-render no-op pushToGuest and the guest's
  // ctx.sendRequest() promise never resolves.
  const pushToGuestRef = useRef(() => {});

  const handleSendRequest = useCallback(
    async (requestId, overrides) => {
      const push = pushToGuestRef.current;
      try {
        // Mint a requestUid and register the run so the main process emits its
        // test/assertion/script events against an id the store recognises — this
        // is what makes ctx.testResults / ctx.assertionResults populate.
        const requestUid = uuid();
        const requestItem = cloneDeep(item.draft || item);
        requestItem.requestUid = requestUid;
        dispatch(initRunRequestEvent({ requestUid, itemUid: item.uid, collectionUid: collection.uid }));

        // Variable overrides: accept flat keys or { variables: {...} }.
        const flatOverrides = overrides && typeof overrides === 'object' ? { ...overrides } : {};
        const explicitVars = flatOverrides.variables;
        delete flatOverrides.variables;
        const mergedRuntime = {
          ...(collection.runtimeVariables || {}),
          ...flatOverrides,
          ...(explicitVars && typeof explicitVars === 'object' ? explicitVars : {})
        };

        const result = await sendNetworkRequest(requestItem, collection, environment, mergedRuntime);

        // sendNetworkRequest resolves on network/request errors with `error` set —
        // surface as a guest-side promise rejection rather than a fake success.
        if (result?.error) {
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Request failed';
          push({ type: 'response', requestId, error: errorMessage });
          return;
        }

        dispatch(
          responseReceived({
            itemUid: item.uid,
            collectionUid: collection.uid,
            response: {
              status: result.status,
              statusText: result.statusText,
              headers: result.headers,
              data: result.data,
              dataBuffer: result.dataBuffer,
              size: result.size,
              duration: result.duration,
              timeline: serializeTimeline(result.timeline)
            }
          })
        );

        push({ type: 'response', requestId, response: projectResponse(result) });
      } catch (err) {
        push({ type: 'response', requestId, error: err?.message || 'Request failed' });
      }
    },
    [item, collection, environment, dispatch]
  );

  const handleGuestMessage = useCallback(
    (data) => {
      switch (data?.type) {
        case 'ready':
          break;
        case 'sendRequest':
          handleSendRequest(data.requestId, data.overrides);
          break;
        case 'setRuntimeVariable':
          if (typeof data.key === 'string' && data.key.length) {
            dispatch(appSetRuntimeVariable({ collectionUid: collection.uid, key: data.key, value: data.value }));
          }
          break;
        case 'log':
          console.log('[app]', ...(data.args || []));
          break;
        default:
          break;
      }
    },
    [handleSendRequest, dispatch, collection.uid]
  );

  const { domReady, pushToGuest, webviewRef } = useAppWebview(handleGuestMessage);
  pushToGuestRef.current = pushToGuest;

  // Push a full state snapshot on each readiness transition. Subsequent changes
  // are handled by the granular effects below; using a ref avoids re-firing
  // this effect (which would be a needless full re-broadcast).
  const stateRef = useRef();
  stateRef.current = { theme: displayedTheme, response, assertionResults, testResults, variables };
  useEffect(() => {
    if (!domReady) return;
    pushToGuest({ type: 'state', ...stateRef.current });
  }, [domReady, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'theme', theme: displayedTheme });
  }, [displayedTheme, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'responseUpdate', response });
  }, [response, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'results', assertionResults, testResults });
  }, [assertionResults, testResults, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'variables', variables });
  }, [variables, pushToGuest]);

  const disableApp = useCallback(() => {
    dispatch(toggleAppMode({ enabled: false, itemUid: item.uid, collectionUid: collection.uid }));
  }, [dispatch, item.uid, collection.uid]);

  return (
    <StyledWrapper data-testid="app-view">
      <div className="app-view-toolbar">
        <span>App mode - {item.name}</span>
        <button type="button" className="app-exit-btn" data-testid="app-exit-button" onClick={disableApp}>
          Exit to editor
        </button>
      </div>
      {code && code.trim().length ? (
        <div className="app-webview-container">
          <webview
            ref={webviewRef}
            src={src}
            partition="persist:bruno-app-view"
            webpreferences="disableDialogs=true, javascript=yes"
            className="app-webview"
          />
        </div>
      ) : (
        <EmptyAppState
          title="No app yet"
          hint="Switch to the App tab on this request and write some HTML/JS to get started."
        />
      )}
    </StyledWrapper>
  );
};

export default AppView;
