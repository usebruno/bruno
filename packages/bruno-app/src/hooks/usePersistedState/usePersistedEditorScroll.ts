import { useEffect, useRef, RefObject } from 'react';
import { usePersistedState } from './index';

/**
 * Persists and restores scroll position for a CodeEditor (CodeMirror) instance.
 * Uses debounced scroll events to save (not unmount), so clearPersistedScope works correctly on tab close.
 *
 * @param editorRef - ref to the CodeEditor component (editorRef.current.editor is the CodeMirror instance)
 * @param key - unique persistence key (e.g. `pre-req-scroll-${item.uid}`)
 * @returns scroll position to pass as `initialScroll` to CodeEditor
 */
export function usePersistedEditorScroll(editorRef: RefObject<any>, key: string): number {
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scroll, setScroll] = usePersistedState({ key, default: 0 });

  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    const onScroll = () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        setScroll(editor.doc.scrollTop);
      }, 300);
    };
    editor.on('scroll', onScroll);

    return () => {
      editor.off('scroll', onScroll);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editorRef, setScroll]);

  return scroll;
}
