import HardBreak from '@tiptap/extension-hard-break';

const setupSoftBreakParser = (markdownit) => {
  if (!markdownit.__docsSoftBreakNormalized) {
    const originalSoftBreak = markdownit.renderer.rules.softbreak;
    markdownit.renderer.rules.softbreak = function (tokens, idx, options, env, self) {
      if (options.breaks) {
        return '</p><p>';
      }
      if (originalSoftBreak) {
        return originalSoftBreak(tokens, idx, options, env, self);
      }
      return '\n';
    };
    markdownit.__docsSoftBreakNormalized = true;
  }
};

const DocsHardBreak = HardBreak.extend({
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

export default DocsHardBreak;
