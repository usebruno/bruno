import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import DOMPurify from 'dompurify';

// Raw HTML nodes are opaque atoms with no text children, so `textBetween` would skip them. Their visible
// text is what the node view renders: the DOMPurify-sanitized markup (same config as EditorRawHtmlBlock).
const RAW_HTML_NODE_NAMES = new Set(['rawHtmlBlock', 'rawHtmlInline']);

// Text nodes concatenate without separators, so line breaks and block boundaries are added before reading it.
const BLOCK_SELECTOR = 'address,article,aside,blockquote,dd,div,dl,dt,figcaption,figure,footer,h1,h2,h3,h4,h5,h6,header,hr,li,main,nav,ol,p,pre,section,tr,ul';

const leafText = (node) => {
  if (RAW_HTML_NODE_NAMES.has(node.type.name)) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = DOMPurify.sanitize(node.attrs.html || '', { FORBID_TAGS: ['style'] });
    wrapper.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    wrapper.querySelectorAll(BLOCK_SELECTOR).forEach((el) => el.append('\n'));
    // The stored html keeps the trailing newline of its markdown block; the block separator already supplies it.
    return (wrapper.textContent || '').replace(/\n{2,}/g, '\n').replace(/^\n+|\n+$/g, '');
  }
  const specLeafText = node.type.spec.leafText;
  return typeof specLeafText === 'function' ? specLeafText(node) : '';
};

// `Markdown` is configured with `transformCopiedText` so that copying out of the editable editor
// yields Markdown. In the read-only docs preview the user sees rendered text, so copying should give
// back the selected text without list markers, heading hashes, emphasis delimiters or code fences.
// ProseMirror asks plugins for a clipboard text serializer in order and uses the first answer, so this
// extension runs before the Markdown one and answers only while the editor is not editable.
const EditorPlainTextCopy = Extension.create({
  name: 'plainTextCopy',
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('plainTextCopy'),
        props: {
          clipboardTextSerializer: (slice) => {
            if (this.editor.isEditable) {
              return null;
            }
            return slice.content.textBetween(0, slice.content.size, '\n\n', leafText);
          }
        }
      })
    ];
  }
});

export default EditorPlainTextCopy;
