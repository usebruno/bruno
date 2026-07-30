import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Plugin } from '@tiptap/pm/state';
import { isSafeUrl } from 'utils/url/index';
import { setupLinkifyExtendedUrls } from '../../utils/editorMarkdownParse';

const isRelativePath = (path) => typeof path === 'string' && path.startsWith('.');

// Resolves a `./`- or `../`-prefixed docs link/image path against the collection
// directory for display only — never mutate the node/mark attribute this reads
// from, since that same attribute is what gets written back out as markdown.
// Clamped so `..` can't walk above collectionPath (no escaping the collection
// directory), and separators are normalized so a Windows collectionPath doesn't
// produce a path with mixed `\`/`/`.
const resolveRelativePath = (relativePath, collectionPath) => {
  if (!collectionPath || !isRelativePath(relativePath)) {
    return relativePath;
  }

  const baseSegments = collectionPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const stack = [...baseSegments];

  relativePath
    .replace(/\\/g, '/')
    .split('/')
    .forEach((segment) => {
      if (segment === '' || segment === '.') {
        return;
      }
      if (segment === '..') {
        if (stack.length > baseSegments.length) {
          stack.pop();
        }
        return;
      }
      stack.push(segment);
    });

  return `/${stack.join('/')}`;
};

// A NodeView only affects the live, on-screen DOM — not the schema's
// toDOM/renderHTML used when serializing (e.g. the HTML-table fallback in
// editorMarkdownSerialize.js), so `node.attrs.src` (and therefore what gets
// written back to markdown) stays the original relative path.
// http(s) and data: images are intentionally allowed through (data: because
// `allowBase64` is on, http(s) because the ticket requires remote images to
// render) — this only screens out schemes with no legitimate use as an image
// source (javascript:, vbscript:, ...), it does not attempt to stop a remote
// http(s) image from loading, which is a product trade-off, not a bug.
const resolveImageSrc = (src, collectionPath) => {
  if (!isSafeUrl(src) && !src?.startsWith('data:')) {
    return '';
  }

  return resolveRelativePath(src, collectionPath);
};

const createEditorImage = (collectionPath) => Image.extend({
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('img');

      Object.entries(this.options.HTMLAttributes || {}).forEach(([key, value]) => {
        dom.setAttribute(key, value);
      });

      if (node.attrs.alt) {
        dom.setAttribute('alt', node.attrs.alt);
      }
      if (node.attrs.title) {
        dom.setAttribute('title', node.attrs.title);
      }
      dom.setAttribute('src', resolveImageSrc(node.attrs.src, collectionPath));

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') {
            return false;
          }

          dom.setAttribute('src', resolveImageSrc(updatedNode.attrs.src, collectionPath));
          return true;
        }
      };
    };
  }
});

// Marks have no NodeView equivalent, so — unlike the image above — a relative
// href can't be resolved by keeping the schema's toDOM untouched and reading
// the resolved value from a NodeView's own DOM. Overriding renderHTML/toDOM
// directly isn't safe either: it's the same toDOM used by getHTMLFromFragment
// for the HTML-table serialization fallback (editorMarkdownSerialize.js), so
// a resolved href would get written back to markdown as an absolute local
// path, and it would also bypass the Link extension's own `isAllowedUri` href
// sanitization. Instead, rewrite the rendered `<a>` elements' `href` directly
// in the live DOM via a plugin — this only ever affects what's on screen, so
// `HTMLAttributes.href` (and therefore what's serialized) stays the original
// relative path, and the base extension's own sanitizing renderHTML is used
// unmodified.
const createEditorLink = (collectionPath) => Link.extend({
  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];

    if (!collectionPath) {
      return parentPlugins;
    }

    const resolveLinksInDom = (dom) => {
      dom.querySelectorAll('a.editor-link[href]').forEach((anchor) => {
        const resolved = resolveRelativePath(anchor.getAttribute('href'), collectionPath);
        if (resolved !== anchor.getAttribute('href')) {
          anchor.setAttribute('href', resolved);
        }
      });
    };

    return [
      ...parentPlugins,
      new Plugin({
        view(editorView) {
          resolveLinksInDom(editorView.dom);
          return {
            update: (view) => resolveLinksInDom(view.dom)
          };
        }
      })
    ];
  },
  addStorage() {
    return {
      markdown: {
        parse: {
          setup(markdownit) {
            setupLinkifyExtendedUrls(markdownit);
          }
        }
      }
    };
  }
});

export { createEditorImage, createEditorLink, resolveRelativePath };
