import { Node } from '@tiptap/core';
import DOMPurify from 'dompurify';
import runMarkdownitSetupOnce from '../../utils/markdownitSetupOnce';

const RAW_HTML_BLOCK_ATTR = 'data-raw-html-block';
const RAW_HTML_INLINE_ATTR = 'data-raw-html-inline';

// This raw HTML is rendered straight into the page via `innerHTML`, not a
// contained iframe/shadow DOM, so DOMPurify's default allowlist (which
// permits <style>) would let an untrusted collection's docs inject CSS rules
// that affect the whole app UI, not just this block.
const SANITIZE_CONFIG = { FORBID_TAGS: ['style'] };

// A standalone `<br/>` is how an empty paragraph marks itself for
// reparse (see EditorParagraph's serializer) — treat it as an ordinary
// hard break inside an (auto-wrapped) empty paragraph, not as opaque
// raw HTML, so a blank line stays an editable paragraph on reload.
const BLANK_LINE_MARKER_PATTERN = /^<br\s*\/?>$/i;

// These inline tags are already consumed by something else in the pipeline
// before an unrecognized tag would need to fall back to an opaque raw-HTML
// atom: `br` -> EditorHardBreak, `kbd`/`sup` -> EditorInlineHtmlMarks (both
// via their own parseHTML rule matching the literal tag), and `input` -> the
// task-list checkbox that markdown-it-task-lists renders as inline HTML and
// editorMarkdownParse's updateDOM reads directly off the DOM. Matching by tag
// name (not the full tag string) so this still applies regardless of the
// attributes markdown-it-task-lists puts on a given checkbox.
const RECOGNIZED_INLINE_HTML_TAGS = new Set(['br', 'kbd', 'sup', 'input']);

const getInlineHtmlTagName = (html) => {
  const match = html.trim().match(/^<\/?([a-zA-Z][\w-]*)/);
  return match ? match[1].toLowerCase() : null;
};

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

// Same rationale as setupRawHtmlBlockParser, but for inline HTML (<u>,
// <span>, <mark>, <abbr>, …) that markdown-it tokenizes as html_inline —
// without this, those tags have no schema mapping and silently disappear.
// Registered separately from the block version (its own runMarkdownitSetupOnce
// key) so each raw-HTML node only patches the renderer rule it actually needs.
const setupRawHtmlInlineParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsRawHtmlInlinePatched', (md) => {
    md.renderer.rules.html_inline = (tokens, idx) => {
      const html = tokens[idx].content;

      if (RECOGNIZED_INLINE_HTML_TAGS.has(getInlineHtmlTagName(html))) {
        return html;
      }

      return `<span ${RAW_HTML_INLINE_ATTR}="${encodeRawHtml(html)}"></span>`;
    };
  });
};

// The block- and inline-level raw-HTML placeholders only differ in their tag,
// attribute, grouping, and markdown wiring — everything else (encode/decode,
// sanitized node view, update handling) is identical.
const createRawHtmlNode = ({ name, tag, attr, className, extra, serialize, setupParser }) =>
  Node.create({
    name,
    ...extra,

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
          tag: `${tag}[${attr}]`,
          getAttrs: (element) => ({
            html: decodeRawHtml(element.getAttribute(attr))
          })
        }
      ];
    },

    renderHTML({ node }) {
      return [tag, { [attr]: encodeRawHtml(node.attrs.html) }];
    },

    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement(tag);
        dom.className = className;
        dom.contentEditable = 'false';
        dom.setAttribute(attr, encodeRawHtml(node.attrs.html));
        dom.innerHTML = DOMPurify.sanitize(node.attrs.html, SANITIZE_CONFIG);

        return {
          dom,
          update: (updatedNode) => {
            if (updatedNode.type.name !== name) {
              return false;
            }

            dom.setAttribute(attr, encodeRawHtml(updatedNode.attrs.html));
            dom.innerHTML = DOMPurify.sanitize(updatedNode.attrs.html, SANITIZE_CONFIG);
            return true;
          }
        };
      };
    },

    addStorage() {
      return {
        markdown: {
          serialize,
          parse: {
            setup: setupParser
          }
        }
      };
    }
  });

const EditorRawHtmlBlock = createRawHtmlNode({
  name: 'rawHtmlBlock',
  tag: 'div',
  attr: RAW_HTML_BLOCK_ATTR,
  className: 'editor-raw-html-block',
  extra: {
    group: 'block',
    atom: true,
    selectable: true,
    isolating: true
  },
  serialize(state, node) {
    state.write(node.attrs.html);
    state.closeBlock(node);
  },
  setupParser: setupRawHtmlBlockParser
});

export const EditorRawHtmlInline = createRawHtmlNode({
  name: 'rawHtmlInline',
  tag: 'span',
  attr: RAW_HTML_INLINE_ATTR,
  className: 'editor-raw-html-inline',
  extra: {
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true
  },
  serialize(state, node) {
    state.write(node.attrs.html);
  },
  setupParser: setupRawHtmlInlineParser
});

export default EditorRawHtmlBlock;
