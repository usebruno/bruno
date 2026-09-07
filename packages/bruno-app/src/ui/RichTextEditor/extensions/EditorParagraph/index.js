import Paragraph from '@tiptap/extension-paragraph';

const EditorParagraph = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          if (node.content.size === 0) {
            state.write('<br/>');
            state.closeBlock(node);
          } else {
            state.renderInline(node);
            state.closeBlock(node);
          }
        }
      }
    };
  }
});

export default EditorParagraph;
