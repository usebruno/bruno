import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import SetAsVariableMenu from 'components/SetAsVariableMenu';
import SetAsVariablePopover from 'components/SetAsVariablePopover';
import { getCodeMirrorSelectionPayload, getPinnedSelection, releasePinnedSelection } from 'utils/codemirror/selection';
import { setVarInfoSuppressed } from 'utils/codemirror/brunoVarInfo';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { supportsSetAsVariable } from 'utils/requests/setAsVariableSupport';
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
  const store = useStore();
  const activeTabUid = useSelector((reduxState) => reduxState.tabs.activeTabUid);

  const activeTabUidRef = useRef(activeTabUid);
  activeTabUidRef.current = activeTabUid;

  // Reading the settled view, because picking a menu item opens the popover and dismisses the
  // menu in the same tick — releasing from either handler would unpin a selection still in use.
  useEffect(() => {
    const open = state.view !== 'closed';
    setVarInfoSuppressed(open);
    if (!open) releasePinnedSelection();
  }, [state.view]);

  useEffect(() => {
    setState((current) => (current.selection && current.selection.tabUid !== activeTabUid ? CLOSED : current));
  }, [activeTabUid]);

  const resolveRequestItem = useCallback((item) => {
    if (item) return item;

    const reduxState = store.getState();
    const tabUid = activeTabUidRef.current;
    const tab = reduxState.tabs.tabs.find((candidate) => candidate.uid === tabUid);
    if (!tab) return null;

    const collection = findCollectionByUid(reduxState.collections.collections, tab.collectionUid);
    return collection ? findItemInCollection(collection, tabUid) : null;
  }, [store]);

  const close = useCallback(() => setState(CLOSED), []);

  const dismissMenu = useCallback(() => setState((current) => (current.view === 'menu' ? CLOSED : current)), []);

  const openFromCodeMirror = useCallback((event, editor, { collection, item, mode } = {}) => {
    if (isInsideFloatingUi(event.target)) {
      releasePinnedSelection();
      return;
    }

    if (!supportsSetAsVariable(resolveRequestItem(item))) {
      releasePinnedSelection();
      return;
    }

    const payload = getPinnedSelection(editor) || getCodeMirrorSelectionPayload(editor, event);
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
        mode,
        editor,
        collection,
        item
      }
    });
  }, [resolveRequestItem]);

  const openFromDomSelection = useCallback((event, { collection, item } = {}) => {
    if (isInsideFloatingUi(event.target) || event.target?.closest?.('.CodeMirror')) return;

    if (!supportsSetAsVariable(resolveRequestItem(item))) return;

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
  }, [resolveRequestItem]);

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
