/*
 * CodeEditor view-state persistence — extracted for testability.
 *
 * Why this exists:
 * Every tab switch causes CodeMirror's setValue() to wipe folds, cursor,
 * selection, undo history, and scroll position. To preserve them, we serialize
 * the relevant pieces to localStorage under a stable key for each editor and
 * re-apply them on mount / tab switch. CodeMirror exposes a JSON-serializable
 * representation of its undo stack via getHistory()/setHistory(), which is what
 * makes Cmd-Z continue working across switches.
 *
 * Note: we deliberately do NOT persist the content itself — the canonical value
 * lives in Redux (props.value). We only persist the editor's "view" state on
 * top of that content. If content has drifted between save and restore, fold
 * positions are applied leniently (foldCode silently no-ops on invalid lines)
 * and history is skipped to avoid an inconsistent undo stack.
 */

export const STORAGE_PREFIX = 'persisted::codeeditor::';

// Identifies which Doc state belongs to a given CodeEditor instance.
//
// Callers can pass an explicit `docKey` prop when the auto-derived key would
// collide — e.g. Pre-Request vs Post-Response script editors share the same
// item/mode/readOnly and need an extra disambiguator.
//
// Auto-derived parts:
//   id       — distinguishes different tabs (requests or collections)
//   mode     — distinguishes editors within the same tab (e.g. JSON body vs JS script)
//   readOnly — distinguishes response viewer (ro) from body editor (rw) when modes match
export const getDocKey = (props) => {
  if (props.docKey) return props.docKey;
  const id = props.item?.uid || props.collection?.uid || 'default';
  const mode = props.mode || 'default';
  const readOnly = props.readOnly ? 'ro' : 'rw';
  return `${id}:${mode}:${readOnly}`;
};

export const readPersistedEditorState = (key) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writePersistedEditorState = (key, state) => {
  try {
    if (state == null) {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } else {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
    }
  } catch {
    // localStorage may be unavailable or full (Chromium ~10 MB cap). Editor
    // state is non-critical — content lives in Redux — so silently ignore.
  }
};

// Tab UIDs that were just cleared by the closeTabs thunk. componentWillUnmount
// checks this set to avoid re-writing the entry it was about to delete: when a
// tab closes, the thunk runs first (clears localStorage) and React unmounts
// the CodeEditor afterward — without this guard, the unmount would re-save
// state under the same key and the cleanup would be undone.
const recentlyClearedTabUids = new Set();

export const isTabRecentlyCleared = (tabUid) =>
  Boolean(tabUid) && recentlyClearedTabUids.has(tabUid);

// Removes every persisted CodeEditor entry whose docKey starts with `${tabUid}:`.
// Called from the closeTabs thunk so a closed tab doesn't leak its editor state
// (folds, history, cursor, scroll) in localStorage forever.
export const clearCodeEditorPersistedState = (tabUid) => {
  if (!tabUid) return;
  recentlyClearedTabUids.add(tabUid);
  try {
    const prefix = `${STORAGE_PREFIX}${tabUid}:`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be unavailable — silently ignore
  }
  // Drop the marker after React has had a chance to unmount the CodeEditor and
  // call componentWillUnmount. 1s is generous — unmount typically fires in <1ms.
  setTimeout(() => recentlyClearedTabUids.delete(tabUid), 1000);
};

export const captureEditorState = (editor) => {
  if (!editor) return null;
  const doc = editor.getDoc();
  const folds = editor
    .getAllMarks()
    .filter((m) => m.__isFold)
    .map((m) => m.find())
    .filter(Boolean)
    .map((range) => range.from);
  return {
    contentLength: doc.getValue().length,
    cursor: doc.getCursor(),
    selections: doc.listSelections(),
    history: doc.getHistory(),
    folds,
    scrollY: editor.getScrollInfo().top
  };
};

export const applyEditorState = (editor, state, currentContent) => {
  if (!editor || !state) return;
  const doc = editor.getDoc();
  const contentMatches = state.contentLength === (currentContent || '').length;

  // History/cursor/selection only make sense if content didn't drift — applying
  // a stale undo stack to different content would let Cmd-Z replay edits that
  // no longer correspond to anything visible.
  if (contentMatches) {
    if (state.history) {
      try { doc.setHistory(state.history); } catch {}
    }
    if (state.cursor) {
      try { doc.setCursor(state.cursor); } catch {}
    }
    if (state.selections && state.selections.length) {
      try { doc.setSelections(state.selections); } catch {}
    }
  }
  // Folds are cheap and lenient — try them either way.
  if (state.folds && state.folds.length) {
    editor.operation(() => {
      state.folds.forEach((from) => {
        try { editor.foldCode(from); } catch {}
      });
    });
  }
  if (state.scrollY != null) {
    try { editor.scrollTo(null, state.scrollY); } catch {}
  }
};

// Test-only — resets internal state between tests.
export const __resetForTests = () => {
  recentlyClearedTabUids.clear();
};
