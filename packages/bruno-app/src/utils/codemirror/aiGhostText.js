import { aiAutocomplete, cancelAiAutocomplete } from 'utils/ai';

/**
 * Inline (ghost-text) AI autocomplete for CodeMirror 5 script editors.
 *
 * Suggestion is rendered as a faded bookmark widget at the cursor:
 *   Tab           accept the whole suggestion
 *   Esc           dismiss
 *   Cmd/Ctrl+\    manually trigger (and only way to trigger in manual mode)
 *
 * Trigger modes from preferences:
 *   aggressive  -> debounce 100ms (feels keystroke-level but coalesces bursts)
 *   debounced   -> debounce 750ms (user pause before request fires)
 *   manual      -> no auto-trigger, hotkey only
 *
 * A short-lived in-flight request is cancelled on every new keystroke so we
 * don't burn provider tokens on completions the user has already typed past.
 */

const TRIGGER_DELAYS = {
  aggressive: 100,
  debounced: 750,
  manual: null
};

// Per-editor state. WeakMap so it GC's with the editor.
const STATE = new WeakMap();

const getState = (cm) => {
  let s = STATE.get(cm);
  if (!s) {
    s = {
      widget: null,
      suggestion: '',
      anchor: null, // CodeMirror position where the suggestion was placed
      timer: null,
      inflightId: null,
      // Completion-reuse cache: if the user types characters matching the
      // suggestion start, we trim the suggestion instead of refetching.
      reusePrefix: null,
      reuseSuggestion: null,
      // Local result cache by (prefix.slice(-300), suffix.slice(0, 100)).
      local: new Map(),
      destroyed: false
    };
    STATE.set(cm, s);
  }
  return s;
};

const newRequestId = () => `ac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createGhostElement = (text) => {
  const span = document.createElement('span');
  span.className = 'cm-ghost-text cm-ghost-text-ai';
  // A bare \n inside an inline span doesn't wrap — emit one <br> per newline
  // so multi-line ghost text stacks under the cursor line.
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (i > 0) span.appendChild(document.createElement('br'));
    span.appendChild(document.createTextNode(line));
  });
  return span;
};

const clearGhost = (cm, opts = {}) => {
  const s = getState(cm);
  if (s.widget) {
    s.widget.clear();
    s.widget = null;
  }
  s.suggestion = '';
  s.anchor = null;
  if (opts.clearReuse) {
    s.reusePrefix = null;
    s.reuseSuggestion = null;
  }
};

const showGhost = (cm, suggestion) => {
  if (!suggestion) return;
  clearGhost(cm);
  const s = getState(cm);
  const cursor = cm.getCursor();
  const widget = createGhostElement(suggestion);
  s.widget = cm.setBookmark(cursor, { widget, insertLeft: true });
  s.suggestion = suggestion;
  s.anchor = { line: cursor.line, ch: cursor.ch };
};

const LOCAL_CACHE_MAX = 50;
const cacheKey = (prefix, suffix) => `${prefix.slice(-300)}<>${suffix.slice(0, 100)}`;

const localCacheGet = (s, prefix, suffix) => {
  const key = cacheKey(prefix, suffix);
  if (s.local.has(key)) return s.local.get(key);

  // Prefix-based lookup — if the user has typed chars matching a previous
  // suggestion start, return the trimmed remainder.
  for (const [k, v] of s.local) {
    const [cachedPrefix] = k.split('<>');
    if (prefix.startsWith(cachedPrefix) && prefix.length > cachedPrefix.length) {
      const extra = prefix.slice(cachedPrefix.length);
      if (v.startsWith(extra)) {
        const remainder = v.slice(extra.length);
        if (remainder) return remainder;
      }
    }
  }
  return null;
};

const localCacheSet = (s, prefix, suffix, suggestion) => {
  const key = cacheKey(prefix, suffix);
  if (s.local.has(key)) s.local.delete(key);
  s.local.set(key, suggestion);
  while (s.local.size > LOCAL_CACHE_MAX) {
    s.local.delete(s.local.keys().next().value);
  }
};

/**
 * Snapshot of editor state at the moment a request was queued. Used to
 * verify the suggestion still applies when it arrives (cursor hasn't moved
 * away from the position we asked about).
 */
const snapshotPosition = (cm) => {
  const cursor = cm.getCursor();
  return { line: cursor.line, ch: cursor.ch, idx: cm.indexFromPos(cursor) };
};

const fetchAndShow = async (cm, options) => {
  if (!options.isEnabled?.()) return;

  const code = cm.getValue();
  const cursor = cm.getCursor();
  const cursorIdx = cm.indexFromPos(cursor);
  const prefix = code.slice(0, cursorIdx);
  const suffix = code.slice(cursorIdx);

  if (prefix.length < 3) return;

  // Skip if there's meaningful text after the cursor on the same line —
  // ghost-text overlap with real code reads confusingly.
  const restOfLine = cm.getLine(cursor.line).slice(cursor.ch).trim();
  if (restOfLine && !/^[)\]}"',;\s]*$/.test(restOfLine)) return;

  const s = getState(cm);

  // Local cache (instant)
  const local = localCacheGet(s, prefix, suffix);
  if (local) {
    showGhost(cm, local);
    s.reusePrefix = prefix;
    s.reuseSuggestion = local;
    return;
  }

  const ctx = options.getContext?.() || {};
  const requestId = newRequestId();
  const snapshot = snapshotPosition(cm);

  // Cancel any prior in-flight before issuing a new one.
  if (s.inflightId) cancelAiAutocomplete(s.inflightId);
  s.inflightId = requestId;

  try {
    const result = await aiAutocomplete({
      requestId,
      scriptType: options.scriptType,
      prefix,
      suffix,
      requestContext: ctx.requestContext || null,
      variableNames: ctx.variableNames || null,
      siblingScripts: ctx.siblingScripts || []
    });

    if (s.inflightId !== requestId || s.destroyed) return;
    s.inflightId = null;

    if (!result || result.cancelled || result.disabled) return;

    if (result.error) {
      // Stay quiet — autocomplete errors shouldn't toast on every keystroke.
      return;
    }

    const suggestion = result.suggestion || '';
    if (!suggestion) return;

    // Bail if the cursor moved while we were waiting.
    const nowIdx = cm.indexFromPos(cm.getCursor());
    if (nowIdx !== snapshot.idx) return;

    localCacheSet(s, prefix, suffix, suggestion);
    s.reusePrefix = prefix;
    s.reuseSuggestion = suggestion;
    showGhost(cm, suggestion);
  } catch (_err) {
    // Network/IPC errors during typing aren't surfaced.
  }
};

/**
 * If the user has typed characters that match the start of the last shown
 * suggestion, trim the suggestion and re-render instantly — no API call.
 */
const tryReuse = (cm) => {
  const s = getState(cm);
  if (!s.reusePrefix || !s.reuseSuggestion) return false;

  const cursor = cm.getCursor();
  const cursorIdx = cm.indexFromPos(cursor);
  const prefix = cm.getValue().slice(0, cursorIdx);

  if (!prefix.startsWith(s.reusePrefix)) {
    s.reusePrefix = null;
    s.reuseSuggestion = null;
    return false;
  }

  const typed = prefix.slice(s.reusePrefix.length);
  if (typed.length === 0) return false;

  if (s.reuseSuggestion.startsWith(typed)) {
    const remainder = s.reuseSuggestion.slice(typed.length);
    if (remainder) {
      showGhost(cm, remainder);
      // Update reuse anchor so subsequent typing keeps narrowing.
      s.reusePrefix = prefix;
      s.reuseSuggestion = remainder;
      return true;
    }
  }

  // Drift — the user typed something inconsistent with the suggestion.
  s.reusePrefix = null;
  s.reuseSuggestion = null;
  return false;
};

const scheduleFetch = (cm, options, immediate = false) => {
  const s = getState(cm);
  if (s.timer) {
    clearTimeout(s.timer);
    s.timer = null;
  }

  const mode = options.getTriggerMode?.() || 'debounced';
  if (mode === 'manual' && !immediate) return;

  const delay = immediate ? 0 : (TRIGGER_DELAYS[mode] ?? TRIGGER_DELAYS.debounced);
  s.timer = setTimeout(() => {
    s.timer = null;
    fetchAndShow(cm, options);
  }, delay);
};

const acceptAll = (cm) => {
  const s = getState(cm);
  if (!s.suggestion) return false;
  const text = s.suggestion;
  const cursor = cm.getCursor();
  clearGhost(cm, { clearReuse: true });
  cm.replaceRange(text, cursor, cursor, '+ai-autocomplete');
  return true;
};

const dismiss = (cm) => {
  const s = getState(cm);
  if (!s.suggestion) return false;
  clearGhost(cm, { clearReuse: true });
  if (s.inflightId) {
    cancelAiAutocomplete(s.inflightId);
    s.inflightId = null;
  }
  return true;
};

/**
 * Wire up ghost-text AI autocomplete on a CodeMirror 5 editor.
 *
 * options:
 *   scriptType        'tests' | 'pre-request' | 'post-response'
 *   getContext()      → { requestContext, variableNames, siblingScripts }
 *   isEnabled()       → boolean (AI master + autocomplete + has-model gate)
 *   getTriggerMode()  → 'aggressive' | 'debounced' | 'manual'
 *
 * Returns a cleanup function that detaches every handler and clears state.
 */
export const setupAiAutocomplete = (editor, options) => {
  if (!editor || !options || !options.scriptType) {
    return () => {};
  }

  // Drop any pending in-flight request, the answer it'd return is about a
  // cursor position we've already left. Avoids wasted provider calls and
  // stale-response races in debounced mode.
  const abortInflight = (cm) => {
    const s = getState(cm);
    if (s.inflightId) {
      cancelAiAutocomplete(s.inflightId);
      s.inflightId = null;
    }
  };

  const onChange = (cm, changeObj) => {
    // Ignore our own programmatic inserts so they don't re-fire ghost text.
    if (changeObj.origin === '+ai-autocomplete') return;
    if (changeObj.origin !== '+input' && changeObj.origin !== '+delete' && changeObj.origin !== 'paste') {
      abortInflight(cm);
      clearGhost(cm);
      return;
    }
    // Try reuse first — if it works, no network round-trip needed.
    if (tryReuse(cm)) return;
    abortInflight(cm);
    clearGhost(cm);
    scheduleFetch(cm, options);
  };

  const onCursorActivity = (cm) => {
    const s = getState(cm);
    if (!s.widget || !s.anchor) return;
    const cursor = cm.getCursor();
    if (cursor.line !== s.anchor.line || cursor.ch !== s.anchor.ch) {
      clearGhost(cm, { clearReuse: true });
    }
  };

  const onBlur = (cm) => {
    abortInflight(cm);
    clearGhost(cm, { clearReuse: true });
  };

  const onKeyDown = (cm, event) => {
    const s = getState(cm);

    // Manual trigger: Cmd/Ctrl + \
    if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
      event.preventDefault();
      event.stopPropagation();
      clearGhost(cm);
      scheduleFetch(cm, options, true);
      return;
    }

    if (!s.suggestion) return;

    if (event.key === 'Tab' && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      acceptAll(cm);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss(cm);
    }
  };

  editor.on('change', onChange);
  editor.on('cursorActivity', onCursorActivity);
  editor.on('blur', onBlur);
  editor.on('keydown', onKeyDown);

  return () => {
    const s = getState(editor);
    s.destroyed = true;
    if (s.timer) clearTimeout(s.timer);
    if (s.inflightId) cancelAiAutocomplete(s.inflightId);
    clearGhost(editor, { clearReuse: true });
    editor.off('change', onChange);
    editor.off('cursorActivity', onCursorActivity);
    editor.off('blur', onBlur);
    editor.off('keydown', onKeyDown);
  };
};
