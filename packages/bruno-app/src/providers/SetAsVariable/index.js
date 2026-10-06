import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import SetAsVariableMenu from 'components/SetAsVariableMenu';
import SetAsVariablePopover from 'components/SetAsVariablePopover';
import { getCodeMirrorSelectionPayload } from 'utils/codemirror/selection';
import { dismissActiveVarInfoPopup } from 'utils/codemirror/brunoVarInfo';
import { SetAsVariableContext } from './context';

const CLOSED = { view: 'closed', selection: null };

const isInsideFloatingUi = (target) => !!target?.closest?.('[data-tippy-root]');

export function SetAsVariableProvider({ children }) {
  const [state, setState] = useState(CLOSED);
  const activeTabUid = useSelector((reduxState) => reduxState.tabs.activeTabUid);

  // The open callbacks are deliberately dependency-free so the context value never changes
  // identity; a ref keeps the active tab reachable from inside them without that cost.
  const activeTabUidRef = useRef(activeTabUid);
  activeTabUidRef.current = activeTabUid;

  const close = useCallback(() => setState(CLOSED), []);

  const dismissMenu = useCallback(() => setState((current) => (current.view === 'menu' ? CLOSED : current)), []);

  const openFromCodeMirror = useCallback((event, editor, { collection, item } = {}) => {
    if (isInsideFloatingUi(event.target)) return;

    const payload = getCodeMirrorSelectionPayload(editor, event);
    if (!payload) return;

    event.preventDefault();
    event.stopPropagation();
    dismissActiveVarInfoPopup();

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

    event.preventDefault();
    dismissActiveVarInfoPopup();

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
