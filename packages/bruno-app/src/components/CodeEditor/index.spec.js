import React from 'react';
import { render, act } from '@testing-library/react';
import CodeEditor from './index';
import { ThemeProvider } from 'styled-components';

jest.mock('codemirror', () => {
  const codemirror = require('test-utils/mocks/codemirror');
  return codemirror;
});

const MOCK_THEME = {
  codemirror: {
    bg: "#1e1e1e",
    border: "#333",
  },
  textLink: "#007acc",
};

const setupEditorState = (editor, { value, cursorPosition }) => {
  editor._currentValue = value;
  editor.getCursor.mockReturnValue({ line: 0, ch: cursorPosition });
  editor.getRange.mockImplementation((from, to) => {
    if (from.line === 0 && from.ch === 0 && to.line === 0 && to.ch === cursorPosition) {
      return value;
    }
    return editor._currentValue.slice(from.ch, to.ch);
  });

  editor.state = {
    completionActive: null,
  }
};

const setupEditorWithRef = () => {
  const ref = React.createRef();
  const { rerender } = render(
    <ThemeProvider theme={MOCK_THEME}>
      <CodeEditor ref={ref} />
    </ThemeProvider>
  );
  return { ref, rerender };
};

describe('CodeEditor Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('shows autocomplete suggestions when typing {{$ra', () => {
    // Setup
    const { ref } = setupEditorWithRef();
    const editorInstance = ref.current;
    expect(editorInstance).toBeTruthy();

    const editor = editorInstance.editor;
    expect(editor).toBeTruthy();

    // Configure editor state
    setupEditorState(editor, {
      value: '{{$r',
      cursorPosition: 4
    });

    // Trigger autocomplete
    const keyupHandler = editor.keyupHandler;
    expect(typeof keyupHandler).toBe('function');

    act(() => {
      keyupHandler(editor, { text: ['a'], origin: '+input' });
    });

    // Assertions
    expect(editor.showHint).toHaveBeenCalled();
    const call = editor.showHint.mock.calls[0][0];
    expect(typeof call.hint).toBe('function');
    
    const hints = call.hint();
    expect(Array.isArray(hints.list)).toBe(true);
    expect(hints.list.some((s) => s.startsWith('$'))).toBe(true);
    expect(hints.list.every((match) => match.startsWith('$ra'))).toBe(true);
  });

  it('does not show hints for regular text input', () => {
    // Setup
    const { ref } = setupEditorWithRef();
    const editor = ref.current.editor;
    
    // Configure editor state
    setupEditorState(editor, {
      value: 'regular text',
      cursorPosition: 11
    });

    // Trigger input
    const keyupHandler = editor.keyupHandler;
    
    act(() => {
      keyupHandler(editor, { text: ['x'], origin: '+input' });
    });

    // Assert no hints shown for regular text
    expect(editor.showHint).not.toHaveBeenCalled();
  });
});