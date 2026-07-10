import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import extensions from './extensions';
import DocsToolbar from './DocsToolbar';

const mockTheme = themes.light;

const createEditor = () => {
  return new Editor({
    extensions,
    content: '<p>Hello world</p>'
  });
};

// Mock ResizeObserver for DocsToolbar
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('DocsToolbar', () => {
  let editor;
  let offsetWidthSpy;

  beforeAll(() => {
    offsetWidthSpy = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () {
      if (this.className.includes('docs-toolbar')) return 2000;
      return 20;
    });
  });

  afterAll(() => {
    offsetWidthSpy.mockRestore();
  });

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it('renders all toolbar buttons', () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Strikethrough')).toBeInTheDocument();
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
    expect(screen.getByLabelText('Numbered list')).toBeInTheDocument();
    expect(screen.getByLabelText('Task list')).toBeInTheDocument();
    expect(screen.getByLabelText('Table')).toBeInTheDocument();
    expect(screen.getByLabelText('Inline code')).toBeInTheDocument();
    expect(screen.getByLabelText('Code block')).toBeInTheDocument();
    expect(screen.getByLabelText('Quote')).toBeInTheDocument();
    expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    expect(screen.getByLabelText('Redo')).toBeInTheDocument();

    // Normal text should be selected by default in heading dropdown
    expect(screen.getAllByText('Normal')[0]).toBeInTheDocument();
  });

  it('toggles bold format when clicking Bold button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const boldButton = screen.getByLabelText('Bold');

    // Select all text
    editor.commands.selectAll();

    fireEvent.click(boldButton);
    expect(editor.isActive('bold')).toBe(true);

    fireEvent.click(boldButton);
    expect(editor.isActive('bold')).toBe(false);
  });

  it('toggles italic format when clicking Italic button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const italicButton = screen.getByLabelText('Italic');

    editor.commands.selectAll();
    fireEvent.click(italicButton);
    expect(editor.isActive('italic')).toBe(true);

    fireEvent.click(italicButton);
    expect(editor.isActive('italic')).toBe(false);
  });

  it('toggles strikethrough format when clicking Strikethrough button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const strikeButton = screen.getByLabelText('Strikethrough');

    editor.commands.selectAll();
    fireEvent.click(strikeButton);
    expect(editor.isActive('strike')).toBe(true);
  });

  it('toggles bullet list format when clicking Bullet list button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const bulletListBtn = screen.getByLabelText('Bullet list');

    fireEvent.click(bulletListBtn);
    expect(editor.isActive('bulletList')).toBe(true);

    fireEvent.click(bulletListBtn);
    expect(editor.isActive('bulletList')).toBe(false);
  });

  it('toggles ordered list format when clicking Numbered list button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const orderedListBtn = screen.getByLabelText('Numbered list');

    fireEvent.click(orderedListBtn);
    expect(editor.isActive('orderedList')).toBe(true);
  });

  it('toggles task list format when clicking Task list button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const taskListBtn = screen.getByLabelText('Task list');

    fireEvent.click(taskListBtn);
    expect(editor.isActive('taskList')).toBe(true);
  });

  it('toggles code block when clicking Code block button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const codeBlockBtn = screen.getByLabelText('Code block');

    fireEvent.click(codeBlockBtn);
    expect(editor.isActive('codeBlock')).toBe(true);
  });

  it('toggles quote when clicking Quote button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const quoteBtn = screen.getByLabelText('Quote');

    fireEvent.click(quoteBtn);
    expect(editor.isActive('blockquote')).toBe(true);
  });

  it('inserts a table when clicking Table button', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const tableBtn = screen.getByLabelText('Table');

    fireEvent.click(tableBtn);
    expect(editor.isActive('table')).toBe(true);
  });

  it('calls undo/redo', () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <DocsToolbar editor={editor} />
      </ThemeProvider>
    );
    const undoBtn = screen.getByLabelText('Undo');
    const redoBtn = screen.getByLabelText('Redo');

    // Type to create a history event
    editor.commands.insertContent('foo bar');

    // Test that they click successfully without throwing
    fireEvent.click(undoBtn);
    fireEvent.click(redoBtn);
  });
});
