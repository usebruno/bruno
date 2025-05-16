import React from 'react';
import { render, act } from '@testing-library/react';
import CodeEditor from '../../CodeEditor';
import CodeMirror from 'codemirror';
import { ThemeProvider } from 'styled-components';

jest.mock('codemirror');

const mockTheme = {
  codemirror: {
    bg: "#1e1e1e",
    border: "#333",
  },
  textLink: "#007acc",
};

describe('CodeEditor Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows hint suggestions when typing {{$f', () => {
    const ref = React.createRef();
    render(
      <ThemeProvider theme={mockTheme}>
        <CodeEditor ref={ref} />
      </ThemeProvider>
    );

    const editorInstance = ref.current;
    expect(editorInstance).toBeTruthy();

    const editor = editorInstance.editor;
    expect(editor).toBeTruthy();

    // Set up the mock editor state for getHints to succeed
    editor._currentValue = '{{$r';
    // Place cursor after '{{$r' (ch: 4)
    editor.getCursor.mockReturnValue({ line: 0, ch: 4 });
    editor.getRange.mockImplementation((from, to) => {
      // Simulate the CodeMirror getRange for this scenario
      if (from.line === 0 && from.ch === 0 && to.line === 0 && to.ch === 4) {
        return '{{$r';
      }
      return editor._currentValue.slice(from.ch, to.ch);
    });

    // Now retrieve the handler and fire it
    const inputReadHandler = editor.inputReadHandler;
    expect(typeof inputReadHandler).toBe('function');

    act(() => {
      inputReadHandler(editor, { text: ['a'], origin: '+input' });
    });

    // Now showHint should have been called
    expect(editor.showHint).toHaveBeenCalled();

    const call = editor.showHint.mock.calls[0][0];
    expect(typeof call.hint).toBe('function');
    const hints = call.hint();
    expect(Array.isArray(hints.list)).toBe(true);
    expect(hints.list.some((s) => s.startsWith('$'))).toBe(true);
  });
});