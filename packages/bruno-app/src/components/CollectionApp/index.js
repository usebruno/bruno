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
  getEnvironmentVariables,
  getGlobalEnvironmentVariables,
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
import { useTheme } from 'providers/Theme';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { buildDocsContextFromCollection } from 'utils/ai';
import StyledWrapper from './StyledWrapper';
import EmptyAppState from '../AppView/EmptyAppState';
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
 *   shared:  theme, log, variables, setRuntimeVariable, onThemeChange, onVariablesUpdate
 *   added:   collection, listRequests(), runRequest(pathname, overrides?)
 *   dropped: sendRequest, response, assertionResults, testResults
 *             (and their on* hooks — they only make sense for one request)
 */

const COLLECTION_CTX_BOOTSTRAP = `<script>
(function () {
  if (window.__brunoBootstrapped) return;
  window.__brunoBootstrapped = true;

  var SENTINEL = ${JSON.stringify(SENTINEL)};
  var pending = new Map();
  var nextReplyId = 0;

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
    theme: 'light',
    variables: {},
    collection: null,

    onThemeChange: null,
    onVariablesUpdate: null,

    listRequests: function () {
      return awaitReply('listRequests');
    },
    runRequest: function (pathname, overrides) {
      return awaitReply('runRequest', { pathname: String(pathname || ''), overrides: overrides || {} });
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
        ctx.variables = msg.variables || {};
        ctx.collection = msg.collection || null;
        break;
      case 'theme':
        applyTheme(msg.theme);
        if (typeof ctx.onThemeChange === 'function') ctx.onThemeChange(ctx.theme);
        break;
      case 'variables':
        ctx.variables = msg.variables || {};
        if (typeof ctx.onVariablesUpdate === 'function') ctx.onVariablesUpdate(ctx.variables);
        break;
      case 'collection':
        ctx.collection = msg.collection || null;
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
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [view, setView] = useState('preview');

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
    async (pathname, overrides) => {
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

      const flat = overrides && typeof overrides === 'object' ? { ...overrides } : {};
      const explicit = flat.variables;
      delete flat.variables;
      const mergedRuntime = {
        ...(collection.runtimeVariables || {}),
        ...flat,
        ...(explicit && typeof explicit === 'object' ? explicit : {})
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
            const res = await runRequestByPath(data.pathname, data.overrides);
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
  stateRef.current = { theme: displayedTheme, variables, collection: collectionInfo };
  useEffect(() => {
    if (!domReady) return;
    pushToGuest({ type: 'state', ...stateRef.current });
  }, [domReady, pushToGuest]);

  useEffect(() => {
    pushToGuest({ type: 'theme', theme: displayedTheme });
  }, [displayedTheme, pushToGuest]);

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
