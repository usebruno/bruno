import { Extension } from '@tiptap/core';
import { GapCursor, gapCursor } from '@tiptap/pm/gapcursor';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const baseGapCursorPlugin = gapCursor();

const drawGapCursor = (state) => {
  if (!(state.selection instanceof GapCursor)) {
    return null;
  }

  const node = document.createElement('div');
  node.className = 'ProseMirror-gapcursor';

  const nodeBefore = state.selection.$head.nodeBefore;
  if (nodeBefore?.type.name === 'table') {
    node.classList.add('ProseMirror-gapcursor-after-table');
  }

  return DecorationSet.create(state.doc, [
    Decoration.widget(state.selection.head, node, { key: 'gapcursor' })
  ]);
};

/**
 * Gap cursor with a vertical caret, offset below tables when exiting downward.
 */
const EditorGapCursor = Extension.create({
  name: 'docsGapCursor',

  addProseMirrorPlugins() {
    const { createSelectionBetween, handleClick, handleKeyDown, handleDOMEvents } = baseGapCursorPlugin.props;

    return [
      new Plugin({
        props: {
          decorations: drawGapCursor,
          createSelectionBetween,
          handleClick,
          handleKeyDown,
          handleDOMEvents
        }
      })
    ];
  }
});

export default EditorGapCursor;
