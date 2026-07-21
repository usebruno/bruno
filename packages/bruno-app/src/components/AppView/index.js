import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { sendNetworkRequest } from 'utils/network/index';
import { findEnvironmentInCollection } from 'utils/collections';
import {
  responseReceived,
  appSetRuntimeVariable,
  initRunRequestEvent
} from 'providers/ReduxStore/slices/collections';
import { updateRequestPaneTab, setTabAppPreview } from 'providers/ReduxStore/slices/tabs';
import { addLog } from 'providers/ReduxStore/slices/logs';
import { uuid } from 'utils/common';
import { useTheme } from 'providers/Theme';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import EmptyAppState from './EmptyAppState';
import { buildVariables } from './buildVariables';
import {
  SENTINEL,
  wrapHtml,
  toDataUrl,
  serializeTimeline,
  projectResponse,
  useAppWebview
} from './webview-bridge';

// Request-level ctx bootstrap. Injected into the guest so window.bru exists
// before user scripts run.
const REQUEST_CTX_BOOTSTRAP = `<script>
(function () {
  if (window.__brunoBootstrapped) return;
  window.__brunoBootstrapped = true;

  var SENTINEL = ${JSON.stringify(SENTINEL)};
  var pending = new Map();
  var nextRequestId = 0;
  var initialized = false;

  function sendToHost(payload) {
    try { console.log(SENTINEL + JSON.stringify(payload)); } catch (e) {}
  }

  var ctx = {
    theme: { name: 'light', mode: 'light', config: {} },
    assertions: [],
    tests: [],
    variables: {
      resolved: {},
      runtime: {
        set: function (name, value) {
          sendToHost({ type: 'setRuntimeVariable', key: String(name), value: value });
        }
      }
    },
    http: {
      response: null,
      onResponseChange: null
    },

    // Called once when the host delivers the initial state. ctx data arrives
    // asynchronously AFTER page load, so apps must do their first render here
    // (or in the on*Change callbacks), not at DOMContentLoaded.
    onInit: null,
    onThemeChange: null,
    onAssertionsChange: null,
    onTestsChange: null,
    onVariablesChange: null,

    submitRequest: function (options) {
      return new Promise(function (resolve, reject) {
        var requestId = ++nextRequestId;
        pending.set(requestId, { resolve: resolve, reject: reject });
        sendToHost({ type: 'sendRequest', requestId: requestId, options: options || {} });
      });
    },
    log: function () {
      var args = Array.prototype.slice.call(arguments);
      sendToHost({ type: 'log', args: args });
    }
  };

  var bru = { ctx: ctx };
  window.bru = bru;

  function applyTheme(theme) {
    ctx.theme = theme || { name: 'light', mode: 'light', config: {} };
    var mode = ctx.theme.mode || 'light';
    if (document.body) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(mode);
    }
  }

  window.__brunoReceive = function (msg) {
    if (!msg) return;
    switch (msg.type) {
      case 'state':
        applyTheme(msg.theme);
        ctx.http.response = msg.response || null;
        ctx.assertions = msg.assertionResults || [];
        ctx.tests = msg.testResults || [];
        ctx.variables.resolved = msg.variables || {};
        if (!initialized) {
          initialized = true;
          if (typeof ctx.onInit === 'function') {
            try { ctx.onInit(bru); } catch (e) { sendToHost({ type: 'log', args: ['onInit error: ' + (e && e.message)] }); }
          }
        }
        break;
      case 'theme':
        applyTheme(msg.theme);
        if (typeof ctx.onThemeChange === 'function') ctx.onThemeChange(ctx.theme);
        break;
      case 'responseUpdate':
        ctx.http.response = msg.response || null;
        if (typeof ctx.http.onResponseChange === 'function') ctx.http.onResponseChange(ctx.http.response);
        break;
      case 'results':
        ctx.assertions = msg.assertionResults || [];
        ctx.tests = msg.testResults || [];
        if (typeof ctx.onAssertionsChange === 'function') ctx.onAssertionsChange(ctx.assertions);
        if (typeof ctx.onTestsChange === 'function') ctx.onTestsChange(ctx.tests);
        break;
      case 'variables':
        ctx.variables.resolved = msg.variables || {};
        if (typeof ctx.onVariablesChange === 'function') ctx.onVariablesChange(ctx.variables);
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

const AppView = ({ item, collection, code }) => {
  const dispatch = useDispatch();
  const { displayedTheme, theme, themeVariantLight, themeVariantDark } = useTheme();
  const src = useMemo(() => toDataUrl(wrapHtml(REQUEST_CTX_BOOTSTRAP, code || '')), [code]);

  const themePayload = useMemo(
    () => ({
      name: displayedTheme === 'light' ? themeVariantLight : themeVariantDark,
      mode: displayedTheme,
      config: theme
    }),
    [displayedTheme, theme, themeVariantLight, themeVariantDark]
  );

  const environment = useMemo(
    () => findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
    [collection]
  );
  const variables = useMemo(() => buildVariables(collection, item), [collection, item]);
  const response = useMemo(() => (item.response ? projectResponse(item.response) : null), [item.response]);
  const assertionResults = useMemo(() => item.assertionResults || [], [item.assertionResults]);
  const testResults = useMemo(() => item.testResults || [], [item.testResults]);

  // pushToGuest is produced by useAppWebview, which itself needs handleGuestMessage —
  // routing through a ref lets the callbacks call the *latest* pushToGuest without
  // creating a circular useCallback dependency. Without this, the request-id reply
  // (and error reply) close over the first-render no-op pushToGuest and the guest's
  // bru.ctx.submitRequest() promise never resolves.
  const pushToGuestRef = useRef(() => {});

  const handleSendRequest = useCallback(
    async (requestId, options) => {
      const push = pushToGuestRef.current;
      try {
        // Mint a requestUid and register the run so the main process emits its
        // test/assertion/script events against an id the store recognises — this
        // is what makes ctx.tests / ctx.assertions populate.
        const requestUid = uuid();
        const requestItem = cloneDeep(item.draft || item);
        requestItem.requestUid = requestUid;
        dispatch(initRunRequestEvent({ requestUid, itemUid: item.uid, collectionUid: collection.uid }));

        const runtimeOverrides
          = options && typeof options.runtimeVariables === 'object' && options.runtimeVariables
            ? options.runtimeVariables
            : {};
        const mergedRuntime = {
          ...(collection.runtimeVariables || {}),
          ...runtimeOverrides
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
          handleSendRequest(data.requestId, data.options);
          break;
        case 'setRuntimeVariable':
          if (typeof data.key === 'string' && data.key.length) {
            dispatch(appSetRuntimeVariable({ collectionUid: collection.uid, key: data.key, value: data.value }));
          }
          break;
        case 'log':
          console.log('[app]', ...(data.args || []));
          dispatch(addLog({ type: 'log', args: ['[app]', ...(data.args || [])], timestamp: new Date().toISOString() }));
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
  stateRef.current = { theme: themePayload, response, assertionResults, testResults, variables };
  useEffect(() => {
    if (!domReady) return;
    pushToGuest({ type: 'state', ...stateRef.current });
  }, [domReady, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'theme', theme: themePayload });
  }, [themePayload, pushToGuest]);

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
    dispatch(setTabAppPreview({ uid: item.uid, appPreview: false }));
  }, [dispatch, item.uid]);

  const goToAppTab = useCallback(() => {
    dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'app' }));
    dispatch(setTabAppPreview({ uid: item.uid, appPreview: false }));
  }, [dispatch, item.uid]);

  const openAppsDocs = useCallback(() => {
    window?.ipcRenderer?.openExternal('https://link.usebruno.com/apps');
  }, []);

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
          hint="Add HTML/JS in the App tab to render a custom UI for this request."
          actions={(
            <>
              <Button
                size="sm"
                variant="filled"
                color="primary"
                onClick={goToAppTab}
                data-testid="empty-app-add-code"
              >
                Add app code
              </Button>
              <Button
                size="sm"
                variant="outline"
                color="secondary"
                onClick={openAppsDocs}
                data-testid="empty-app-learn-more"
              >
                Learn more
              </Button>
            </>
          )}
        />
      )}
    </StyledWrapper>
  );
};

export default AppView;
