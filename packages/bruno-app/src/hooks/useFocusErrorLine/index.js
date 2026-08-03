import { useEffect, useRef } from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { clearFocusErrorLine } from 'providers/ReduxStore/slices/tabs';
import { focusErrorLine } from 'utils/codemirror/focusErrorLine';

/**
 * Subscribes a CodeMirror-hosting component to the tab's `focusErrorLine` signal.
 * When the signal targets this host's `scriptPhase`, scrolls the editor to the
 * line and flashes a red highlight that fades over ~3s. Re-firing for the same
 * line is handled via the `requestedAt` token.
 *
 * @param {object} params
 * @param {string} params.uid                        Tab uid (request/folder/collection uid)
 * @param {React.RefObject} params.editorRef         Ref to a CodeEditor component (exposes `.editor`)
 * @param {string} params.scriptPhase               'pre-request' | 'post-response' | 'test'
 * @param {boolean} [params.isVisible=true]          Whether this editor's tab is currently shown
 */
export const useFocusErrorLine = ({ uid, editorRef, scriptPhase, isVisible = true }) => {
  const dispatch = useDispatch();
  const focusErrorLineState = useSelector((state) => {
    const tab = find(state.tabs.tabs, (t) => t.uid === uid);
    return tab?.focusErrorLine || null;
  });

  const disposeRef = useRef(null);

  useEffect(() => {
    if (!focusErrorLineState || !isVisible) return;

    if (focusErrorLineState.scriptPhase !== scriptPhase) return;

    const timer = setTimeout(() => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      if (disposeRef.current) {
        disposeRef.current();
        disposeRef.current = null;
      }

      disposeRef.current = focusErrorLine(editor, focusErrorLineState.line);
      dispatch(clearFocusErrorLine({ uid }));
    }, 0);

    return () => clearTimeout(timer);
  }, [focusErrorLineState?.requestedAt, focusErrorLineState?.line, focusErrorLineState?.scriptPhase, isVisible, scriptPhase, uid]);

  useEffect(() => {
    return () => {
      if (disposeRef.current) {
        disposeRef.current();
        disposeRef.current = null;
      }
    };
  }, []);
};

export default useFocusErrorLine;
