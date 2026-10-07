import { Editor } from '@tiptap/core';
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model';
import createExtensions from '../extensions';

// Mirrors what ProseMirror's own paste handling does with clipboard HTML: parses a raw DOM
// element straight through the schema's parseHTML rules, bypassing the markdown-it pipeline
// (and its DOMPurify sanitization) entirely.
const parsePastedHtml = (editor, html) => {
  const dom = document.createElement('div');
  dom.innerHTML = html;
  return ProseMirrorDOMParser.fromSchema(editor.schema).parseSlice(dom, { preserveWhitespace: true });
};

// Excluding rawHtmlBlock or rawHtmlTextBlock alone leaves html_block content orphaned since they share a patched renderer.
const createEditor = (content) =>
  new Editor({
    extensions: createExtensions().filter((ext) => !['rawHtmlBlock', 'rawHtmlTextBlock'].includes(ext.name)),
    content
  });

const getMarkdown = (editor) => editor.storage.markdown.getMarkdown();

const getListItemParagraphCount = (editor) => {
  let count = 0;

  editor.state.doc.descendants((node) => {
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      node.forEach((child) => {
        if (child.type.name === 'paragraph') {
          count += 1;
        }
      });
    }
  });

  return count;
};

const getListItemCount = (editor, typeName = 'listItem') => {
  let count = 0;

  editor.state.doc.descendants((node) => {
    if (node.type.name === typeName) {
      count += 1;
    }
  });

  return count;
};

describe('Editor markdown serialization', () => {
  let editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('parses consecutive markdown list lines as separate items', () => {
    editor = createEditor('- one\n- two');

    expect(getListItemCount(editor)).toBe(2);
  });

  it('parses consecutive task list lines as separate items', () => {
    editor = createEditor('- [ ] todo one\n- [x] todo two');

    expect(getListItemCount(editor, 'taskItem')).toBe(2);
  });

  it('keeps separate bullet list items on roundtrip', () => {
    editor = createEditor('<ul><li><p>one</p></li><li><p>two</p></li></ul>');

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/- one/);
    expect(markdown).toMatch(/- two/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor)).toBe(2);
  });

  it('keeps multi-paragraph list items as a single markdown entry', () => {
    editor = createEditor('<ul><li><p>one</p><p>two</p></li></ul>');

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/- one\n  two/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor)).toBe(1);
    expect(getListItemParagraphCount(editor)).toBe(1); // TipTap parses soft breaks as hard breaks in a single paragraph
  });

  it('keeps multi-paragraph ordered list items as a single markdown entry', () => {
    editor = createEditor('<ol><li><p>first</p><p>second</p></li></ol>');

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/1\. first\n   second/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor)).toBe(1);
  });

  it('keeps multi-paragraph task items as a single markdown entry', () => {
    editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>todo one</p><p>todo two</p></li></ul>'
    );

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/- \[ \] todo one\n  todo two/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor, 'taskItem')).toBe(1);
  });

  it('serializes task lists using github-flavored checkbox syntax', () => {
    editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>todo</p></li><li data-type="taskItem" data-checked="true"><p>done</p></li></ul>'
    );

    expect(getMarkdown(editor)).toBe('- [ ] todo\n- [x] done');
  });

  it('preserves checkbox checked state on markdown roundtrip', () => {
    editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>todo</p></li><li data-type="taskItem" data-checked="true"><p>done</p></li></ul>'
    );

    const markdown = getMarkdown(editor);

    editor.commands.setContent(markdown);

    const taskItems = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') {
        taskItems.push({ checked: node.attrs.checked, text: node.textContent });
      }
    });

    expect(taskItems).toEqual([
      { checked: false, text: 'todo' },
      { checked: true, text: 'done' }
    ]);
  });

  it('loads checkbox markdown into an existing editor via setContent', () => {
    editor = createEditor('');
    editor.commands.setContent('- [ ] unchecked\n- [x] checked');

    const taskItems = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') {
        taskItems.push({ checked: node.attrs.checked, text: node.textContent });
      }
    });

    expect(taskItems).toEqual([
      { checked: false, text: 'unchecked' },
      { checked: true, text: 'checked' }
    ]);
  });

  it('does not parse checkbox markdown as plain bullet list text', () => {
    editor = createEditor('- [ ] unchecked\n- [x] checked');

    let plainBulletText = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'listItem' && node.textContent.includes('[ ]')) {
        plainBulletText = true;
      }
    });

    expect(plainBulletText).toBe(false);
  });

  it('parses checkbox markdown without a space after the marker', () => {
    editor = createEditor('- [ ]unchecked\n- [x]checked');

    const taskItems = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') {
        taskItems.push({ checked: node.attrs.checked, text: node.textContent });
      }
    });

    expect(taskItems).toEqual([
      { checked: false, text: 'unchecked' },
      { checked: true, text: 'checked' }
    ]);
  });

  it('parses asterisk checkbox markdown into task items', () => {
    editor = createEditor('* [ ] unchecked\n* [x] checked');

    expect(getListItemCount(editor, 'taskItem')).toBe(2);
  });

  it('parses uppercase checked checkbox markdown', () => {
    editor = createEditor('- [ ] open\n- [X] done');

    const taskItems = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') {
        taskItems.push({ checked: node.attrs.checked, text: node.textContent });
      }
    });

    expect(taskItems).toEqual([
      { checked: false, text: 'open' },
      { checked: true, text: 'done' }
    ]);
  });

  it('parses checkbox markdown repeatedly without breaking', () => {
    editor = createEditor('');

    editor.commands.setContent('- [ ] first');
    editor.commands.setContent('- [ ] second\n- [x] third');

    const taskItems = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') {
        taskItems.push({ checked: node.attrs.checked, text: node.textContent });
      }
    });

    expect(taskItems).toEqual([
      { checked: false, text: 'second' },
      { checked: true, text: 'third' }
    ]);
  });

  it('parses markdown checkbox syntax into task items with checked state', () => {
    editor = createEditor('- [ ] unchecked\n- [x] checked');

    const parsedHtml = editor.storage.markdown.parser.parse('- [ ] unchecked\n- [x] checked');

    expect(parsedHtml).toContain('data-type="taskList"');
    expect(parsedHtml).toContain('data-type="taskItem"');
    expect(parsedHtml).toContain('data-checked="true"');

    const taskItems = [];
    let taskListCount = 0;
    let bulletListCount = 0;

    editor.state.doc.descendants((node) => {
      if (node.type.name === 'taskList') {
        taskListCount += 1;
      }
      if (node.type.name === 'bulletList') {
        bulletListCount += 1;
      }
      if (node.type.name === 'taskItem') {
        taskItems.push({ checked: node.attrs.checked, text: node.textContent });
      }
    });

    expect(taskListCount).toBe(1);
    expect(bulletListCount).toBe(0);
    expect(taskItems).toEqual([
      { checked: false, text: 'unchecked' },
      { checked: true, text: 'checked' }
    ]);
  });

  it('keeps hard breaks within a single list item paragraph', () => {
    editor = createEditor('<ul><li><p>line one<br>line two</p></li></ul>');

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/line one/);
    expect(markdown).toMatch(/line two/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor)).toBe(1);
    expect(getListItemParagraphCount(editor)).toBe(1);

    let hardBreakCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'hardBreak') {
        hardBreakCount += 1;
      }
    });

    expect(hardBreakCount).toBe(1);
  });

  it('supports <br> and <br/> tags in markdown parsing', () => {
    editor = createEditor('');

    // Test parsing <br/> from markdown
    editor.commands.setContent('line one<br/>line two<br>line three');

    let hardBreakCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'hardBreak') {
        hardBreakCount += 1;
      }
    });

    expect(hardBreakCount).toBe(2);

    // When serialized back, it converts hard breaks to markdown breaks (e.g. double space or \)
    const markdown = getMarkdown(editor);
    expect(markdown).toMatch(/line one/);
    expect(markdown).toMatch(/line two/);
  });

  it('reflows a hand-wrapped single-newline paragraph onto one line instead of treating it as a hard break', () => {
    editor = createEditor('Line one\nLine two');

    let hardBreakCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'hardBreak') {
        hardBreakCount += 1;
      }
    });

    expect(hardBreakCount).toBe(0);
    expect(getMarkdown(editor)).toBe('Line one Line two');
  });

  it('serializes code blocks with language', () => {
    editor = createEditor('<pre><code class="language-javascript">const x = 1;</code></pre>');
    const markdown = getMarkdown(editor);
    expect(markdown).toContain('```javascript');
    expect(markdown).toContain('const x = 1;');
  });

  it('parses literal inline HTML formatting tags into their marks, not raw HTML', () => {
    editor = createEditor('');
    editor.commands.setContent('Some <b>bold</b>, <em>italic</em>, <s>struck</s> and <code>code</code> text.');

    expect(editor.getHTML()).not.toContain('data-raw-html-inline');

    let boldCount = 0;
    let italicCount = 0;
    let strikeCount = 0;
    let codeCount = 0;
    editor.state.doc.descendants((node) => {
      const markNames = node.marks?.map((mark) => mark.type.name) || [];
      if (markNames.includes('bold')) boldCount += 1;
      if (markNames.includes('italic')) italicCount += 1;
      if (markNames.includes('strike')) strikeCount += 1;
      if (markNames.includes('code')) codeCount += 1;
    });

    expect(boldCount).toBe(1);
    expect(italicCount).toBe(1);
    expect(strikeCount).toBe(1);
    expect(codeCount).toBe(1);
  });

  it('preserves a non-checkbox input as opaque raw HTML instead of a task-list checkbox', () => {
    editor = createEditor('');
    editor.commands.setContent('Enter your name: <input type="text" placeholder="Name">');

    let rawHtmlInlineCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'rawHtmlInline') {
        rawHtmlInlineCount += 1;
        expect(node.attrs.html).toContain('type="text"');
      }
    });

    expect(rawHtmlInlineCount).toBe(1);

    const markdown = getMarkdown(editor);
    expect(markdown).toContain('<input type="text" placeholder="Name">');
  });

  it('recognizes a single-quoted checkbox input as inline HTML too, not just the double-quoted form', () => {
    editor = createEditor('');
    editor.commands.setContent('<ul data-type="taskList"><li class="task-list-item"><input type=\'checkbox\'> open</li></ul>');

    let rawHtmlInlineCount = 0;
    let taskItemCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'rawHtmlInline') {
        rawHtmlInlineCount += 1;
      }
      if (node.type.name === 'taskItem') {
        taskItemCount += 1;
      }
    });

    expect(rawHtmlInlineCount).toBe(0);
    expect(taskItemCount).toBe(1);
    expect(getMarkdown(editor)).toMatch(/- \[ \] open/);
  });

  describe('raw HTML text blocks', () => {
    // These exercise rawHtmlTextBlock directly, requiring it in the schema unlike createEditor() which excludes it for its fixtures.
    const createFullEditor = (content) => new Editor({ extensions: createExtensions(), content });

    it('makes a plain-text <div>/<p> an editable node instead of an opaque atom, preserving its attributes', () => {
      editor = createFullEditor('Before.\n\n<div class="note">Some plain text</div>\n\nAfter.');

      let textBlockNode = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockNode = node;
        }
      });

      expect(textBlockNode).not.toBeNull();
      expect(editor.schema.nodes.rawHtmlTextBlock.isAtom).toBe(false);
      expect(textBlockNode.attrs.tag).toBe('div');
      expect(textBlockNode.attrs.htmlAttrs).toEqual({ class: 'note' });
      expect(textBlockNode.textContent).toBe('Some plain text');

      expect(getMarkdown(editor)).toBe('Before.\n\n<div class="note">Some plain text</div>\n\nAfter.');
    });

    it('preserves a legacy block\'s exact original bytes on round-trip when it is never edited', () => {
      const legacySource = 'Before.\n\n<DIV CLASS=\'note\'>Some &amp; plain text</DIV>\n\nAfter.';
      editor = createFullEditor(legacySource);

      expect(getMarkdown(editor)).toBe(legacySource);
    });

    it('reconstructs a legacy block\'s markup only once its content is actually edited', () => {
      editor = createFullEditor('<DIV CLASS=\'note\'>Some plain text</DIV>');

      let textBlockPos = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockPos = pos;
        }
      });

      editor.commands.insertContentAt(textBlockPos + 1 + 'Some plain text'.length, ' EDITED');

      expect(getMarkdown(editor)).toBe('<div class="note">Some plain text EDITED</div>');
    });

    it('strips dangerous attributes from a text block before they reach the DOM', () => {
      editor = createFullEditor('<div onclick="alert(1)" class="note">text</div>');

      let textBlockNode = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockNode = node;
        }
      });

      expect(textBlockNode).not.toBeNull();
      expect(textBlockNode.attrs.htmlAttrs).not.toHaveProperty('onclick');
      expect(textBlockNode.attrs.htmlAttrs).toEqual({ class: 'note' });
    });

    it('strips a dangerous attribute from HTML parsed directly by the schema, as ProseMirror does for clipboard paste', () => {
      editor = createFullEditor('');

      const slice = parsePastedHtml(
        editor,
        '<div data-raw-html-text-block="div" onerror="alert(1)" class="note">payload</div>'
      );

      let textBlockNode = null;
      slice.content.descendants((node) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockNode = node;
        }
      });

      expect(textBlockNode).not.toBeNull();
      expect(textBlockNode.attrs.htmlAttrs).not.toHaveProperty('onerror');
      expect(textBlockNode.attrs.htmlAttrs).toEqual({ class: 'note' });
    });

    it('refuses to substitute a dangerous tag via the marker attribute on pasted HTML', () => {
      editor = createFullEditor('');

      const slice = parsePastedHtml(editor, '<div data-raw-html-text-block="script">alert(1)</div>');

      let scriptTextBlockNode = null;
      slice.content.descendants((node) => {
        if (node.type.name === 'rawHtmlTextBlock' && node.attrs.tag === 'script') {
          scriptTextBlockNode = node;
        }
      });

      expect(scriptTextBlockNode).toBeNull();
    });

    it('does not trust an original-bytes payload whose attributes don\'t match the sanitized element', () => {
      editor = createFullEditor('');

      const forgedOriginal = Buffer.from('<div class="different">payload</div>', 'utf-8').toString('base64');
      const slice = parsePastedHtml(
        editor,
        `<div data-raw-html-text-block="div" data-raw-html-original="${forgedOriginal}" class="note">payload</div>`
      );

      let textBlockNode = null;
      slice.content.descendants((node) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockNode = node;
        }
      });

      expect(textBlockNode).not.toBeNull();
      expect(textBlockNode.attrs.originalHtml).toBeNull();
    });

    it('never serializes smuggled original-bytes content that differs from the actual pasted text', () => {
      editor = createFullEditor('');

      const forgedOriginal = Buffer.from('<div class="note">forged</div>', 'utf-8').toString('base64');
      const slice = parsePastedHtml(
        editor,
        `<div data-raw-html-text-block="div" data-raw-html-original="${forgedOriginal}" class="note">payload</div>`
      );

      const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, slice.content);
      editor.view.dispatch(tr);

      const markdown = getMarkdown(editor);
      expect(markdown).toContain('payload');
      expect(markdown).not.toContain('forged');
    });

    it('falls back to the opaque raw-HTML atom when a block tag has nested elements', () => {
      editor = createFullEditor('<div>Has <b>nested</b> markup</div>');

      let rawHtmlBlockCount = 0;
      let rawHtmlTextBlockCount = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'rawHtmlBlock') rawHtmlBlockCount += 1;
        if (node.type.name === 'rawHtmlTextBlock') rawHtmlTextBlockCount += 1;
      });

      expect(rawHtmlBlockCount).toBe(1);
      expect(rawHtmlTextBlockCount).toBe(0);
      expect(getMarkdown(editor)).toBe('<div>Has <b>nested</b> markup</div>');
    });

    it('falls back to the opaque raw-HTML atom instead of silently dropping stray text beside the tag', () => {
      editor = createFullEditor('<div class="note">Some plain text</div> stray');

      let rawHtmlBlockCount = 0;
      let rawHtmlTextBlockCount = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'rawHtmlBlock') rawHtmlBlockCount += 1;
        if (node.type.name === 'rawHtmlTextBlock') rawHtmlTextBlockCount += 1;
      });

      expect(rawHtmlBlockCount).toBe(1);
      expect(rawHtmlTextBlockCount).toBe(0);
      expect(getMarkdown(editor)).toContain('<div class="note">Some plain text</div> stray');
    });

    it('edits a text block in place and round-trips the change', () => {
      editor = createFullEditor('<div class="note">Some plain text</div>');

      let textBlockPos = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockPos = pos;
        }
      });

      editor.commands.insertContentAt(textBlockPos + 1 + 'Some plain text'.length, ' EDITED');

      expect(getMarkdown(editor)).toBe('<div class="note">Some plain text EDITED</div>');
    });

    it('preserves a <br> line break inside a text block on parse, edit, and round-trip', () => {
      editor = createFullEditor('<div class="note">Line one<br>Line two</div>');

      let textBlockNode = null;
      let textBlockPos = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'rawHtmlTextBlock') {
          textBlockNode = node;
          textBlockPos = pos;
        }
      });

      expect(textBlockNode).not.toBeNull();
      const childTypes = [];
      textBlockNode.forEach((child) => childTypes.push(child.type.name));
      expect(childTypes).toEqual(['text', 'hardBreak', 'text']);
      expect(getMarkdown(editor)).toBe('<div class="note">Line one<br>Line two</div>');

      // setHardBreak explicitly catches isolating node issues since it refuses to insert there, unlike raw insertContentAt.
      const insertAt = textBlockPos + 1 + 'Line one'.length;
      editor.commands.setTextSelection(insertAt);
      expect(editor.can().setHardBreak()).toBe(true);

      const inserted = editor.commands.setHardBreak();

      expect(inserted).toBe(true);
      expect(getMarkdown(editor)).toBe('<div class="note">Line one<br><br>Line two</div>');
    });
  });
});
