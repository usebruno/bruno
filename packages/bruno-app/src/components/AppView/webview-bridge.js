import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Shared transport for Bruno apps that run inside an Electron <webview>:
 *   host  -> guest : webview.executeJavaScript(`window.__brunoReceive(<json>)`)
 *   guest -> host  : console.log(SENTINEL + json), surfaced via 'console-message'
 *
 * Both the request-level AppView and the standalone CollectionApp use this — they
 * differ only in the bootstrap script (which builds window.ctx) and the message
 * handler the host registers.
 */
export const SENTINEL = '__BRUNO_APP_MSG__';

// JSON-encode for safe inlining into an executeJavaScript() string literal.
// U+2028/U+2029 are legal in JSON strings but illegal as raw JS source.
export const toJsArg = (value) =>
  JSON.stringify(value === undefined ? null : value)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028]/g, '\\u2028')
    .replace(/[\u2029]/g, '\\u2029');

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

/**
 * Wrap user code into a guest document, injecting the host-supplied bootstrap
 * script as early as possible (right after <head>) so window.ctx exists before
 * any user script runs. Full HTML documents have the bootstrap injected; bare
 * fragments are placed inside a minimal shell.
 */
export const wrapHtml = (bootstrap, userCode) => {
  const code = userCode || '';
  const isFullDocument = /<html[\s>]/i.test(code) || /<!doctype/i.test(code);

  if (isFullDocument) {
    if (/<head[^>]*>/i.test(code)) {
      return code.replace(/<head[^>]*>/i, (m) => `${m}${bootstrap}`);
    }
    if (/<body[^>]*>/i.test(code)) {
      return code.replace(/<body[^>]*>/i, (m) => `${m}${bootstrap}`);
    }
    return `${bootstrap}${code}`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${FRAGMENT_STYLES}
  ${bootstrap}
</head>
<body>
${code}
</body>
</html>`;
};

export const toDataUrl = (html) =>
  `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

export const serializeTimeline = (timeline) => {
  if (!Array.isArray(timeline)) return timeline;
  return timeline.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp
  }));
};

export const projectResponse = (r) => ({
  status: r?.status ?? null,
  statusText: r?.statusText ?? null,
  data: r?.data ?? null,
  headers: r?.headers ?? null,
  duration: r?.duration ?? null,
  size: r?.size ?? null
});

/**
 * useAppWebview — manages an Electron <webview> guest and provides a typed
 * messaging channel back to the host.
 *
 *   const { domReady, pushToGuest, webviewRef } = useAppWebview(handleGuestMessage);
 *   …
 *   <webview ref={webviewRef} src={…} … />
 *
 * `webviewRef` is a **callback ref** (not an object ref). React invokes it with
 * the element on mount and with `null` on unmount, which is the only way to
 * reliably re-attach listeners when the <webview> is unmounted and remounted —
 * e.g. when CollectionApp's user toggles between Code and Preview views. An
 * object-ref + useEffect approach would not re-fire on remount because the ref
 * object's identity is stable across mounts.
 *
 * pushToGuest({…}) is a no-op until the guest's dom-ready fires (and after a
 * reload, until it fires again). Safe to call eagerly from effects.
 */
export const useAppWebview = (onGuestMessage) => {
  const [domReady, setDomReady] = useState(false);

  // Latest DOM element (for pushToGuest) and latest message handler (so the
  // listener captures fresh state without needing to be re-bound).
  const webviewElRef = useRef(null);
  const onGuestMessageRef = useRef(onGuestMessage);
  onGuestMessageRef.current = onGuestMessage;

  // Outgoing messages sent before the guest is ready are queued and flushed by
  // the dom-ready effect below. This is critical for guest scripts that call
  // promise-returning ctx APIs (e.g. ctx.listRequests) at parse time — the host
  // receives the request via console-message before Electron's `dom-ready`
  // fires, and without a queue the reply gets dropped and the promise never
  // resolves.
  const pendingOutbox = useRef([]);

  const sendToWebview = (webview, msg) => {
    try {
      webview.executeJavaScript(
        `window.__brunoReceive && window.__brunoReceive(${toJsArg(msg)})`
      ).catch(() => {});
    } catch (_) {
      /* webview not yet attached */
    }
  };

  const pushToGuest = useCallback(
    (msg) => {
      const webview = webviewElRef.current;
      if (!webview || !domReady) {
        pendingOutbox.current.push(msg);
        return;
      }
      sendToWebview(webview, msg);
    },
    [domReady]
  );

  // Flush whatever piled up while the guest was still loading.
  useEffect(() => {
    if (!domReady) return;
    const webview = webviewElRef.current;
    if (!webview) return;
    const queue = pendingOutbox.current;
    if (!queue.length) return;
    pendingOutbox.current = [];
    for (const msg of queue) sendToWebview(webview, msg);
  }, [domReady]);

  // Stable callback ref. We stash the per-element listener bag on the element
  // itself so we can clean up exactly the right listeners on unmount or replace.
  const webviewRef = useCallback((element) => {
    const prev = webviewElRef.current;
    if (prev && prev !== element) {
      const h = prev.__brunoHandlers;
      if (h) {
        prev.removeEventListener('console-message', h.onConsoleMessage);
        prev.removeEventListener('dom-ready', h.onDomReady);
        prev.removeEventListener('did-start-loading', h.onStartLoading);
        prev.__brunoHandlers = null;
      }
    }

    // Queued messages belong to the prior guest; drop them on element replace.
    pendingOutbox.current = [];

    webviewElRef.current = element || null;
    // dom-ready will fire fresh on the new element; until then pushToGuest no-ops.
    setDomReady(false);

    if (!element) return;

    const onConsoleMessage = (e) => {
      const text = e?.message;
      if (typeof text !== 'string' || !text.startsWith(SENTINEL)) return;
      try {
        onGuestMessageRef.current(JSON.parse(text.slice(SENTINEL.length)));
      } catch (_) {
        /* not our message */
      }
    };
    const onDomReady = () => setDomReady(true);
    // A reload (code edit) tears down the guest; reset readiness so the next
    // dom-ready can flip us back to true.
    const onStartLoading = () => setDomReady(false);

    element.__brunoHandlers = { onConsoleMessage, onDomReady, onStartLoading };
    element.addEventListener('console-message', onConsoleMessage);
    element.addEventListener('dom-ready', onDomReady);
    element.addEventListener('did-start-loading', onStartLoading);
  }, []);

  return { domReady, pushToGuest, webviewRef };
};
