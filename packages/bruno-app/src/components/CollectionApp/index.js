import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { sendNetworkRequest } from 'utils/network/index';
import {
  findEnvironmentInCollection,
  findItemInCollectionByPathname,
  flattenItems,
  isItemARequest
} from 'utils/collections';
import { uuid } from 'utils/common';
import {
  appSetRuntimeVariable,
  initRunRequestEvent,
  responseReceived,
  updateAppCode
} from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { addLog } from 'providers/ReduxStore/slices/logs';
import { useTheme } from 'providers/Theme';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { buildAiVariablesPayload, buildDocsContextFromCollection } from 'utils/ai';
import StyledWrapper from './StyledWrapper';
import EmptyAppState from '../AppView/EmptyAppState';
import { buildVariables } from '../AppView/buildVariables';
import {
  SENTINEL,
  wrapHtml,
  toDataUrl,
  serializeTimeline,
  projectResponse,
  useAppWebview
} from '../AppView/webview-bridge';

/*
 * Standalone collection-/folder-level app — a file (.bru/.yml) of type 'app'
 * that lives in the sidebar and opens as its own tab. The user toggles between
 * Code (CodeEditor) and Preview (sandboxed <webview>); preview re-runs whenever
 * the code prop changes.
 *
 * Collection ctx surface differs from the request-level AppView:
 *   shared:  theme, log, variables (.resolved / .runtime.set), onThemeChange, onVariablesChange
 *   added:   collection, listRequests(), runRequest(pathname, options?), onCollectionChange
 *   dropped: submitRequest, http.response, assertions, tests
 *             (and their on*Change hooks — they only make sense for one request)
 */

const COLLECTION_CTX_BOOTSTRAP = `<script>
(function () {
  if (window.__brunoBootstrapped) return;
  window.__brunoBootstrapped = true;

  var SENTINEL = ${JSON.stringify(SENTINEL)};
  var pending = new Map();
  var nextReplyId = 0;
  var initialized = false;

  function sendToHost(payload) {
    try { console.log(SENTINEL + JSON.stringify(payload)); } catch (e) {}
  }

  function awaitReply(type, extra) {
    return new Promise(function (resolve, reject) {
      var replyId = ++nextReplyId;
      pending.set(replyId, { resolve: resolve, reject: reject });
      sendToHost(Object.assign({ type: type, replyId: replyId }, extra || {}));
    });
  }

  var ctx = {
    theme: { name: 'light', mode: 'light', config: {} },
    collection: null,
    variables: {
      resolved: {},
      runtime: {
        set: function (name, value) {
          sendToHost({ type: 'setRuntimeVariable', key: String(name), value: value });
        }
      }
    },

    onInit: null,
    onThemeChange: null,
    onVariablesChange: null,
    onCollectionChange: null,

    listRequests: function () {
      return awaitReply('listRequests');
    },
    runRequest: function (pathname, options) {
      return awaitReply('runRequest', { pathname: String(pathname || ''), options: options || {} });
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
        ctx.variables.resolved = msg.variables || {};
        ctx.collection = msg.collection || null;
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
      case 'variables':
        ctx.variables.resolved = msg.variables || {};
        if (typeof ctx.onVariablesChange === 'function') ctx.onVariablesChange(ctx.variables);
        break;
      case 'collection':
        ctx.collection = msg.collection || null;
        if (typeof ctx.onCollectionChange === 'function') ctx.onCollectionChange(ctx.collection);
        break;
      case 'reply': {
        var entry = pending.get(msg.replyId);
        if (!entry) return;
        pending.delete(msg.replyId);
        if (msg.error) entry.reject(new Error(msg.error));
        else entry.resolve(msg.result);
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

const listRequestSummaries = (collection) =>
  flattenItems(collection?.items || [])
    .filter(isItemARequest)
    .map((it) => ({
      uid: it.uid,
      name: it.name,
      pathname: it.pathname,
      type: it.type,
      method: it.request?.method || null,
      url: it.request?.url || null
    }));

const CollectionApp = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme, theme, themeVariantLight, themeVariantDark } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [view, setView] = useState('preview');

  const themePayload = useMemo(
    () => ({
      name: displayedTheme === 'light' ? themeVariantLight : themeVariantDark,
      mode: displayedTheme,
      config: theme
    }),
    [displayedTheme, theme, themeVariantLight, themeVariantDark]
  );

  const code = item.draft ? get(item, 'draft.app.code', '') : get(item, 'app.code', '');

  // Preview HTML is keyed on the *saved* code so typing doesn't reload the guest
  // on every keystroke. The user toggles to Preview after saving to see updates.
  const src = useMemo(
    () => toDataUrl(wrapHtml(COLLECTION_CTX_BOOTSTRAP, code || '')),
    [code]
  );

  const environment = useMemo(
    () => findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
    [collection]
  );
  const variables = useMemo(() => buildVariables(collection), [collection]);
  const collectionInfo = useMemo(
    () => ({ name: collection?.name || null, pathname: collection?.pathname || null }),
    [collection?.name, collection?.pathname]
  );
  const docsContext = useMemo(() => buildDocsContextFromCollection(collection), [collection]);
  const aiVariables = useMemo(() => buildAiVariablesPayload(collection, null), [collection]);

  const onEdit = useCallback(
    (value) => dispatch(updateAppCode({ code: value, itemUid: item.uid, collectionUid: collection.uid })),
    [dispatch, item.uid, collection.uid]
  );
  const onSave = useCallback(
    () => dispatch(saveRequest(item.uid, collection.uid)),
    [dispatch, item.uid, collection.uid]
  );

  // Execute a single request by its pathname (returned earlier from listRequests).
  // Mirrors AppView.handleSendRequest: mints a requestUid, registers the run, merges
  // overrides into runtime variables, sends, and dispatches responseReceived so the
  // request's normal Response pane updates too.
  const runRequestByPath = useCallback(
    async (pathname, options) => {
      const target = findItemInCollectionByPathname(collection, pathname);
      if (!target) {
        throw new Error(`Request not found: ${pathname}`);
      }
      if (!isItemARequest(target)) {
        throw new Error(`Item is not a request: ${pathname}`);
      }

      const requestUid = uuid();
      const requestItem = cloneDeep(target.draft || target);
      requestItem.requestUid = requestUid;
      dispatch(
        initRunRequestEvent({ requestUid, itemUid: target.uid, collectionUid: collection.uid })
      );

      const runtimeOverrides
        = options && typeof options.runtimeVariables === 'object' && options.runtimeVariables
          ? options.runtimeVariables
          : {};
      const mergedRuntime = {
        ...(collection.runtimeVariables || {}),
        ...runtimeOverrides
      };

      const result = await sendNetworkRequest(requestItem, collection, environment, mergedRuntime);

      if (result?.error) {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Request failed';
        throw new Error(errorMessage);
      }

      dispatch(
        responseReceived({
          itemUid: target.uid,
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

      return projectResponse(result);
    },
    [collection, environment, dispatch]
  );

  // pushToGuest is produced by useAppWebview, which itself needs handleGuestMessage —
  // so we can't put it in handleGuestMessage's useCallback deps (circular). Instead
  // route guest replies through a ref that always points at the latest pushToGuest.
  // Without this, the callback closes over the first-render pushToGuest (which is a
  // no-op until dom-ready) and reply messages never reach the guest.
  const pushToGuestRef = useRef(() => {});

  const handleGuestMessage = useCallback(
    async (data) => {
      const push = pushToGuestRef.current;
      switch (data?.type) {
        case 'ready':
          break;
        case 'log':
          console.log('[app]', ...(data.args || []));
          dispatch(addLog({ type: 'log', args: ['[app]', ...(data.args || [])], timestamp: new Date().toISOString() }));
          break;
        case 'setRuntimeVariable':
          if (typeof data.key === 'string' && data.key.length) {
            dispatch(
              appSetRuntimeVariable({ collectionUid: collection.uid, key: data.key, value: data.value })
            );
          }
          break;
        case 'listRequests': {
          push({ type: 'reply', replyId: data.replyId, result: listRequestSummaries(collection) });
          break;
        }
        case 'runRequest': {
          try {
            const res = await runRequestByPath(data.pathname, data.options);
            push({ type: 'reply', replyId: data.replyId, result: res });
          } catch (err) {
            push({ type: 'reply', replyId: data.replyId, error: err?.message || 'runRequest failed' });
          }
          break;
        }
        default:
          break;
      }
    },
    [dispatch, collection, runRequestByPath]
  );

  const { domReady, pushToGuest, webviewRef } = useAppWebview(handleGuestMessage);
  pushToGuestRef.current = pushToGuest;

  const stateRef = useRef();
  stateRef.current = { theme: themePayload, variables, collection: collectionInfo };
  useEffect(() => {
    if (!domReady) return;
    pushToGuest({ type: 'state', ...stateRef.current });
  }, [domReady, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'theme', theme: themePayload });
  }, [themePayload, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'variables', variables });
  }, [variables, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'collection', collection: collectionInfo });
  }, [collectionInfo, pushToGuest]);

  return (
    <StyledWrapper data-testid="collection-app">
      <div className="app-toolbar">
        <span>App - {item.name}</span>
        <div className="view-toggle" data-testid="collection-app-view-toggle">
          <button
            type="button"
            data-testid="collection-app-view-code"
            className={classnames('view-btn', { active: view === 'code' })}
            onClick={() => setView('code')}
          >
            Code
          </button>
          <button
            type="button"
            data-testid="collection-app-view-preview"
            className={classnames('view-btn', { active: view === 'preview' })}
            onClick={() => setView('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {view === 'code' ? (
        <div className="app-pane code relative" data-testid="collection-app-code">
          <CodeEditor
            collection={collection}
            value={code || ''}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            onEdit={onEdit}
            onSave={onSave}
            mode="htmlmixed"
          />
          <AIAssist
            scriptType="app-collection"
            currentScript={code || ''}
            docsContext={docsContext}
            variables={aiVariables}
            onApply={onEdit}
          />
        </div>
      ) : code && code.trim().length ? (
        <div className="app-pane app-webview-container" data-testid="collection-app-preview">
          <webview
            ref={webviewRef}
            src={src}
            partition="persist:bruno-app-view"
            webpreferences="disableDialogs=true, javascript=yes"
            className="app-webview"
          />
        </div>
      ) : (
        <div className="app-pane" data-testid="collection-app-preview">
          <EmptyAppState
            title="No app yet"
            hint="Switch to Code and write some HTML/JS"
          />
        </div>
      )}
    </StyledWrapper>
  );
};

export default CollectionApp;
