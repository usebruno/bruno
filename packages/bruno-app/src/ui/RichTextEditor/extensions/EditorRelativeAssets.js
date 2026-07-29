import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

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
      dom.setAttribute('src', resolveRelativePath(node.attrs.src, collectionPath));

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') {
            return false;
          }

          dom.setAttribute('src', resolveRelativePath(updatedNode.attrs.src, collectionPath));
          return true;
        }
      };
    };
  }
});

const createEditorLink = (collectionPath) => Link.extend({
  renderHTML({ HTMLAttributes }) {
    return ['a', { ...HTMLAttributes, href: resolveRelativePath(HTMLAttributes.href, collectionPath) }, 0];
  }
});

export { createEditorImage, createEditorLink, resolveRelativePath };
