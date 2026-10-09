import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import SetAsVariableMenu from 'components/SetAsVariableMenu';
import SetAsVariablePopover from 'components/SetAsVariablePopover';
import { getCodeMirrorSelectionPayload } from 'utils/codemirror/selection';
import { setVarInfoSuppressed } from 'utils/codemirror/brunoVarInfo';
import { SetAsVariableContext } from './context';

const CLOSED = { view: 'closed', selection: null };

const isInsideFloatingUi = (target) => !!target?.closest?.('[data-tippy-root]');

const selectionContainsPoint = (domSelection, x, y) => {
  for (let rangeIndex = 0; rangeIndex < domSelection.rangeCount; rangeIndex++) {
    for (const rect of domSelection.getRangeAt(rangeIndex).getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true;
      }
    }
  }

  return false;
};

export function SetAsVariableProvider({ children }) {
  const [state, setState] = useState(CLOSED);
  const activeTabUid = useSelector((reduxState) => reduxState.tabs.activeTabUid);

  // A ref, so the open callbacks stay dependency-free and the context value keeps its identity.
  const activeTabUidRef = useRef(activeTabUid);
  activeTabUidRef.current = activeTabUid;

  // Syncing an imperative, non-React popup: the open callbacks suppress immediately so an
  // already-visible tooltip goes away on the same tick, and this keeps it in step afterwards.
  useEffect(() => setVarInfoSuppressed(state.view !== 'closed'), [state.view]);

  useEffect(() => {
    setState((current) => (current.selection && current.selection.tabUid !== activeTabUid ? CLOSED : current));
  }, [activeTabUid]);

  const close = useCallback(() => setState(CLOSED), []);

  const dismissMenu = useCallback(() => setState((current) => (current.view === 'menu' ? CLOSED : current)), []);

  const openFromCodeMirror = useCallback((event, editor, { collection, item } = {}) => {
    if (isInsideFloatingUi(event.target)) return;

    const payload = getCodeMirrorSelectionPayload(editor, event);
    if (!payload) return;

    event.preventDefault();
    event.stopPropagation();
    setVarInfoSuppressed(true);

    setState({
      view: 'menu',
      selection: {
        surface: 'codemirror',
        tabUid: activeTabUidRef.current,
        x: event.clientX,
        y: event.clientY,
        text: payload.text,
        from: payload.from,
        to: payload.to,
        editable: payload.editable,
        editor,
        collection,
        item
      }
    });
  }, []);

  const openFromDomSelection = useCallback((event, { collection, item } = {}) => {
    if (isInsideFloatingUi(event.target) || event.target?.closest?.('.CodeMirror')) return;

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.isCollapsed) return;

    const text = domSelection.toString();
    if (!text || !text.trim()) return;

    if (!selectionContainsPoint(domSelection, event.clientX, event.clientY)) return;

    event.preventDefault();
    setVarInfoSuppressed(true);

    setState({
      view: 'menu',
      selection: {
        surface: 'dom',
        tabUid: activeTabUidRef.current,
        x: event.clientX,
        y: event.clientY,
        text,
        from: null,
        to: null,
        editable: false,
        editor: null,
        collection,
        item
      }
    });
  }, []);

  const showPopover = useCallback(() => setState((current) => ({ ...current, view: 'popover' })), []);

  const value = useMemo(
    () => ({ openFromCodeMirror, openFromDomSelection }),
    [openFromCodeMirror, openFromDomSelection]
  );

  return (
    <SetAsVariableContext.Provider value={value}>
      {children}
      {state.view === 'menu' && state.selection.tabUid === activeTabUid ? (
        <SetAsVariableMenu selection={state.selection} onNewVariable={showPopover} onClose={dismissMenu} />
      ) : null}
      {state.view === 'popover' && state.selection.tabUid === activeTabUid ? (
        <SetAsVariablePopover selection={state.selection} onClose={close} />
      ) : null}
    </SetAsVariableContext.Provider>
  );
}

export default SetAsVariableProvider;
