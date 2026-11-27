import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import createExtensions from '../index';

const DOCS = [
  '### Heading with a green apple inside',
  'Plain paragraph with a green apple inside.',
  '- A bullet item with a green apple inside.\n- Another bullet item with a blue notebook inside.',
  '1. A numbered item with a blue notebook inside.\n2. A numbered item with a green apple inside.',
  '**Bold text with a green apple inside.**',
  '*Italic text with a green apple inside.*',
  'Inline code with `a green apple inside`.',
  '```sql\nSELECT \'a green apple inside\' AS sample;\n```'
].join('\n\n');

const createEditor = (editable) =>
  new Editor({
    extensions: createExtensions().filter((ext) => !['rawHtmlBlock', 'rawHtmlTextBlock'].includes(ext.name)),
    content: DOCS,
    editable
  });

// Selects the n-th occurrence of `needle` in the document and returns what ProseMirror
// would put on the clipboard as text/plain for that selection.
const copyText = (editor, needle, occurrence = 0) => {
  const { doc } = editor.state;
  const found = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    let idx = node.text.indexOf(needle);
    while (idx !== -1) {
      found.push(pos + idx);
      idx = node.text.indexOf(needle, idx + 1);
    }
  });
  const from = found[occurrence];
  const selection = TextSelection.create(doc, from, from + needle.length);
  const { text } = editor.view.serializeForClipboard(selection.content());
  return text;
};

describe('EditorPlainTextCopy', () => {
  describe('read-only (docs preview)', () => {
    let editor;
    beforeEach(() => {
      editor = createEditor(false);
    });
    afterEach(() => editor.destroy());

    // Every "green apple" in DOCS, in document order; the fenced block is the last one.
    it.each([
      ['heading', 0],
      ['paragraph', 1],
      ['bullet item', 2],
      ['numbered item', 3],
      ['bold', 4],
      ['italic', 5],
      ['inline code', 6],
      ['code block', 7]
    ])('copies only the selected words from a %s', (_label, occurrence) => {
      expect(copyText(editor, 'green apple', occurrence)).toBe('green apple');
    });

    it('copies a selection across blocks without Markdown syntax', () => {
      const { doc } = editor.state;
      const selection = TextSelection.create(doc, 1, doc.content.size - 1);
      const { text } = editor.view.serializeForClipboard(selection.content());
      expect(text).not.toMatch(/^#|\*\*|^- |^1\. |```/m);
      expect(text).toContain('Plain paragraph with a green apple inside.');
    });
  });

  describe('editable', () => {
    it('keeps copying as Markdown', () => {
      const editor = createEditor(true);
      const { doc } = editor.state;
      const slice = TextSelection.create(doc, 1, doc.content.size - 1).content();
      const { text } = editor.view.serializeForClipboard(slice);
      editor.destroy();
      expect(text).toMatch(/^### Heading/m);
      expect(text).toContain('- A bullet item');
    });
  });

  describe('raw HTML blocks (read-only)', () => {
    it('includes the visible text of a raw HTML block between paragraphs', () => {
      const editor = new Editor({
        extensions: createExtensions(),
        content: 'First paragraph.\n\n<div><strong>green apple</strong></div>\n\nLast paragraph.',
        editable: false
      });
      let hasRawBlock = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'rawHtmlBlock') hasRawBlock = true;
      });
      const { doc } = editor.state;
      const slice = TextSelection.create(doc, 1, doc.content.size - 1).content();
      const { text } = editor.view.serializeForClipboard(slice);
      editor.destroy();
      expect(hasRawBlock).toBe(true);
      expect(text).toBe('First paragraph.\n\ngreen apple\n\nLast paragraph.');
    });

    it('keeps the line break of a br inside a raw HTML block', () => {
      const editor = new Editor({
        extensions: createExtensions(),
        content: 'First paragraph.\n\n<div>green<br>apple</div>\n\nLast paragraph.',
        editable: false
      });
      const { doc } = editor.state;
      const slice = TextSelection.create(doc, 1, doc.content.size - 1).content();
      const { text } = editor.view.serializeForClipboard(slice);
      editor.destroy();
      expect(text).toBe('First paragraph.\n\ngreen\napple\n\nLast paragraph.');
    });
  });
});
