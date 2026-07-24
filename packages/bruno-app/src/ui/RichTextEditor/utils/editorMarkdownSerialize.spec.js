import { Editor } from '@tiptap/core';
import extensions from '../extensions';

const createEditor = (content) =>
  new Editor({
    extensions,
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

  it('splits a multi-paragraph list item into separate markdown entries', () => {
    editor = createEditor('<ul><li><p>one</p><p>two</p></li></ul>');

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/- one/);
    expect(markdown).toMatch(/- two/);
    expect(markdown).not.toMatch(/\n\n {2}two/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor)).toBe(2);
    expect(getListItemParagraphCount(editor)).toBe(2);
  });

  it('splits a multi-paragraph ordered list item into separate markdown entries', () => {
    editor = createEditor('<ol><li><p>first</p><p>second</p></li></ol>');

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/first/);
    expect(markdown).toMatch(/second/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor)).toBe(2);
  });

  it('splits a multi-paragraph task item into separate markdown entries', () => {
    editor = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>todo one</p><p>todo two</p></li></ul>'
    );

    const markdown = getMarkdown(editor);

    expect(markdown).toMatch(/todo one/);
    expect(markdown).toMatch(/todo two/);

    editor.commands.setContent(markdown);

    expect(getListItemCount(editor, 'taskItem')).toBe(2);
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

  it('serializes code blocks with language', () => {
    editor = createEditor('<pre><code class="language-javascript">const x = 1;</code></pre>');
    const markdown = getMarkdown(editor);
    expect(markdown).toContain('```javascript');
    expect(markdown).toContain('const x = 1;');
  });
});
