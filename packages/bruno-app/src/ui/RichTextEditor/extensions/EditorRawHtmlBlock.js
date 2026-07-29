import { Node } from '@tiptap/core';
import DOMPurify from 'dompurify';
import runMarkdownitSetupOnce from '../utils/markdownitSetupOnce';

const RAW_HTML_BLOCK_ATTR = 'data-raw-html-block';

// A standalone `<br/>` is how an empty paragraph marks itself for
// reparse (see EditorParagraph's serializer) — treat it as an ordinary
// hard break inside an (auto-wrapped) empty paragraph, not as opaque
// raw HTML, so a blank line stays an editable paragraph on reload.
const BLANK_LINE_MARKER_PATTERN = /^<br\s*\/?>$/i;

const encodeRawHtml = (html) => {
  try {
    return btoa(unescape(encodeURIComponent(html || '')));
  } catch {
    return '';
  }
};

const decodeRawHtml = (encoded) => {
  try {
    return decodeURIComponent(escape(atob(encoded || '')));
  } catch {
    return '';
  }
};

// markdown-it's default html_block rule writes the raw HTML straight through
// to the rendered HTML string, but the editor's ProseMirror schema only knows
// how to build nodes for tags it has a parseHTML rule for — so arbitrary raw
// HTML (<details>, <video>, <iframe>, comments, …) never becomes a node and
// silently disappears. Rendering every html_block token as this placeholder
// (matched by rawHtmlBlock's parseHTML below) guarantees it always survives
// as an opaque node instead, regardless of which tag it contains.
const setupRawHtmlBlockParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsRawHtmlBlockPatched', (md) => {
    md.renderer.rules.html_block = (tokens, idx) => {
      const html = tokens[idx].content;

      if (BLANK_LINE_MARKER_PATTERN.test(html.trim())) {
        return html;
      }

      return `<div ${RAW_HTML_BLOCK_ATTR}="${encodeRawHtml(html)}"></div>`;
    };
  });
};

const EditorRawHtmlBlock = Node.create({
  name: 'rawHtmlBlock',
  group: 'block',
  atom: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      html: {
        default: ''
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${RAW_HTML_BLOCK_ATTR}]`,
        getAttrs: (element) => ({
          html: decodeRawHtml(element.getAttribute(RAW_HTML_BLOCK_ATTR))
        })
      }
    ];
  },

  renderHTML({ node }) {
    return ['div', { [RAW_HTML_BLOCK_ATTR]: encodeRawHtml(node.attrs.html) }];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'editor-raw-html-block';
      dom.contentEditable = 'false';
      dom.setAttribute(RAW_HTML_BLOCK_ATTR, encodeRawHtml(node.attrs.html));
      dom.innerHTML = DOMPurify.sanitize(node.attrs.html);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'rawHtmlBlock') {
            return false;
          }

          dom.setAttribute(RAW_HTML_BLOCK_ATTR, encodeRawHtml(updatedNode.attrs.html));
          dom.innerHTML = DOMPurify.sanitize(updatedNode.attrs.html);
          return true;
        }
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          state.write(node.attrs.html);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            setupRawHtmlBlockParser(markdownit);
          }
        }
      }
    };
  }
});

export default EditorRawHtmlBlock;
