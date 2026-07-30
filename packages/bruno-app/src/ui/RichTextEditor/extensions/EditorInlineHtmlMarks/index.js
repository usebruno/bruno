import { Mark, mergeAttributes } from '@tiptap/core';

const createInlineHtmlMark = (name, tag) => Mark.create({
  name,

  parseHTML() {
    return [{ tag }];
  },

  renderHTML({ HTMLAttributes }) {
    return [tag, mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: `<${tag}>`,
          close: `</${tag}>`,
          mixable: true,
          expelEnclosingWhitespace: true
        }
      }
    };
  }
});

const EditorKbd = createInlineHtmlMark('kbd', 'kbd');
const EditorSuperscript = createInlineHtmlMark('superscript', 'sup');

export { EditorKbd, EditorSuperscript };
