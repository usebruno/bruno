import HardBreak from '@tiptap/extension-hard-break';
import runMarkdownitSetupOnce from '../utils/markdownitSetupOnce';

const setupSoftBreakParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsSoftBreakNormalized', (md) => {
    const originalSoftBreak = md.renderer.rules.softbreak;
    md.renderer.rules.softbreak = function (tokens, idx, options, env, self) {
      if (options.breaks) {
        return '<br>';
      }
      if (originalSoftBreak) {
        return originalSoftBreak(tokens, idx, options, env, self);
      }
      return '\n';
    };
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

          // A hard break with nothing after it (the true end of its parent, or
          // the last of a run of consecutive breaks) can't be represented as a
          // line-break escape — CommonMark trims trailing backslash/space
          // sequences at the end of a block, so it would vanish on reparse.
          // A literal inline `<br/>` survives instead, since it's parsed back
          // as raw HTML rather than relying on a following line.
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
