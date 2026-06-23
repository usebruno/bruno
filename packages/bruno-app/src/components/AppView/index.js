import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { sendNetworkRequest } from 'utils/network/index';
import {
  findEnvironmentInCollection,
  getEnvironmentVariables,
  getGlobalEnvironmentVariables
} from 'utils/collections';
import { responseReceived, appSetRuntimeVariable, toggleAppMode, initRunRequestEvent } from 'providers/ReduxStore/slices/collections';
import { uuid } from 'utils/common';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

/*
 * App content runs inside an Electron <webview>, which is an out-of-process guest
 * with its own document, so it does NOT inherit the app's strict CSP (script-src 'self')
 * This mirrors the HtmlPreview component used for HTML response previews.
 *
 * Messaging (no node integration in the guest, so postMessage/ipc aren't available):
 *   host  -> guest : webview.executeJavaScript(`window.__brunoReceive(<json>)`)
 *   guest -> host  : console.log(SENTINEL + json), read via the 'console-message' event
 */
const SENTINEL = '__BRUNO_APP_MSG__';

// Encode a value for safe inlining into an executeJavaScript() string as a JS object literal.
const toJsArg = (value) =>
  JSON.stringify(value === undefined ? null : value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

// The ctx bridge. Injected as early as possible so window.ctx exists before user scripts run.
const BOOTSTRAP_SCRIPT = `<script>
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

  // Host -> guest entry point.
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

const FRAGMENT_STYLES = `<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    background: #ffffff;
    color: #1e1e1e;
    transition: background-color 0.15s, color 0.15s;
  }
  body.dark { background: #1e1e1e; color: #e0e0e0; }
</style>`;

// User code may be a full HTML document or a fragment. For a full document we inject
// the bootstrap into it (avoids producing a malformed nested document); a fragment is
// wrapped in a minimal shell.
const generateAppHtml = (userCode) => {
  const code = userCode || '';
  const isFullDocument = /<html[\s>]/i.test(code) || /<!doctype/i.test(code);

  if (isFullDocument) {
    if (/<head[^>]*>/i.test(code)) {
      return code.replace(/<head[^>]*>/i, (m) => `${m}${BOOTSTRAP_SCRIPT}`);
    }
    if (/<body[^>]*>/i.test(code)) {
      return code.replace(/<body[^>]*>/i, (m) => `${m}${BOOTSTRAP_SCRIPT}`);
    }
    return `${BOOTSTRAP_SCRIPT}${code}`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${FRAGMENT_STYLES}
  ${BOOTSTRAP_SCRIPT}
</head>
<body>
${code}
</body>
</html>`;
};

const serializeTimeline = (timeline) => {
  if (!Array.isArray(timeline)) return timeline;
  return timeline.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp
  }));
};

const projectResponse = (r) => ({
  status: r?.status ?? null,
  statusText: r?.statusText ?? null,
  data: r?.data ?? null,
  headers: r?.headers ?? null,
  duration: r?.duration ?? null,
  size: r?.size ?? null
});

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
  const webviewRef = useRef(null);
  const [domReady, setDomReady] = useState(false);

  const src = useMemo(
    () => `data:text/html;charset=utf-8,${encodeURIComponent(generateAppHtml(code || ''))}`,
    [code]
  );

  const environment = useMemo(
    () => findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
    [collection]
  );
  const variables = useMemo(() => buildVariables(collection), [collection]);
  const response = useMemo(() => (item.response ? projectResponse(item.response) : null), [item.response]);
  const assertionResults = useMemo(() => item.assertionResults || [], [item.assertionResults]);
  const testResults = useMemo(() => item.testResults || [], [item.testResults]);

  // Push a message into the guest. Safe to call before dom-ready (no-op until then).
  const pushToGuest = useCallback((msg) => {
    const webview = webviewRef.current;
    if (!webview || !domReady) return;
    try {
      webview.executeJavaScript(`window.__brunoReceive && window.__brunoReceive(${toJsArg(msg)})`).catch(() => {});
    } catch (_) {
      /* webview not attached yet */
    }
  }, [domReady]);

  const handleSendRequest = useCallback(
    async (requestId, overrides) => {
      try {
        // Mint a requestUid and register the run so the main process emits its
        // test/assertion/script events against an id the store recognises — this is
        // what makes ctx.testResults / ctx.assertionResults populate (same as Send).
        const requestUid = uuid();
        const requestItem = cloneDeep(item.draft || item);
        requestItem.requestUid = requestUid;
        dispatch(initRunRequestEvent({ requestUid, itemUid: item.uid, collectionUid: collection.uid }));

        const flatOverrides = overrides && typeof overrides === 'object' ? { ...overrides } : {};
        const explicitVars = flatOverrides.variables;
        delete flatOverrides.variables;
        const mergedRuntime = {
          ...(collection.runtimeVariables || {}),
          ...flatOverrides,
          ...(explicitVars && typeof explicitVars === 'object' ? explicitVars : {})
        };

        const result = await sendNetworkRequest(requestItem, collection, environment, mergedRuntime);

        // sendNetworkRequest resolves (rather than rejects) on network/request
        // errors with an `error` payload — surface that to the guest as a rejection.
        if (result?.error) {
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Request failed';
          pushToGuest({ type: 'response', requestId, error: errorMessage });
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

        pushToGuest({ type: 'response', requestId, response: projectResponse(result) });
      } catch (err) {
        pushToGuest({ type: 'response', requestId, error: err?.message || 'Request failed' });
      }
    },
    [item, collection, environment, dispatch, pushToGuest]
  );

  const handleGuestMessage = useCallback(
    (data) => {
      switch (data?.type) {
        case 'ready':
          // Readiness is tracked via the webview 'dom-ready' event; nothing to do here.
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

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onConsoleMessage = (e) => {
      const text = e?.message;
      if (typeof text !== 'string' || !text.startsWith(SENTINEL)) return;
      try {
        handleGuestMessage(JSON.parse(text.slice(SENTINEL.length)));
      } catch (_) {
        /* not our message */
      }
    };
    // executeJavaScript() is only valid after Electron's 'dom-ready'; gate on that.
    // A reload (e.g. code change) tears the guest down, so reset readiness then.
    const onDomReady = () => setDomReady(true);
    const onStartLoading = () => setDomReady(false);

    webview.addEventListener('console-message', onConsoleMessage);
    webview.addEventListener('dom-ready', onDomReady);
    webview.addEventListener('did-start-loading', onStartLoading);

    return () => {
      webview.removeEventListener('console-message', onConsoleMessage);
      webview.removeEventListener('dom-ready', onDomReady);
      webview.removeEventListener('did-start-loading', onStartLoading);
    };
  }, [handleGuestMessage]);

  // Push initial state once the guest signals ready (also after a reload).
  // Push a full state snapshot on the readiness transition (initial load and after reloads).
  // Subsequent changes are handled by the granular effects below.
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
      <div className="app-webview-container">
        <webview
          ref={webviewRef}
          src={src}
          partition="persist:bruno-app-view"
          webpreferences="disableDialogs=true, javascript=yes"
          className="app-webview"
        />
      </div>
    </StyledWrapper>
  );
};

export default AppView;
