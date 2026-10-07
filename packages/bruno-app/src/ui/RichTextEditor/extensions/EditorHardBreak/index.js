import HardBreak from '@tiptap/extension-hard-break';
import runMarkdownitSetupOnce from '../../utils/markdownitSetupOnce';

// Emitting a space instead of `\n` for soft breaks prevents ProseMirror from converting them into hard breaks during paste.
const setupSoftBreakParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsSoftBreakNormalized', (md) => {
    md.renderer.rules.softbreak = (tokens, idx, options) => (options.breaks ? '<br>' : ' ');
  });
};

const EditorHardBreak = HardBreak.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state, node, parent, index) {
          for (let i = index + 1; i < parent.childCount; i += 1) {
            if (parent.child(i).type !== node.type) {
              if (state.inTable) {
                state.write('<br/>');
              } else if (state.inListItem) {
                // Shift+Enter within a list item — markdown hard break, same paragraph
                state.write('  \n');
              } else {
                state.write('\\\n');
              }

              return;
            }
          }

          // A trailing hard break uses `<br/>` instead of a line-break escape since CommonMark trims trailing backslash/spaces at the end of a block.
          state.write('<br/>');
        },
        parse: {
          setup(markdownit) {
            setupSoftBreakParser(markdownit);
          }
        }
      }
    };
  }
});

export default EditorHardBreak;
