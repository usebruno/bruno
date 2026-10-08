import { Node } from '@tiptap/core';
import DOMPurify from 'dompurify';
import runMarkdownitSetupOnce from '../../utils/markdownitSetupOnce';

const RAW_HTML_BLOCK_ATTR = 'data-raw-html-block';
const RAW_HTML_INLINE_ATTR = 'data-raw-html-inline';
const TEXT_BLOCK_TAG_ATTR = 'data-raw-html-text-block';
const ORIGINAL_HTML_ATTR = 'data-raw-html-original';

// We forbid <style> in DOMPurify to prevent untrusted docs from injecting CSS that affects the whole app UI.
const SANITIZE_CONFIG = { FORBID_TAGS: ['style'] };

// A standalone <br/> marks an empty paragraph; treating it as a hard break ensures blank lines remain editable paragraphs.
const BLANK_LINE_MARKER_PATTERN = /^<br\s*\/?>$/i;

// Recognized inline tags bypass the raw HTML atom wrapper so their dedicated parseHTML rules can still process them natively.
const RECOGNIZED_INLINE_HTML_TAGS = new Set([
  'br', 'kbd', 'sup', 'a',
  'strong', 'b', 'em', 'i', 's', 'del', 'strike', 'code'
]);

// Task list checkboxes are passed through as plain HTML since updateDOM reads them directly; all other <input> tags remain opaque raw-HTML atoms.
const TASK_LIST_CHECKBOX_PATTERN = /^<input\b[^>]*\btype=["']checkbox["']/i;

const getInlineHtmlTagName = (html) => {
  const match = html.trim().match(/^<\/?([a-zA-Z][\w-]*)/);
  return match ? match[1].toLowerCase() : null;
};

const isRecognizedInlineHtml = (html) => {
  const trimmed = html.trim();
  const tagName = getInlineHtmlTagName(trimmed);

  if (RECOGNIZED_INLINE_HTML_TAGS.has(tagName)) {
    return true;
  }

  return tagName === 'input' && TASK_LIST_CHECKBOX_PATTERN.test(trimmed);
};

// Self-contained widgets (video, forms, tables) stay fully opaque. Other block tags (div, p) can become editable text blocks if they sanitize down to plain text.
const NON_TEXT_BLOCK_TAGS = new Set([
  'video', 'audio', 'iframe', 'embed', 'object', 'canvas', 'svg',
  'source', 'track', 'map', 'area',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col',
  'form', 'input', 'button', 'select', 'option', 'optgroup', 'textarea', 'label', 'fieldset', 'legend',
  'script', 'style', 'noscript',
  'details', 'summary',
  'hr'
]);

const escapeHtmlText = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeHtmlAttrValue = (value) => escapeHtmlText(value).replace(/"/g, '&quot;');

// Reads an element's attributes into a plain object, so callers can compare/serialize them without touching the DOM.
const attributesToObject = (element, excludedNames = []) => {
  const attrs = {};
  [...element.attributes].forEach((attr) => {
    if (!excludedNames.includes(attr.name)) {
      attrs[attr.name] = attr.value;
    }
  });
  return attrs;
};

const buildAttrString = (attrs) =>
  Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeHtmlAttrValue(value)}"`)
    .join('');

// Returns the top-level element if it sanitizes down to a single wrapper with only plain text and <br>s; otherwise returns null to fall back to an opaque raw-HTML atom.
const parseSimpleTextBlockElement = (html) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = DOMPurify.sanitize(html, SANITIZE_CONFIG);

  let element = null;
  for (const node of wrapper.childNodes) {
    // Uses globalThis.Node (the DOM interface) since the module-level `Node` import above is @tiptap/core's schema Node class.
    if (node.nodeType === globalThis.Node.ELEMENT_NODE) {
      if (element) return null;
      element = node;
    } else if (node.nodeType === globalThis.Node.TEXT_NODE) {
      if (node.textContent.trim() !== '') return null;
    } else {
      return null;
    }
  }

  if (!element) {
    return null;
  }

  const hasOnlyLineBreakChildren = [...element.children].every((child) => child.tagName === 'BR');
  return hasOnlyLineBreakChildren ? element : null;
};

// Serializes text and hardBreaks for rawHtmlTextBlock, explicitly converting hardBreaks to <br> so they aren't silently dropped.
const serializeTextBlockContent = (element) => {
  let inner = '';
  element.childNodes.forEach((child) => {
    inner += child.tagName === 'BR' ? '<br>' : escapeHtmlText(child.textContent || '');
  });
  return inner;
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

// Wraps html_block tokens in placeholders to guarantee arbitrary raw HTML survives as an opaque node rather than silently disappearing during parsing.
const setupRawHtmlBlockParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsRawHtmlBlockPatched', (md) => {
    md.renderer.rules.html_block = (tokens, idx) => {
      const html = tokens[idx].content;

      if (BLANK_LINE_MARKER_PATTERN.test(html.trim())) {
        return html;
      }

      const textBlockElement = parseSimpleTextBlockElement(html);
      const tagName = textBlockElement?.tagName.toLowerCase();

      if (textBlockElement && !NON_TEXT_BLOCK_TAGS.has(tagName)) {
        const attrs = buildAttrString(attributesToObject(textBlockElement));
        // The trailing newline(s) markdown-it includes at the end of an html_block token aren't part of the tag itself.
        const originalHtml = encodeRawHtml(html.replace(/\n+$/, ''));

        return `<${tagName} ${TEXT_BLOCK_TAG_ATTR}="${tagName}" ${ORIGINAL_HTML_ATTR}="${originalHtml}"${attrs}>${serializeTextBlockContent(textBlockElement)}</${tagName}>`;
      }

      return `<div ${RAW_HTML_BLOCK_ATTR}="${encodeRawHtml(html)}"></div>`;
    };
  });
};

// Wraps html_inline tokens in placeholders so unrecognized inline tags survive as opaque nodes rather than silently disappearing.
const setupRawHtmlInlineParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsRawHtmlInlinePatched', (md) => {
    md.renderer.rules.html_inline = (tokens, idx) => {
      const html = tokens[idx].content;

      if (isRecognizedInlineHtml(html)) {
        return html;
      }

      return `<span ${RAW_HTML_INLINE_ATTR}="${encodeRawHtml(html)}"></span>`;
    };
  });
};

// Shared factory for raw HTML nodes, as block and inline placeholders only differ in tags, attributes, and markdown wiring.
const createRawHtmlNode = ({ name, tag, attr, className, schemaOptions, serialize, setupParser }) =>
  Node.create({
    name,
    ...schemaOptions,

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
  schemaOptions: {
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
  schemaOptions: {
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

// Resolves the ORIGINAL_HTML_ATTR payload to trusted original bytes, or null if it's missing, unparseable, or doesn't
// describe the same tag/attributes we already sanitized — guarding against a pasted element smuggling an unrelated
// payload through this bookkeeping attribute for verbatim output on serialize.
const resolveOriginalHtml = (encodedOriginal, tag, htmlAttrs) => {
  if (!encodedOriginal) {
    return null;
  }

  const decoded = decodeRawHtml(encodedOriginal);
  const reparsed = parseSimpleTextBlockElement(decoded);
  if (!reparsed || reparsed.tagName.toLowerCase() !== tag) {
    return null;
  }

  const reparsedAttrs = attributesToObject(reparsed);
  const attrNames = Object.keys(htmlAttrs);
  const attrsMatch = attrNames.length === Object.keys(reparsedAttrs).length
    && attrNames.every((name) => reparsedAttrs[name] === htmlAttrs[name]);

  return attrsMatch ? decoded : null;
};

// Editable HTML block that sanitizes to plain text. The original tag and attributes are preserved on the node to ensure they round-trip properly.
export const EditorRawHtmlTextBlock = Node.create({
  name: 'rawHtmlTextBlock',
  group: 'block',
  // Allows text and hardBreak so Shift+Enter works, but excludes marks. Not isolated to allow HardBreak's command to insert line breaks.
  content: '(text|hardBreak)*',
  marks: '',

  addAttributes() {
    return {
      tag: {
        default: 'div'
      },
      htmlAttrs: {
        default: {}
      },
      // Exact source bytes this block was parsed from, if any — lets serialize reproduce a legacy doc's
      // formatting untouched (quotes, tag case, entities) for blocks the user never actually edited.
      originalHtml: {
        default: null
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: `[${TEXT_BLOCK_TAG_ATTR}]`,
        // Uses high priority so this rule claims marked text blocks before native node rules (like paragraph's <p>) strip their attributes.
        priority: 1000,
        // This rule also matches arbitrary pasted HTML (not just our own generated markup), so attributes are
        // re-derived through the same DOMPurify sanitization as the markdown path rather than trusted as-is.
        getAttrs: (element) => {
          const tag = (element.getAttribute(TEXT_BLOCK_TAG_ATTR) || element.tagName.toLowerCase()).toLowerCase();
          if (NON_TEXT_BLOCK_TAGS.has(tag)) {
            return false;
          }

          const sanitized = parseSimpleTextBlockElement(element.outerHTML);
          if (!sanitized) {
            return false;
          }

          const htmlAttrs = attributesToObject(sanitized, [TEXT_BLOCK_TAG_ATTR, ORIGINAL_HTML_ATTR]);
          const originalHtml = resolveOriginalHtml(sanitized.getAttribute(ORIGINAL_HTML_ATTR), tag, htmlAttrs);

          return { tag, htmlAttrs, originalHtml };
        }
      }
    ];
  },

  renderHTML({ node }) {
    return [node.attrs.tag, { [TEXT_BLOCK_TAG_ATTR]: node.attrs.tag, ...node.attrs.htmlAttrs }, 0];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const { tag, htmlAttrs, originalHtml } = node.attrs;

          let inner = '';
          node.forEach((child) => {
            inner += child.type.name === 'hardBreak' ? '<br>' : escapeHtmlText(child.text || '');
          });

          const originalElement = originalHtml ? parseSimpleTextBlockElement(originalHtml) : null;
          const isUnedited = originalElement && serializeTextBlockContent(originalElement) === inner;

          state.write(isUnedited ? originalHtml : `<${tag}${buildAttrString(htmlAttrs)}>${inner}</${tag}>`);
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
