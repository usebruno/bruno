import { Editor } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Strike from '@tiptap/extension-strike';
import { DocsTaskList, DocsTaskItem } from './DocsTaskList';

describe('DocsTaskItem NodeView edge cases', () => {
  let editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Strike, Link, DocsTaskList, DocsTaskItem],
      content: `
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false"><p>Hello World</p></li>
          <li data-type="taskItem" data-checked="false"><p>Link <a href="#">test</a></p></li>
        </ul>
      `
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  it('should toggle strikethrough when checkbox is checked/unchecked', () => {
    const dom = editor.view.dom;
    const taskItems = dom.querySelectorAll('li');
    const firstTask = taskItems[0];
    const checkbox = firstTask.querySelector('input[type="checkbox"]');

    // Simulate checking the box
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    // Check that strike mark was applied to the paragraph text inside
    const html = editor.getHTML();
    expect(html).toContain('<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p><s>Hello World</s></p></div></li>');

    // Simulate unchecking the box
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    // Check that strike mark was removed
    const html2 = editor.getHTML();
    expect(html2).toContain('<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Hello World</p></div></li>');
  });

  it('should NOT toggle checkbox when content text is clicked in EDIT mode (isEditable: true)', () => {
    // In edit mode
    editor.setEditable(true);

    const dom = editor.view.dom;
    const firstTask = dom.querySelectorAll('li')[0];
    const contentDiv = firstTask.querySelector('div');
    const checkbox = firstTask.querySelector('input[type="checkbox"]');

    // Click on the text
    contentDiv.dispatchEvent(new Event('click'));

    // Should still be unchecked
    expect(checkbox.checked).toBe(false);
    expect(editor.getHTML()).toContain('<li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Hello World</p></div></li>');
  });

  it('should toggle checkbox and strikethrough when content text is clicked in PREVIEW mode (isEditable: false)', () => {
    // In read-only mode (Preview mode)
    editor.setEditable(false);

    const dom = editor.view.dom;
    const firstTask = dom.querySelectorAll('li')[0];
    const contentDiv = firstTask.querySelector('div');
    const checkbox = firstTask.querySelector('input[type="checkbox"]');

    // Click on the text
    const event = new Event('click');
    contentDiv.dispatchEvent(event);

    // Should now be checked and struck through
    expect(checkbox.checked).toBe(true);
    expect(editor.getHTML()).toContain('<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p><s>Hello World</s></p></div></li>');
  });

  it('should NOT toggle checkbox when a link inside content text is clicked in PREVIEW mode', () => {
    editor.setEditable(false);

    const dom = editor.view.dom;
    const secondTask = dom.querySelectorAll('li')[1];
    const anchor = secondTask.querySelector('a');
    const checkbox = secondTask.querySelector('input[type="checkbox"]');

    // Click on the anchor tag
    const event = new Event('click', { bubbles: true });
    anchor.dispatchEvent(event);

    // Should remain unchecked
    expect(checkbox.checked).toBe(false);
  });
});
